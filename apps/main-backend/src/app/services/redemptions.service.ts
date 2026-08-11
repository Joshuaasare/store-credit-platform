import { supabaseAdmin } from "../utils/supabase.client";
import { QueryFragments } from "../constants/queryFragments";
import { AccessTokenPayload } from "../schemas/auth.schema";
import {
  RedemptionRow,
  RedemptionsFilters,
  RedemptionsPage,
  RedemptionStatus,
} from "../schemas/redemptions.schema";

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

/**
 * Redemption service — merchant-side approval queue for customer-initiated
 * credit redemptions.
 *
 * The three redemption states are derived from `approved_at` / `rejected_at`
 * (no status enum):
 *   Pending  → approved_at IS NULL AND rejected_at IS NULL
 *   Approved → approved_at IS NOT NULL
 *   Rejected → rejected_at IS NOT NULL (implies approved_at IS NULL)
 *
 * `approved_at` and `rejected_at` are mutually exclusive — enforced here in
 * the service layer (approve rejects if `rejected_at` already set; reject
 * rejects if `approved_at` already set).
 *
 * Cashiers and managers do NOT create redemption rows here. Only the customer
 * (via a future customer app) initiates a redemption; this service is the
 * merchant-side review/approve surface.
 */
export class RedemptionService {
  private static readonly DEFAULT_LIMIT = 20;

  /**
   * Merchant-scoped, paginated, status-filtered redemption list. Filters on
   * the redemption's denormalized `branch_id` directly (no credit_id hop).
   * Attaches a per-row `remaining` (credit.credit_amount − SUM(approved,
   * non-deleted redemptions on that credit)) computed in one batched follow-up
   * query scoped to the page's credit_ids.
   */
  async listRedemptions(
    merchantId: number,
    filters: RedemptionsFilters,
  ): Promise<RedemptionsPage> {
    const limit = filters.limit ?? RedemptionService.DEFAULT_LIMIT;
    const offset = filters.offset ?? 0;
    const status: RedemptionStatus = filters.status;

    // 1. Resolve merchant branch IDs.
    const { data: branchRows, error: branchError } = await supabaseAdmin
      .from("branches")
      .select("id")
      .eq("merchant_id", merchantId)
      .is("deleted_at", null);
    if (branchError) {
      throw new Error(`Failed to resolve branches: ${branchError.message}`);
    }
    const branchIds = (branchRows ?? []).map((b) => b.id);
    if (branchIds.length === 0) {
      return { rows: [], total: 0, offset, limit };
    }

    // Intersect with the optional branch_id filter.
    const filteredBranchIds =
      filters.branch_id != null && branchIds.includes(filters.branch_id)
        ? [filters.branch_id]
        : branchIds;

    // 2. Build the list query with nested joins (composed from QueryFragments).
    let query = supabaseAdmin
      .from("customer_credit_redemptions")
      .select(
        `${QueryFragments.BASE_CUSTOMER_CREDIT_REDEMPTION},
         customer:customers(${QueryFragments.BASE_CUSTOMER}, users(${QueryFragments.BASE_USER_PROFILE})),
         branch:branches(${QueryFragments.BASE_BRANCH}),
         credit:customer_credit(${QueryFragments.BASE_CUSTOMER_CREDIT})`,
        { count: "exact" },
      )
      .in("branch_id", filteredBranchIds)
      .is("deleted_at", null);

    // 3. Status filter (derived from approved_at / rejected_at).
    if (status === "pending") {
      query = query.is("approved_at", null).is("rejected_at", null);
    } else if (status === "approved") {
      query = query.not("approved_at", "is", null);
    } else {
      query = query.not("rejected_at", "is", null);
    }

    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      throw new Error(`Failed to load redemptions: ${error.message}`);
    }

    const rows = (data ?? []) as unknown as RedemptionRow[];
    const total = count ?? rows.length;

    // 4. Batch per-row remaining: one query scoped to the page's credit_ids.
    const remainingByCreditId = await this.computeRemainingByCreditId(
      rows.map((r) => r.credit_id),
    );
    for (const row of rows) {
      const creditAmount = Number(row.credit?.credit_amount ?? 0);
      const redeemedTotal = remainingByCreditId.get(row.credit_id) ?? 0;
      row.remaining = Math.max(0, creditAmount - redeemedTotal);
    }

