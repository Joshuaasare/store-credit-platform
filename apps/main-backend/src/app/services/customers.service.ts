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
  CreateRedemptionRequest,
  CreditRemainingResponse,
  CustomerTransactions,
} from "../schemas/customers.schema";
import { issueRunningCreditsForPurchase } from "./creditConfig.service";

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

/**
 * Customer service — leaderboard (via Postgres RPC), activity feed
 * (union of customer_purchases + customer_credit + customer_credit_redemptions),
 * purchase creation (auto-creates customer by phone), redemption recording,
 * and live "remaining credit" calculation.
 *
 * All reads/writes are scoped to a verified merchant_id resolved upstream
 * from the JWT. Purchases, credits, and redemptions each live in their own
 * table after the re-architecture; the activity-feed endpoint synthesizes a
 * single `CustomerTransactions`-shaped row from the union so the frontend
 * doesn't have to change its row type.
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
   * Merchant-scoped activity feed, ordered by transaction_date desc.
   * Built from a union of:
   *   - customer_purchases   (transaction_type = "purchase")
   *   - customer_credit      (transaction_type = "credit_issue")
   *   - customer_credit_redemptions (transaction_type = "credit_redeem", only approved)
   *
   * Each row is shaped as the existing `CustomerTransactions` type so the
   * frontend doesn't have to change. Pagination is computed against the
   * union (the count RPCs already union across the 3 tables).
   */
  async getTransactions(
    merchantId: number,
    filters: TransactionsFilters,
  ): Promise<TransactionsPage> {
    const limit = filters.limit ?? CustomerService.DEFAULT_LIMIT;
    const offset = filters.offset ?? 0;

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

    // Run purchases + credits in parallel. Redemptions are fetched in a
    // follow-up query scoped to the credit IDs returned by the credits query
    // (customer_credit_redemptions has no denormalized customer_id/branch_id —
    // we reach them via credit_id → customer_credit).
    const [purchasesRes, creditsRes] = await Promise.all([
      supabaseAdmin
        .from("customer_purchases")
        .select(
          `id, customer_id, branch_id, recorded_by_user_id, amount, transaction_date, created_at,
           customer:customers(${QueryFragments.BASE_CUSTOMER}, users(${QueryFragments.BASE_USER_PROFILE})),
           branch:branches(${QueryFragments.BASE_BRANCH}),
           recorded_by_user:users(${QueryFragments.BASE_USER_PROFILE})`,
        )
        .in("branch_id", filteredBranchIds)
        .is("deleted_at", null)
        .order("transaction_date", { ascending: false }),
      supabaseAdmin
        .from("customer_credit")
        .select(
          `id, customer_id, branch_id, credit_amount, created_at,
           customer:customers(${QueryFragments.BASE_CUSTOMER}, users(${QueryFragments.BASE_USER_PROFILE})),
           branch:branches(${QueryFragments.BASE_BRANCH})`,
        )
        .in("branch_id", filteredBranchIds)
        .is("deleted_at", null)
        .is("revoked_at", null)
        .order("created_at", { ascending: false }),
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
    if (creditIds.length > 0) {
      redemptionsRes = await supabaseAdmin
        .from("customer_credit_redemptions")
        .select(
          `id, credit_id, amount_redeemed, approved_at, approved_by_user_id, created_at,
           credit:customer_credit(id, customer_id, branch_id,
             customer:customers(${QueryFragments.BASE_CUSTOMER}, users(${QueryFragments.BASE_USER_PROFILE})),
             branch:branches(${QueryFragments.BASE_BRANCH})),
           approved_by_user:users(${QueryFragments.BASE_USER_PROFILE})`,
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
      recorded_by_user_id: string | null;
      amount: number;
      transaction_date: number;
      transaction_type: "purchase" | "credit_issue" | "credit_redeem";
      created_at: string;
      credit_id: number | null;
      customer: any;
      branch: any;
      recorded_by_user: any;
    };

    const unioned: UnionRow[] = [];

    for (const r of (purchasesRes.data ?? []) as any[]) {
      const td = Number(r.transaction_date);
      if (startEpoch != null && td < startEpoch) continue;
      if (endEpoch != null && td > endEpoch) continue;
      unioned.push({
        id: r.id,
        customer_id: r.customer_id,
        branch_id: r.branch_id,
        recorded_by_user_id: r.recorded_by_user_id,
        amount: Number(r.amount),
        transaction_date: td,
        transaction_type: "purchase",
        created_at: r.created_at,
        credit_id: null,
        customer: r.customer,
        branch: r.branch,
        recorded_by_user: r.recorded_by_user,
      });
    }

    for (const r of (creditsRes.data ?? []) as any[]) {
      const td = Math.floor(new Date(r.created_at).getTime() / 1000);
      if (startEpoch != null && td < startEpoch) continue;
      if (endEpoch != null && td > endEpoch) continue;
      unioned.push({
        id: r.id,
        customer_id: r.customer_id,
        branch_id: r.branch_id,
        recorded_by_user_id: null,
        amount: Number(r.credit_amount),
        transaction_date: td,
        transaction_type: "credit_issue",
        created_at: r.created_at,
        credit_id: r.id,
        customer: r.customer,
        branch: r.branch,
        recorded_by_user: null,
      });
    }

    for (const r of (redemptionsRes.data ?? []) as any[]) {
      const td = Math.floor(new Date(r.created_at).getTime() / 1000);
      if (startEpoch != null && td < startEpoch) continue;
      if (endEpoch != null && td > endEpoch) continue;
      const credit = (r.credit ?? null) as any;
      unioned.push({
        id: r.id,
        customer_id: credit?.customer_id,
        branch_id: credit?.branch_id,
        recorded_by_user_id: r.approved_by_user_id ?? null,
        amount: Number(r.amount_redeemed),
        transaction_date: td,
        transaction_type: "credit_redeem",
        created_at: r.created_at,
        credit_id: r.credit_id,
        customer: credit?.customer,
        branch: credit?.branch,
        recorded_by_user: r.approved_by_user ?? null,
      });
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

    // 2. Insert the purchase row.
    const nowEpoch = Math.floor(Date.now() / 1000);
    const { data: txRow, error: txErr } = await supabaseAdmin
      .from("customer_purchases")
      .insert({
        customer_id: customerId,
        branch_id: branchId,
        recorded_by_user_id: user.sub,
        amount: payload.amount,
        transaction_date: nowEpoch,
      })
      .select(
        `id, customer_id, branch_id, recorded_by_user_id, amount, transaction_date, created_at,
         customer:customers(${QueryFragments.BASE_CUSTOMER}, users(${QueryFragments.BASE_USER_PROFILE})),
         branch:branches(${QueryFragments.BASE_BRANCH}),
         recorded_by_user:users(${QueryFragments.BASE_USER_PROFILE})`,
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

  /**
   * Record a redemption against a specific customer_credit row. Auto-approves
   * (approved_at = now(), approved_by_user_id = caller) — the approved_at
   * column exists so a future customer-initiated flow can record pending
   * redemptions that await manager approval.
   *
   * Validates:
   *   - The credit exists, is not deleted, and is not revoked.
   *   - The credit's customer belongs to the caller's merchant (via the
   *     credit.branch_id → branches.merchant_id join).
   *   - The redemption amount does not exceed `remaining` (credit_amount −
   *     SUM(approved redemptions)).
   *
   * Returns the live CreditRemainingResponse for that credit.
   */
  async createRedemption(
    user: AccessTokenPayload,
    payload: CreateRedemptionRequest,
    merchantId: number,
  ): Promise<CreditRemainingResponse> {
    if (!(payload.amount_redeemed > 0)) {
      throw new Error("Redemption amount must be greater than zero");
    }

    // Fetch the credit row joined to its branch for merchant scoping.
    const { data: credit, error: creditErr } = await supabaseAdmin
      .from("customer_credit")
      .select(
        `id, customer_id, branch_id, credit_amount, expires_at, revoked_at, deleted_at,
         branch:branches(id, merchant_id)`,
      )
      .eq("id", payload.credit_id)
      .maybeSingle();

    if (creditErr) {
      throw new Error(`Failed to load credit: ${creditErr.message}`);
    }
    if (!credit || credit.deleted_at) {
      throw new Error("Credit not found");
    }
    if (credit.revoked_at) {
      throw new Error("Credit has been revoked");
    }
    const branchMerchantId = (credit.branch as any)?.merchant_id ?? null;
    if (branchMerchantId !== merchantId) {
      throw new Error("Credit does not belong to your merchant");
    }

    const remaining = await this.getCreditRemaining(payload.credit_id);
    if (payload.amount_redeemed > remaining.remaining) {
      throw new Error(
        `Redemption exceeds remaining credit (remaining: ${remaining.remaining})`,
      );
    }

    const nowIso = new Date().toISOString();
    const { error: insertErr } = await supabaseAdmin
      .from("customer_credit_redemptions")
      .insert({
        credit_id: payload.credit_id,
        amount_redeemed: payload.amount_redeemed,
        approved_at: nowIso,
        approved_by_user_id: user.sub,
      } as any);

    if (insertErr) {
      throw new Error(`Failed to record redemption: ${insertErr.message}`);
    }

    // Re-fetch remaining after the insert so the caller gets the live snapshot.
    return this.getCreditRemaining(payload.credit_id);
  }

  /**
   * Compute `remaining = credit_amount − SUM(approved redemptions)` for a
   * single customer_credit row. Throws if the credit is missing or revoked.
   * Returned `redeemed_total` is the sum of approved, non-deleted redemptions.
   */
  async getCreditRemaining(creditId: number): Promise<CreditRemainingResponse> {
    const { data: credit, error: creditErr } = await supabaseAdmin
      .from("customer_credit")
      .select("id, customer_id, branch_id, credit_amount, revoked_at, deleted_at")
      .eq("id", creditId)
      .maybeSingle();

    if (creditErr) {
      throw new Error(`Failed to load credit: ${creditErr.message}`);
    }
    if (!credit || credit.deleted_at) {
      throw new Error("Credit not found");
    }

    const { data: sumRow, error: sumErr } = await supabaseAdmin
      .from("customer_credit_redemptions")
      .select("amount_redeemed")
      .eq("credit_id", creditId)
      .not("approved_at", "is", null)
      .is("deleted_at", null);

    if (sumErr) {
      throw new Error(`Failed to load redemptions: ${sumErr.message}`);
    }

    const redeemedTotal = (sumRow ?? []).reduce(
      (s, r) => s + Number((r as any).amount_redeemed),
      0,
    );
    const creditAmount = Number((credit as any).credit_amount);
    const remaining = Math.max(0, creditAmount - redeemedTotal);

    return {
      credit_id: creditId,
      customer_id: (credit as any).customer_id,
      branch_id: (credit as any).branch_id,
      credit_amount: creditAmount,
      redeemed_total: redeemedTotal,
      remaining,
    };
  }
}

export const customerService = new CustomerService();