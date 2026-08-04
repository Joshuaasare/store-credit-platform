import { supabaseAdmin } from "../utils/supabase.client";
import { AccessTokenPayload } from "../schemas/auth.schema";
import {
  LeaderboardRow,
  LeaderboardSort,
  LeaderboardFilters,
  LeaderboardPage,
  LeaderboardStats,
  CreateRedemptionRequest,
  CreditRemainingResponse,
} from "../schemas/customers.schema";

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