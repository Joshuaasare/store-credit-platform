import { FastifyBaseLogger } from "fastify";
import { supabaseAdmin } from "../utils/supabase.client";
import { QueryFragments } from "../constants/queryFragments";
import { AccessTokenPayload } from "../schemas/auth.schema";
import {
  LeaderboardRow,
  LeaderboardSort,
  LeaderboardFilters,
  TransactionsFilters,
  LeaderboardPage,
  LeaderboardStats,
  TransactionsPage,
  CreatePurchaseRequest,
  CustomerTransactions,
} from "../schemas/customers.schema";
import { issueRunningCreditsForPurchase } from "./creditConfig.service";

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

/**
 * Customer service — leaderboard (via Postgres RPC), transactions list
 * (via Supabase range queries), and purchase creation (auto-creates customer
 * by phone).
 *
 * All reads/writes are scoped to a verified merchant_id resolved upstream
 * from the JWT. `amount` is canonical per `transaction_type`; `credit_generated`
 * / `credit_redeemed` columns are intentionally ignored.
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

    const rows = (rowsResult.data ?? []) as unknown as LeaderboardRow[];

    const total =
      countResult.data == null ? 0 : Number(countResult.data as unknown);

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

    // Distinct customer count + sum-by-type via two RPC calls.
    const [countRes, rowsRes] = await Promise.all([
      supabaseAdmin.rpc("get_customer_leaderboard_count", rpcParams),
      // Pull all leaderboard rows (limit high) to sum metrics client-side.
      // Cheaper than a third RPC; total_customers is the distinct count.
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

    const allRows = (rowsRes.data ?? []) as unknown as LeaderboardRow[];
    const total_customers =
      countRes.data == null ? 0 : Number(countRes.data as unknown);
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
   * Merchant-scoped transactions list, ordered by transaction_date desc.
   * Uses Supabase `.range()` offset pagination with a parallel count query.
   * Returns the nested BASE-composition shape (`CustomerTransactions[]`).
   */
  async getTransactions(
    merchantId: number,
    filters: TransactionsFilters,
  ): Promise<TransactionsPage> {
    const limit = filters.limit ?? CustomerService.DEFAULT_LIMIT;
    const offset = filters.offset ?? 0;

    // Fetch the merchant's branch IDs once (small array) so PostgREST can
    // filter via `.in("branch_id", ids)`.
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

    const baseQuery = supabaseAdmin
      .from("customer_transactions")
      .select(
        `${QueryFragments.BASE_CUSTOMER_TRANSACTION}, customer:customers(${QueryFragments.BASE_CUSTOMER}, users(${QueryFragments.BASE_USER_PROFILE})), branch:branches(${QueryFragments.BASE_BRANCH}), recorded_by_user:users(${QueryFragments.BASE_USER_PROFILE})`,
      )
      .in("branch_id", branchIds)
      .is("deleted_at", null)
      .order("transaction_date", { ascending: false });

    if (filters.branch_id != null) {
      baseQuery.eq("branch_id", filters.branch_id);
    }
    if (filters.start != null) {
      baseQuery.gte("transaction_date", filters.start);
    }
    if (filters.end != null) {
      baseQuery.lte("transaction_date", filters.end);
    }

    const countQuery = supabaseAdmin
      .from("customer_transactions")
      .select("id", { count: "exact", head: true })
      .in("branch_id", branchIds)
      .is("deleted_at", null);
    if (filters.branch_id != null) {
      countQuery.eq("branch_id", filters.branch_id);
    }
    if (filters.start != null) {
      countQuery.gte("transaction_date", filters.start);
    }
    if (filters.end != null) {
      countQuery.lte("transaction_date", filters.end);
    }

    const [pageRes, countRes] = await Promise.all([
      baseQuery.range(offset, offset + limit - 1),
      countQuery,
    ]);

    if (pageRes.error) {
      throw new Error(`Failed to load transactions: ${pageRes.error.message}`);
    }
    if (countRes.error) {
      throw new Error(
        `Failed to count transactions: ${countRes.error.message}`,
      );
    }

    const rows = (pageRes.data ?? []) as unknown as CustomerTransactions[];

    return {
      rows,
      total: countRes.count ?? 0,
      offset,
      limit,
    };
  }

  /**
   * Create a `purchase` transaction. Auto-creates the customer (by phone) if
   * missing. The branch is resolved in this order: explicit `payload.branch_id`
   * (must belong to the caller's merchant), then the caller's JWT `branch_id`,
   * then the staff lookup. After the purchase row is persisted, any matching
   * running credit configs are auto-issued; failures there are logged but
   * never fail the purchase — the purchase row is the source of truth.
   * Returns the nested BASE-composition row (`CustomerTransactions`).
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

    const phone = payload.phone.trim();

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

    // 2. Insert the purchase transaction row.
    const nowEpoch = Math.floor(Date.now() / 1000);
    const { data: txRow, error: txErr } = await supabaseAdmin
      .from("customer_transactions")
      .insert({
        customer_id: customerId,
        branch_id: branchId,
        recorded_by_user_id: user.sub,
        amount: payload.amount,
        transaction_type: "purchase",
        transaction_date: nowEpoch,
      })
      .select(
        `${QueryFragments.BASE_CUSTOMER_TRANSACTION},
        customer:customers(${QueryFragments.BASE_CUSTOMER},
        users(${QueryFragments.BASE_USER_PROFILE})),
        branch:branches(${QueryFragments.BASE_BRANCH}),
        recorded_by_user:users(${QueryFragments.BASE_USER_PROFILE})`,
      )
      .single();

    if (txErr || !txRow) {
      throw new Error(
        `Failed to record purchase: ${txErr?.message ?? "unknown"}`,
      );
    }

    // Non-fatal: auto-issue running credits (decisions 1, 6, 10). The purchase
    // row is the source of truth; any issuance error is logged and swallowed.
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

    return txRow as unknown as CustomerTransactions;
  }
}

export const customerService = new CustomerService();
