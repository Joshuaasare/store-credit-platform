import { createApiClient } from "./apiService.js";
import {
  LeaderboardQuerystring,
  TransactionsQuerystring,
  CreatePurchaseRequest,
  CreateRedemptionRequest,
  LeaderboardApiResponse,
  LeaderboardStatsApiResponse,
  TransactionsApiResponse,
  CreatePurchaseApiResponse,
  CreateRedemptionApiResponse,
  CreditRemainingApiResponse,
} from "../types/api.types.js";

/**
 * Customer service — wraps the Customers backend endpoints.
 * Mirrors the createAuthService / createStoreService factory pattern.
 */
export function createCustomerService() {
  const { apiRequest } = createApiClient();

  function buildQS(params: Record<string, unknown>): string {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(params)) {
      if (v == null) continue;
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
    return parts.length ? `?${parts.join("&")}` : "";
  }

  return {
    /** GET /customers/leaderboard — paginated, sorted, merchant-scoped. */
    async getLeaderboard(
      params: LeaderboardQuerystring,
    ): Promise<LeaderboardApiResponse> {
      const qs = buildQS(params as Record<string, unknown>);
      return apiRequest<LeaderboardApiResponse>(`/customers/leaderboard${qs}`, {
        method: "GET",
      });
    },

    /** GET /customers/leaderboard-stats — hero stats row. */
    async getLeaderboardStats(
      params: Omit<LeaderboardQuerystring, "sort" | "limit" | "offset">,
    ): Promise<LeaderboardStatsApiResponse> {
      const qs = buildQS(params as Record<string, unknown>);
      return apiRequest<LeaderboardStatsApiResponse>(
        `/customers/leaderboard-stats${qs}`,
        { method: "GET" },
      );
    },

    /** GET /customers/transactions — paginated, merchant-scoped. */
    async getTransactions(
      params: TransactionsQuerystring,
    ): Promise<TransactionsApiResponse> {
      const qs = buildQS(params as Record<string, unknown>);
      return apiRequest<TransactionsApiResponse>(`/customers/transactions${qs}`, {
        method: "GET",
      });
    },

    /** POST /customers/transactions/purchase — record a purchase. */
    async createPurchase(
      payload: CreatePurchaseRequest,
    ): Promise<CreatePurchaseApiResponse> {
      return apiRequest<CreatePurchaseApiResponse>(
        "/customers/transactions/purchase",
        { method: "POST", body: payload },
      );
    },

    /**
     * POST /customers/credits/redeem — record an auto-approved redemption
     * against a specific customer_credit row. Returns the live
     * CreditRemainingResponse for that credit.
     */
    async createRedemption(
      payload: CreateRedemptionRequest,
    ): Promise<CreateRedemptionApiResponse> {
      return apiRequest<CreateRedemptionApiResponse>(
        "/customers/credits/redeem",
        { method: "POST", body: payload },
      );
    },

    /**
     * GET /customers/credits/:creditId/remaining — live remaining credit
     * snapshot (credit_amount − SUM(approved redemptions)).
     */
    async getCreditRemaining(
      creditId: number,
    ): Promise<CreditRemainingApiResponse> {
      return apiRequest<CreditRemainingApiResponse>(
        `/customers/credits/${encodeURIComponent(creditId)}/remaining`,
        { method: "GET" },
      );
    },
  };
}

export const customerService = createCustomerService();