import { supabaseAdmin } from "../utils/supabase.client";
import { QueryFragments } from "../constants/queryFragments";
import {
  LeaderboardSort,
  LeaderboardFilters,
  LeaderboardPage,
  LeaderboardStats,
  CustomerListFilters,
  CustomerListRow,
  CustomerListPage,
  CustomerDetail,
  CustomerDetailCreditRow,
} from "../schemas/customers.schema";
import { BaseUserProfile } from "../schemas/main.schema";

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

/**
 * Customer service — leaderboard (via Postgres RPC), redemption recording,
 * and live "remaining credit" calculation.
 *
 * All reads/writes are scoped to a verified merchant_id resolved upstream
 * from the JWT. The activity feed and purchase recording live in
 * `transactions.service.ts` after the domain split.
 */
export class CustomerService {
  private static readonly DEFAULT_LIMIT = 20;

  /**
   * Leaderboard rows + total distinct customer count. Sort defaults to
   * `purchases`; tiebreak by `customer_id` asc (enforced in the RPC).
   */
  async getLeaderboard(
    merchantId: number,
    filters: LeaderboardFilters,
  ): Promise<LeaderboardPage> {
    const limit = filters.limit ?? CustomerService.DEFAULT_LIMIT;
    const offset = filters.offset ?? 0;
    const sort: LeaderboardSort = filters.sort ?? "purchases";

    const rpcParams = {
      p_merchant_id: merchantId,
      p_branch_id: filters.branch_id ?? undefined,
      p_sort: sort,
      p_start_epoch: filters.start ?? undefined,
      p_end_epoch: filters.end ?? undefined,
      p_limit: limit,
      p_offset: offset,
    };

    const [rowsResult, countResult] = await Promise.all([
      supabaseAdmin.rpc("get_customer_leaderboard", rpcParams),
      supabaseAdmin.rpc("get_customer_leaderboard_count", {
        p_merchant_id: merchantId,
        p_branch_id: filters.branch_id ?? undefined,
        p_start_epoch: filters.start ?? undefined,
        p_end_epoch: filters.end ?? undefined,
      }),
    ]);

    if (rowsResult.error) {
      throw new Error(
        `Failed to load leaderboard: ${rowsResult.error.message}`,
      );
    }
    if (countResult.error) {
      throw new Error(
        `Failed to load leaderboard count: ${countResult.error.message}`,
      );
    }

    const rows = rowsResult.data ?? [];

    const total = countResult.data == null ? 0 : Number(countResult.data);

    return { rows, total, offset, limit };
  }

  /**
   * Stats row for the leaderboard hero: total distinct customers, total
   * purchase amount, total credits issued in the window.
   */
  async getLeaderboardStats(
    merchantId: number,
    filters: Omit<LeaderboardFilters, "sort" | "limit" | "offset">,
  ): Promise<LeaderboardStats> {
    const rpcParams = {
      p_merchant_id: merchantId,
      p_branch_id: filters.branch_id ?? undefined,
      p_start_epoch: filters.start ?? undefined,
      p_end_epoch: filters.end ?? undefined,
    };

    const [countRes, rowsRes] = await Promise.all([
      supabaseAdmin.rpc("get_customer_leaderboard_count", rpcParams),
      supabaseAdmin.rpc("get_customer_leaderboard", {
        ...rpcParams,
        p_sort: "purchases",
        p_limit: 100000,
        p_offset: 0,
      }),
    ]);

    if (countRes.error) {
      throw new Error(`Failed to load stats count: ${countRes.error.message}`);
    }
    if (rowsRes.error) {
      throw new Error(`Failed to load stats rows: ${rowsRes.error.message}`);
    }

    const allRows = rowsRes.data ?? [];
    const total_customers = countRes.data == null ? 0 : Number(countRes.data);
    const total_purchases = allRows.reduce(
      (s, r) => s + Number(r.total_purchases ?? 0),
      0,
    );
    const total_credits_issued = allRows.reduce(
      (s, r) => s + Number(r.total_credits_issued ?? 0),
      0,
    );

    return { total_customers, total_purchases, total_credits_issued };
  }

