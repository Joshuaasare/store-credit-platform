import { createApiClient } from "./apiService.js";
import {
  RedemptionsQuerystring,
  RedemptionsApiResponse,
  RedemptionMutationApiResponse,
} from "../types/api.types.js";

/**
 * Redemption service — wraps the merchant-side Credit Redemptions backend
 * endpoints (list + approve + reject). Mirrors the createCustomerService /
 * createTransactionService factory pattern.
 *
 * Cashiers and managers do NOT create redemption rows here. Only the customer
 * (via a future customer app) initiates a redemption; this service is the
 * merchant-side review/approve surface.
 */
export function createRedemptionService() {
  const { apiRequest } = createApiClient();

  function buildQS(params: object): string {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(params)) {
      if (v == null) continue;
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
    return parts.length ? `?${parts.join("&")}` : "";
  }

  return {
    /**
     * GET /redemptions — paginated, merchant-scoped, status-filtered
     * redemption list. `status` is required (pending | approved | rejected).
     * Each row carries a per-row `remaining` (credit.credit_amount −
     * SUM(approved redemptions on that credit)).
     */
    async listRedemptions(
      params: RedemptionsQuerystring,
    ): Promise<RedemptionsApiResponse> {
      const qs = buildQS(params);
      return apiRequest<RedemptionsApiResponse>(`/redemptions${qs}`, {
        method: "GET",
      });
    },

    /**
     * POST /redemptions/:id/approve — manager-only. Approves a pending
     * redemption. 409 if already in a terminal state; 400 if the requested
     * amount exceeds the credit's current remaining.
     */
    async approveRedemption(
      id: number,
    ): Promise<RedemptionMutationApiResponse> {
      return apiRequest<RedemptionMutationApiResponse>(
        `/redemptions/${encodeURIComponent(id)}/approve`,
        { method: "POST" },
      );
    },

    /**
     * POST /redemptions/:id/reject — manager-only. Rejects a pending
     * redemption. 409 if already in a terminal state.
     */
    async rejectRedemption(
      id: number,
    ): Promise<RedemptionMutationApiResponse> {
      return apiRequest<RedemptionMutationApiResponse>(
        `/redemptions/${encodeURIComponent(id)}/reject`,
        { method: "POST" },
      );
    },
  };
}

export const redemptionService = createRedemptionService();