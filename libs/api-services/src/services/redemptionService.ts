import { createApiClient } from "./apiService.js";
import {
  MerchantApprovedRedemptionsApiResponse,
  MerchantAuditFeedFilters,
  MerchantPendingRequestsApiResponse,
  MerchantPendingRequestsQuerystring,
  MerchantRejectedRedemptionsApiResponse,
  MerchantRedemptionActionBody,
  MerchantRedemptionMutationApiResponse,
} from "../types/api.types.js";

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
    // redemption_code is intentionally NOT returned — the staff reads it
    // from the customer's screen and types it into the approve dialog.
    async listPendingRedemptions(
      params: Partial<MerchantPendingRequestsQuerystring> = {},
    ): Promise<MerchantPendingRequestsApiResponse> {
      const qs = buildQS(params);
      return apiRequest<MerchantPendingRequestsApiResponse>(
        `/redemptions/pending${qs}`,
        { method: "GET" },
      );
    },

    async listApprovedRedemptions(
      params: Partial<MerchantAuditFeedFilters> = {},
    ): Promise<MerchantApprovedRedemptionsApiResponse> {
      const qs = buildQS(params);
      return apiRequest<MerchantApprovedRedemptionsApiResponse>(
        `/redemptions/approved${qs}`,
        { method: "GET" },
      );
    },

    async listRejectedRedemptions(
      params: Partial<MerchantAuditFeedFilters> = {},
    ): Promise<MerchantRejectedRedemptionsApiResponse> {
      const qs = buildQS(params);
      return apiRequest<MerchantRejectedRedemptionsApiResponse>(
        `/redemptions/rejected${qs}`,
        { method: "GET" },
      );
    },

    // RPC verifies the 4-digit code matches the pending audit row at this
    // merchant before stamping approved_at. 404 if no pending, 400 on code mismatch.
    async approveRequest(
      customerId: number,
      body: MerchantRedemptionActionBody,
    ): Promise<MerchantRedemptionMutationApiResponse> {
      return apiRequest<MerchantRedemptionMutationApiResponse>(
        `/redemptions/customers/${encodeURIComponent(customerId)}/approve`,
        { method: "POST", body },
      );
    },

    async rejectRequest(
      customerId: number,
      body: MerchantRedemptionActionBody,
    ): Promise<MerchantRedemptionMutationApiResponse> {
      return apiRequest<MerchantRedemptionMutationApiResponse>(
        `/redemptions/customers/${encodeURIComponent(customerId)}/reject`,
        { method: "POST", body },
      );
    },
  };
}

export const redemptionService = createRedemptionService();