  /**
   * Customer directory list — paginated, branch-scoped, searchable via the
   * `get_customers` RPC. The RPC returns flat columns + a `total` window-count
   * column on every row (pre-LIMIT); we read it from the first row, or 0 when
   * the page is empty. Search and branch scope are both applied server-side so
   * the `total` reflects the filtered set.
   *
   * The linked user profile is nested service-side: the page is already
   * paginated (≤limit rows), so we collect the non-null user_ids and do one
   * `users` select by `id in (...)` using BASE_USER_PROFILE, then attach
   * `user: BaseUserProfile | null` per row. This keeps the column set driven
   * by the fragment rather than hand-copying fields in the RPC.
   */
  async listCustomers(
    merchantId: number,
    filters: CustomerListFilters,
  ): Promise<CustomerListPage> {
    const limit = filters.limit ?? CustomerService.DEFAULT_LIMIT;
    const offset = filters.offset ?? 0;
    const search = filters.search?.trim() || null;

    const { data, error } = await supabaseAdmin.rpc("get_customers", {
      p_merchant_id: merchantId,
      p_branch_id: filters.branch_id ?? undefined,
      p_search: search ?? undefined,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      throw new Error(`Failed to load customers: ${error.message}`);
    }

    const rpcRows = (data ?? []) as Array<{
      customer_id: number;
      phone: string | null;
      user_id: string | null;
      customer_name: string;
      total_purchases: number;
      available_credits: number;
      live_credit_count: number;
      last_activity_epoch: number | null;
      total: number;
    }>;
    const total = rpcRows.length > 0 ? Number(rpcRows[0].total) : 0;

    // Fetch linked user profiles for this page in one query.
    const userIds = rpcRows
      .map((r) => r.user_id)
      .filter((id): id is string => id != null);
    const usersById = new Map<string, BaseUserProfile>();
    if (userIds.length > 0) {
      const { data: userRows } = await supabaseAdmin
        .from("users")
        .select(QueryFragments.BASE_USER_PROFILE)
        .in("id", userIds);
      for (const u of (userRows ?? []) as unknown as BaseUserProfile[]) {
        usersById.set(u.id, u);
      }
    }

    const rows: CustomerListRow[] = rpcRows.map((r) => ({
      customer_id: r.customer_id,
      user_id: r.user_id,
      phone: r.phone,
      user: r.user_id != null ? (usersById.get(r.user_id) ?? null) : null,
      customer_name: r.customer_name,
      total_purchases: Number(r.total_purchases ?? 0),
      available_credits: Number(r.available_credits ?? 0),
      live_credit_count: Number(r.live_credit_count ?? 0),
      last_activity_epoch: r.last_activity_epoch,
    }));

    return { rows, total, offset, limit };
  }

  /**
   * Single-customer detail — merchant-wide totals + every live credit row
   * (with per-credit redeemed_total / remaining). Service-layer (no RPC): the
   * data volume for one customer is small enough that a couple of queries +
   * JS aggregation is simpler than a second RPC.
   *
   * Throws "Customer not found" if the customer has no non-deleted purchase at
   * any branch of the merchant (the directory scoping rule) — this also
   * prevents a caller from probing customer_ids that belong to another
   * merchant.
   */
  async getCustomerDetail(
    merchantId: number,
    customerId: number,
  ): Promise<CustomerDetail> {
    // 0. Merchant branch ids — reused for scope check + purchase filtering.
    const { data: mbRows, error: mbErr } = await supabaseAdmin
      .from("branches")
      .select("id")
      .eq("merchant_id", merchantId)
      .is("deleted_at", null);
    if (mbErr) {
      throw new Error(`Failed to load merchant branches: ${mbErr.message}`);
    }
    const merchantBranchIds = (mbRows ?? []).map(
      (b: { id: number }) => b.id,
    );

    // 1. Scope check: ≥1 non-deleted purchase at a merchant branch. This is
    //    also the security boundary — a customer_id with no purchase at any
    //    of this merchant's branches is treated as not found.
    if (merchantBranchIds.length === 0) {
      throw new Error("Customer not found");
    }
    const { data: scopeRow, error: scopeErr } = await supabaseAdmin
      .from("customer_purchases")
      .select("id")
      .eq("customer_id", customerId)
      .is("deleted_at", null)
      .in("branch_id", merchantBranchIds)
      .limit(1)
      .maybeSingle();
    if (scopeErr) {
      throw new Error(`Failed to verify customer scope: ${scopeErr.message}`);
    }
    if (!scopeRow) {
      throw new Error("Customer not found");
    }

    // 2. Customer row + linked user profile (nested via BASE_USER_PROFILE).
    //    Names live on the customer row (surname / other_names); the user
    //    join carries phone / access / last_login only.
    const { data: customer, error: custErr } = await supabaseAdmin
      .from("customers")
      .select(`id, phone, user_id, surname, other_names, users(${QueryFragments.BASE_USER_PROFILE})`)
      .eq("id", customerId)
      .maybeSingle();
    if (custErr) {
      throw new Error(`Failed to load customer: ${custErr.message}`);
    }
    if (!customer) {
      throw new Error("Customer not found");
    }
    const linkedUser = (customer as unknown as {
      users: BaseUserProfile | null;
    }).users;

    // 3. Live credit rows joined to their branch (merchant-wide). Use the
    //    BASE_CUSTOMER_CREDIT + BASE_BRANCH fragments so column additions
    //    auto-propagate; the merchant_id on branch is used for scoping.
    const { data: creditRows, error: creditErr } = await supabaseAdmin
      .from("customer_credit")
      .select(
        `${QueryFragments.BASE_CUSTOMER_CREDIT},branch:branches(${QueryFragments.BASE_BRANCH})`,
      )
      .eq("customer_id", customerId)
      .is("deleted_at", null)
      .is("revoked_at", null);
    if (creditErr) {
      throw new Error(`Failed to load credits: ${creditErr.message}`);
    }

    const nowEpoch = Math.floor(Date.now() / 1000);
    const merchantCredits = ((creditRows ?? []) as unknown as Array<
      CustomerDetailCreditRow & {
        branch: { merchant_id: number };
        expires_at: number | null;
        created_at: string;
      }
    >).filter((row) => {
      const branchMerchantId = row.branch?.merchant_id ?? null;
      if (branchMerchantId !== merchantId) return false;
      const expiresAt = row.expires_at;
      return expiresAt == null || Number(expiresAt) > nowEpoch;
    });

    // 4. Approved redemption totals now live on the credit row itself
    //    (`approved_redemption_amount`) — no SUM-of-audit-table query is
    //    needed. We still need the customer's most-recent approved
    //    redemption timestamp to compute `last_activity_epoch`, so we
    //    pull it directly from the audit table scoped to the customer.
    const customerIds = [customerId];
    let lastRedemptionEpoch: number | null = null;
    if (customerIds.length > 0) {
      const { data: redemptionRows, error: redemptionErr } = await supabaseAdmin
        .from("customer_credit_redemptions")
        .select("approved_at")
        .eq("customer_id", customerIds[0])
        .not("approved_at", "is", null)
        .is("deleted_at", null)
        .order("approved_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (redemptionErr) {
        throw new Error(`Failed to load redemptions: ${redemptionErr.message}`);
      }
      if (redemptionRows?.approved_at) {
        lastRedemptionEpoch = Math.floor(
          new Date(redemptionRows.approved_at).getTime() / 1000,
        );
      }
    }

    // 5. Per-credit remaining + customer-level credit aggregates. Sort by
    //    remaining desc so the most-relevant credits sit at the top. The
    //    composed row already carries the BASE_CUSTOMER_CREDIT + branch
    //    columns; we just read the live aggregate directly off the row.
    const credits: CustomerDetailCreditRow[] = merchantCredits
      .map((row) => {
        const creditAmount = Number(row.credit_amount) || 0;
        const approvedTotal = Number(row.approved_redemption_amount) || 0;
        const pendingTotal = Number(row.pending_redemption_amount) || 0;
        const remaining = Math.max(
          0,
          creditAmount - approvedTotal - pendingTotal,
        );
        const { branch: _branch, ...baseCredit } = row;
        return {
          ...baseCredit,
          redeemed_total: approvedTotal,
          pending_total: pendingTotal,
          remaining,
          branch: row.branch,
        };
      })
      .sort((a, b) => b.remaining - a.remaining);

    const availableCredits = credits.reduce((s, c) => s + c.remaining, 0);
    const liveCreditCount = credits.filter((c) => c.remaining > 0).length;

    const lastCreditEpoch = merchantCredits.reduce<number | null>(
      (max, r) => {
        const created = r.created_at;
        if (!created) return max;
        const d = Math.floor(new Date(created).getTime() / 1000);
        return max == null || d > max ? d : max;
      },
      null,
    );

    // 6. Merchant-wide purchase total + last purchase epoch.
    const { data: purchaseRows, error: purchaseErr } = await supabaseAdmin
      .from("customer_purchases")
      .select("amount, transaction_date, branch_id")
      .eq("customer_id", customerId)
      .is("deleted_at", null);
    if (purchaseErr) {
      throw new Error(`Failed to load purchases: ${purchaseErr.message}`);
    }
    const merchantBranchSet = new Set(merchantBranchIds);
    const merchantPurchases = (purchaseRows ?? []).filter((p) =>
      merchantBranchSet.has((p as { branch_id: number }).branch_id),
    );
    const totalPurchases = merchantPurchases.reduce(
      (s, p) => s + (Number((p as { amount: number }).amount) || 0),
      0,
    );
    const lastPurchaseEpoch = merchantPurchases.reduce<number | null>(
      (max, p) => {
        const d =
          Number((p as { transaction_date: number }).transaction_date) || null;
        if (d == null) return max;
        return max == null || d > max ? d : max;
      },
      null,
    );

    const lastActivityEpoch = [
      lastPurchaseEpoch,
      lastCreditEpoch,
      lastRedemptionEpoch,
    ]
      .filter((v): v is number => v != null)
      .reduce<number | null>(
        (max, v) => (max == null || v > max ? v : max),
        null,
      );

    const surname = (customer as { surname: string | null }).surname ?? null;
    const otherNames = (customer as { other_names: string | null }).other_names ?? null;
    const fullName = `${surname ?? ""} ${otherNames ?? ""}`.trim();
    const customerName = fullName || "Unnamed customer";

    return {
      customer_id: customerId,
      phone: (customer as { phone: string | null }).phone,
      user_id: (customer as { user_id: string | null }).user_id,
      user: linkedUser,
      customer_name: customerName,
      total_purchases: totalPurchases,
      available_credits: availableCredits,
      live_credit_count: liveCreditCount,
      last_activity_epoch: lastActivityEpoch,
      credits,
    };
  }
}

export const customerService = new CustomerService();