    return { rows, total, offset, limit };
  }

  /**
   * Approve a pending redemption. Manager-only (enforced at the route via
   * `requireRoles("manager")`). Sets `approved_at = now()` and
   * `approved_by_staff_id = caller.staff_id`. 409 if the row is already in a
   * terminal state. 400 if `amount_redeemed` exceeds the credit's current
   * remaining (credit_amount − SUM(approved, non-deleted redemptions on this
   * credit, EXCLUDING this row).
   *
   * Returns the updated row in the same nested shape as the list endpoint.
   */
  async approveRedemption(
    user: AccessTokenPayload,
    redemptionId: number,
    merchantId: number,
  ): Promise<RedemptionRow> {
    const loaded = await this.loadRedemptionForScopeCheck(
      redemptionId,
      merchantId,
    );
    if (!loaded.row) {
      throw new Error("Redemption not found");
    }
    if (loaded.row.approved_at != null) {
      throw new Error("Redemption already approved");
    }
    if (loaded.row.rejected_at != null) {
      throw new Error("Redemption already rejected");
    }

    // Amount guard: current_remaining = credit_amount − SUM(approved, non-
    // deleted redemptions on this credit, EXCLUDING this row). The row's own
    // amount is not yet in the sum (it is still pending).
    const creditAmount = Number(loaded.credit?.credit_amount ?? 0);
    const approvedSumExcludingThis = await this.sumApprovedRedemptions(
      loaded.row.credit_id,
      redemptionId,
    );
    const currentRemaining = Math.max(0, creditAmount - approvedSumExcludingThis);
    const amount = Number(loaded.row.amount_redeemed);
    if (amount > currentRemaining) {
      throw new Error(
        `Request exceeds remaining credit (remaining: ${currentRemaining})`,
      );
    }

    const nowIso = new Date().toISOString();
    const { error: updateErr } = await supabaseAdmin
      .from("customer_credit_redemptions")
      .update({
        approved_at: nowIso,
        approved_by_staff_id: user.staff_id ?? null,
      })
      .eq("id", redemptionId)
      .is("deleted_at", null)
      .is("approved_at", null)
      .is("rejected_at", null);
    if (updateErr) {
      throw new Error(`Failed to approve redemption: ${updateErr.message}`);
    }

    return this.loadRedemptionForResponse(redemptionId);
  }

  /**
   * Reject a pending redemption. Manager-only (enforced at the route via
   * `requireRoles("manager")`). Sets `rejected_at = now()`. No
   * `rejected_by_staff_id` column (decision 7). 409 if the row is already in
   * a terminal state. Returns the updated row.
   */
  async rejectRedemption(
    redemptionId: number,
    merchantId: number,
  ): Promise<RedemptionRow> {
    const loaded = await this.loadRedemptionForScopeCheck(
      redemptionId,
      merchantId,
    );
    if (!loaded.row) {
      throw new Error("Redemption not found");
    }
    if (loaded.row.approved_at != null) {
      throw new Error("Redemption already approved");
    }
    if (loaded.row.rejected_at != null) {
      throw new Error("Redemption already rejected");
    }

    const nowIso = new Date().toISOString();
    const { error: updateErr } = await supabaseAdmin
      .from("customer_credit_redemptions")
      .update({ rejected_at: nowIso })
      .eq("id", redemptionId)
      .is("deleted_at", null)
      .is("approved_at", null)
      .is("rejected_at", null);
    if (updateErr) {
      throw new Error(`Failed to reject redemption: ${updateErr.message}`);
    }

    return this.loadRedemptionForResponse(redemptionId);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Batched SUM(amount_redeemed) per credit_id over approved, non-deleted
   * redemptions. Returns a Map<credit_id, redeemedTotal>. Used by the list
   * endpoint to attach a per-row `remaining` without N+1 queries.
   */
  private async computeRemainingByCreditId(
    creditIds: number[],
  ): Promise<Map<number, number>> {
    const out = new Map<number, number>();
    if (creditIds.length === 0) return out;
    const { data, error } = await supabaseAdmin
      .from("customer_credit_redemptions")
      .select("credit_id, amount_redeemed")
      .in("credit_id", creditIds)
      .not("approved_at", "is", null)
      .is("deleted_at", null);
    if (error) {
      throw new Error(
        `Failed to load redemption totals: ${error.message}`,
      );
    }
    for (const r of (data ?? []) as Array<{
      credit_id: number;
      amount_redeemed: number;
    }>) {
      out.set(
        r.credit_id,
        (out.get(r.credit_id) ?? 0) + Number(r.amount_redeemed),
      );
    }
    return out;
  }

  /**
   * SUM(amount_redeemed) over approved, non-deleted redemptions on a single
   * credit, optionally excluding one redemption row. Used by the approve
   * amount guard.
   */
  private async sumApprovedRedemptions(
    creditId: number,
    excludeRedemptionId: number,
  ): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from("customer_credit_redemptions")
      .select("amount_redeemed")
      .eq("credit_id", creditId)
      .neq("id", excludeRedemptionId)
      .not("approved_at", "is", null)
      .is("deleted_at", null);
    if (error) {
      throw new Error(
        `Failed to load approved redemptions: ${error.message}`,
      );
    }
    return (data ?? []).reduce(
      (s, r) => s + Number((r as { amount_redeemed: number }).amount_redeemed),
      0,
    );
  }

  /**
   * Load a redemption row joined to its credit's branch for merchant scoping.
   * Returns `{ row, credit }` where `row` carries the base redemption columns
   * and `credit` carries the credit's branch (with merchant_id). Used by
   * approve/reject to verify the caller's merchant owns the redemption.
   */
  private async loadRedemptionForScopeCheck(
    redemptionId: number,
    merchantId: number,
  ): Promise<{
    row: {
      id: number;
      credit_id: number;
      amount_redeemed: number;
      approved_at: string | null;
      rejected_at: string | null;
      deleted_at: string | null;
    } | null;
    credit: { credit_amount: number } | null;
  }> {
    const { data, error } = await supabaseAdmin
      .from("customer_credit_redemptions")
      .select(
        `id, credit_id, amount_redeemed, approved_at, rejected_at, deleted_at,
         credit:customer_credit(credit_amount, branch:branches(merchant_id))`,
      )
      .eq("id", redemptionId)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to load redemption: ${error.message}`);
    }
    if (!data || data.deleted_at) {
      return { row: null, credit: null };
    }
    const creditJoin = (data as unknown as {
      credit: {
        credit_amount: number;
        branch: { merchant_id: number } | null;
      } | null;
    }).credit;
    const branchMerchantId = creditJoin?.branch?.merchant_id ?? null;
    if (branchMerchantId !== merchantId) {
      return { row: null, credit: null };
    }
    return {
      row: {
        id: data.id,
        credit_id: data.credit_id,
        amount_redeemed: Number(data.amount_redeemed),
        approved_at: data.approved_at,
        rejected_at: data.rejected_at,
        deleted_at: data.deleted_at,
      },
      credit: creditJoin
        ? { credit_amount: Number(creditJoin.credit_amount) }
        : null,
    };
  }

  /**
   * Load a redemption row with the full nested join shape (customer/branch/
   * credit) + per-row `remaining`. Used by approve/reject to return the
   * updated row.
   */
  private async loadRedemptionForResponse(
    redemptionId: number,
  ): Promise<RedemptionRow> {
    const { data, error } = await supabaseAdmin
      .from("customer_credit_redemptions")
      .select(
        `${QueryFragments.BASE_CUSTOMER_CREDIT_REDEMPTION},
         customer:customers(${QueryFragments.BASE_CUSTOMER}, users(${QueryFragments.BASE_USER_PROFILE})),
         branch:branches(${QueryFragments.BASE_BRANCH}),
         credit:customer_credit(${QueryFragments.BASE_CUSTOMER_CREDIT})`,
      )
      .eq("id", redemptionId)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to load redemption: ${error.message}`);
    }
    if (!data) {
      throw new Error("Redemption not found");
    }
    const row = data as unknown as RedemptionRow;
    const creditAmount = Number(row.credit?.credit_amount ?? 0);
    const redeemedTotal = await this.sumApprovedRedemptions(
      row.credit_id,
      -1, // include all approved redemptions (no row excluded)
    );
    row.remaining = Math.max(0, creditAmount - redeemedTotal);
    return row;
  }
}

export const redemptionService = new RedemptionService();