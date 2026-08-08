import { FastifyBaseLogger } from "fastify";
import { supabaseAdmin } from "../utils/supabase.client";
import { QueryFragments } from "../constants/queryFragments";
import { AccessTokenPayload } from "../schemas/auth.schema";
import {
  TransactionsFilters,
  TransactionsPage,
  CreatePurchaseRequest,
  CustomerTransactions,
  TransactionTypeFilter,
} from "../schemas/transactions.schema";
import { issueRunningCreditsForPurchase } from "./creditConfig.service";
import { normalizePhone } from "../utils/phone.utils";

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

/**
 * Transaction service — merchant-scoped activity feed (union of
 * customer_purchases + customer_credit + customer_credit_redemptions) and
 * purchase recording (auto-creates customer by phone, auto-issues matching
 * running credit configs).
 *
 * The activity feed synthesizes a single `CustomerTransactions`-shaped row
 * from the union so the frontend doesn't have to change its row type. The
 * `type` filter (`all` | `purchase` | `credit_issue` | `credit_redeem`) is
 * applied after the union so the total + pagination reflect only the
 * requested type.
 */
export class TransactionService {
  private static readonly DEFAULT_LIMIT = 20;

  /**
   * Merchant-scoped activity feed, ordered by transaction_date desc.
   * Built from a union of:
   *   - customer_purchases   (transaction_type = "purchase")
   *   - customer_credit      (transaction_type = "credit_issue")
   *   - customer_credit_redemptions (transaction_type = "credit_redeem", only approved)
   *
   * `type` filters the union to a single kind before pagination, so `total`
   * and the returned page reflect only that kind. `type = "all"` (default)
   * returns the full union.
   */
  async getTransactions(
    merchantId: number,
    filters: TransactionsFilters,
  ): Promise<TransactionsPage> {
    const limit = filters.limit ?? TransactionService.DEFAULT_LIMIT;
    const offset = filters.offset ?? 0;
    const typeFilter: TransactionTypeFilter = filters.type ?? "all";

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

    // Fetch the merchant's branch IDs to filter on (preserves branch filter).
    const filteredBranchIds =
      filters.branch_id != null && branchIds.includes(filters.branch_id)
        ? [filters.branch_id]
        : branchIds;

    const startEpoch = filters.start ?? null;
    const endEpoch = filters.end ?? null;

    // Skip source queries that can't contribute to the requested type. Each
    // source query is only run if its rows could pass the type filter.
    const needPurchases = typeFilter === "all" || typeFilter === "purchase";
    const needCredits =
      typeFilter === "all" || typeFilter === "credit_issue";
    const needRedemptions =
      typeFilter === "all" || typeFilter === "credit_redeem";

    // Run purchases + credits in parallel. Redemptions are fetched in a
    // follow-up query scoped to the credit IDs returned by the credits query
    // (customer_credit_redemptions has no denormalized customer_id/branch_id —
    // we reach them via credit_id → customer_credit).
    const [purchasesRes, creditsRes] = await Promise.all([
      needPurchases
        ? supabaseAdmin
            .from("customer_purchases")
            .select(
              `id, customer_id, branch_id, recorded_by_staff_id, amount, transaction_date, created_at,
               customer:customers(${QueryFragments.BASE_CUSTOMER}, users(${QueryFragments.BASE_USER_PROFILE})),
               branch:branches(${QueryFragments.BASE_BRANCH}),
               recorded_by_staff:staff(${QueryFragments.BASE_STAFF})`,
            )
            .in("branch_id", filteredBranchIds)
            .is("deleted_at", null)
            .order("transaction_date", { ascending: false })
        : Promise.resolve({ data: [], error: null as any }),
      needCredits
        ? supabaseAdmin
            .from("customer_credit")
            .select(
              `id, customer_id, branch_id, credit_amount, created_at,
               customer:customers(${QueryFragments.BASE_CUSTOMER}, users(${QueryFragments.BASE_USER_PROFILE})),
               branch:branches(${QueryFragments.BASE_BRANCH})`,
            )
            .in("branch_id", filteredBranchIds)
            .is("deleted_at", null)
            .is("revoked_at", null)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null as any }),
    ]);

    if (purchasesRes.error) {
      throw new Error(`Failed to load purchases: ${purchasesRes.error.message}`);
    }
    if (creditsRes.error) {
      throw new Error(`Failed to load credits: ${creditsRes.error.message}`);
    }

    // Fetch approved redemptions for the credits we just loaded. The redemption
    // table has no denormalized customer_id / branch_id — we reach them via
    // credit_id → customer_credit.
    const creditIds = ((creditsRes.data ?? []) as any[]).map((c) => c.id);
    let redemptionsRes: { data: any[] | null; error: any } = {
      data: [],
      error: null,
    };
    if (needRedemptions && creditIds.length > 0) {
      redemptionsRes = await supabaseAdmin
        .from("customer_credit_redemptions")
        .select(
          `id, credit_id, amount_redeemed, approved_at, approved_by_staff_id, recorded_by_staff_id, created_at,
           credit:customer_credit(id, customer_id, branch_id,
             customer:customers(${QueryFragments.BASE_CUSTOMER}, users(${QueryFragments.BASE_USER_PROFILE})),
             branch:branches(${QueryFragments.BASE_BRANCH})),
           approved_by_staff:staff!approved_by_staff_id(${QueryFragments.BASE_STAFF})`,
        )
        .in("credit_id", creditIds)
        .is("deleted_at", null)
        .not("approved_at", "is", null)
        .order("created_at", { ascending: false });
    }
    if (redemptionsRes.error) {
      throw new Error(
        `Failed to load redemptions: ${redemptionsRes.error.message}`,
      );
    }

    type UnionRow = {
      id: number;
      customer_id: number;
      branch_id: number;
      recorded_by_staff_id: number | null;
      amount: number;
      transaction_date: number;
      transaction_type: "purchase" | "credit_issue" | "credit_redeem";
      created_at: string;
      credit_id: number | null;
      customer: any;
      branch: any;
      recorded_by_staff: any;
      approved_by_staff: any;
    };

    const unioned: UnionRow[] = [];

    if (needPurchases) {
      for (const r of (purchasesRes.data ?? []) as any[]) {
        const td = Number(r.transaction_date);
        if (startEpoch != null && td < startEpoch) continue;
        if (endEpoch != null && td > endEpoch) continue;
        unioned.push({
          id: r.id,
          customer_id: r.customer_id,
          branch_id: r.branch_id,
          recorded_by_staff_id: r.recorded_by_staff_id ?? null,
          amount: Number(r.amount),
          transaction_date: td,
          transaction_type: "purchase",
          created_at: r.created_at,
          credit_id: null,
          customer: r.customer,
          branch: r.branch,
          recorded_by_staff: r.recorded_by_staff ?? null,
          approved_by_staff: null,
        });
      }
    }

    if (needCredits) {
      for (const r of (creditsRes.data ?? []) as any[]) {
        const td = Math.floor(new Date(r.created_at).getTime() / 1000);
        if (startEpoch != null && td < startEpoch) continue;
        if (endEpoch != null && td > endEpoch) continue;
        unioned.push({
          id: r.id,
          customer_id: r.customer_id,
          branch_id: r.branch_id,
          recorded_by_staff_id: null,
          amount: Number(r.credit_amount),
          transaction_date: td,
          transaction_type: "credit_issue",
          created_at: r.created_at,
          credit_id: r.id,
          customer: r.customer,
          branch: r.branch,
          recorded_by_staff: null,
          approved_by_staff: null,
        });
      }
    }

    if (needRedemptions) {
      for (const r of (redemptionsRes.data ?? []) as any[]) {
        const td = Math.floor(new Date(r.created_at).getTime() / 1000);
        if (startEpoch != null && td < startEpoch) continue;
        if (endEpoch != null && td > endEpoch) continue;
        const credit = (r.credit ?? null) as any;
        unioned.push({
          id: r.id,
          customer_id: credit?.customer_id,
          branch_id: credit?.branch_id,
          recorded_by_staff_id: r.recorded_by_staff_id ?? null,
          amount: Number(r.amount_redeemed),
          transaction_date: td,
          transaction_type: "credit_redeem",
          created_at: r.created_at,
          credit_id: r.credit_id,
          customer: credit?.customer,
          branch: credit?.branch,
          recorded_by_staff: null,
          approved_by_staff: r.approved_by_staff ?? null,
        });
      }
    }

    unioned.sort((a, b) => b.transaction_date - a.transaction_date);

    const total = unioned.length;
    const pageRows = unioned.slice(offset, offset + limit);

    return {
      rows: pageRows as unknown as CustomerTransactions[],
      total,
      offset,
      limit,
    };
  }

  /**
   * Record a purchase in `customer_purchases` and auto-issue any matching
   * running credit configs. Auto-creates the customer (by phone) if missing.
   * Branch resolution order: explicit `payload.branch_id` (must belong to the
   * caller's merchant), then the caller's JWT `branch_id`. Credit-issuance
   * failures are logged but never fail the purchase — the purchase row is the
   * source of truth.
   *
   * Returns the purchase row shaped as the existing `CustomerTransactions`
   * type so the frontend can drop it straight into the activity feed.
   */
  async createPurchase(
    user: AccessTokenPayload,
    payload: CreatePurchaseRequest,
    merchantId: number,
    log?: FastifyBaseLogger,
  ): Promise<CustomerTransactions> {
    const branchId = payload.branch_id ?? user.branch_id;
    if (branchId == null) {
      throw new Error("Caller has no assigned branch");
    }

    const phone = normalizePhone(payload.phone);

    // 1. Lookup existing customer by phone (deleted_at IS NULL).
    const { data: existing } = await supabaseAdmin
      .from("customers")
      .select(QueryFragments.BASE_CUSTOMER)
      .eq("phone", phone)
      .is("deleted_at", null)
      .maybeSingle();

    let customerId: number;
    if (existing) {
      customerId = existing.id;
    } else {
      const { data: created, error: createErr } = await supabaseAdmin
        .from("customers")
        .insert({ phone })
        .select(QueryFragments.BASE_CUSTOMER)
        .single();
      if (createErr || !created) {
        throw new Error(
          `Failed to create customer: ${createErr?.message ?? "unknown"}`,
        );
      }
      customerId = created.id;
    }

    // 2. Insert the purchase row.
    const nowEpoch = Math.floor(Date.now() / 1000);
    const { data: txRow, error: txErr } = await supabaseAdmin
      .from("customer_purchases")
      .insert({
        customer_id: customerId,
        branch_id: branchId,
        recorded_by_staff_id: user.staff_id ?? null,
        amount: payload.amount,
        transaction_date: nowEpoch,
      })
      .select(
        `id, customer_id, branch_id, recorded_by_staff_id, amount, transaction_date, created_at,
         customer:customers(${QueryFragments.BASE_CUSTOMER}, users(${QueryFragments.BASE_USER_PROFILE})),
         branch:branches(${QueryFragments.BASE_BRANCH}),
         recorded_by_staff:staff(${QueryFragments.BASE_STAFF})`,
      )
      .single();

    if (txErr || !txRow) {
      throw new Error(
        `Failed to record purchase: ${txErr?.message ?? "unknown"}`,
      );
    }

    // Non-fatal: auto-issue running credits. The purchase row is the source of
    // truth; any issuance error is logged and swallowed.
    try {
      await issueRunningCreditsForPurchase(
        supabaseAdmin,
        merchantId,
        customerId,
        branchId,
        payload.amount,
        nowEpoch,
      );
    } catch (err) {
      if (log) log.error(err, "issueRunningCreditsForPurchase failed (non-fatal)");
      else console.error("issueRunningCreditsForPurchase failed (non-fatal)", err);
    }

    // Reshape to the existing CustomerTransactions shape so the frontend stays
    // unchanged. transaction_type is synthesized as "purchase"; credit_id is
    // null because purchases don't reference a customer_credit row.
    const synthesized = {
      ...((txRow as any) as object),
      transaction_type: "purchase" as const,
      credit_id: null,
    };
    return synthesized as unknown as CustomerTransactions;
  }
}

export const transactionService = new TransactionService();