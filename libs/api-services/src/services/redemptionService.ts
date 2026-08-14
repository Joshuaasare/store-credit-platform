import { createApiClient } from "./apiService.js";
import {
  MerchantPendingRequestsApiResponse,
  MerchantApprovedRedemptionsApiResponse,
  MerchantRejectedRedemptionsApiResponse,
  MerchantRedemptionMutationApiResponse,
  MerchantPendingRequestsQuerystring,
  MerchantAuditFeedFilters,
} from "../types/api.types.js";

/**
 * Merchant-side redemption service — backs the Redemptions page on the
 * webapp. Mirrors the createCustomerService factory pattern.
 *
 * Three list views (Pending, Approved, Rejected) and two mutations
 * (Approve, Reject). Pending is derived from the implicit set of
 * `customer_credit` rows at the merchant with `pending_redemption_amount
 * > 0`; Approved / Rejected are rows from the thin audit table
 * `customer_credit_redemptions`. Approve / Reject are atomic SQL RPCs.
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
     * GET /redemptions/pending — paginated list of pending requests at the
     * caller's merchant. One row per (customer, merchant) pair with any
     * `customer_credit` row at `pending_redemption_amount > 0`. Each row
     * carries the per-credit fan-out breakdown.
     */
    async listPendingRedemptions(
      params: Partial<MerchantPendingRequestsQuerystring> = {},
    ): Promise<MerchantPendingRequestsApiResponse> {
      const qs = buildQS(params);
      return apiRequest<MerchantPendingRequestsApiResponse>(
        `/redemptions/pending${qs}`,
        { method: "GET" },
      );
    },

    /**
     * GET /redemptions/approved — paginated audit feed of approved
     * redemptions at the caller's merchant.
     */
    async listApprovedRedemptions(
      params: Partial<MerchantAuditFeedFilters> = {},
    ): Promise<MerchantApprovedRedemptionsApiResponse> {
      const qs = buildQS(params);
      return apiRequest<MerchantApprovedRedemptionsApiResponse>(
        `/redemptions/approved${qs}`,
        { method: "GET" },
      );
    },

    /**
     * GET /redemptions/rejected — paginated audit feed of rejected
     * redemptions at the caller's merchant.
     */
    async listRejectedRedemptions(
      params: Partial<MerchantAuditFeedFilters> = {},
    ): Promise<MerchantRejectedRedemptionsApiResponse> {
      const qs = buildQS(params);
      return apiRequest<MerchantRejectedRedemptionsApiResponse>(
        `/redemptions/rejected${qs}`,
        { method: "GET" },
      );
    },

    /**
     * POST /redemptions/customers/:customerId/approve — manager-only.
     * Atomic via SQL RPC `redemption_approve`: writes the audit row +
     * moves `pending → approved` + stamps `redemption_approval_staff_id`.
     * 404 if there is no pending request at the merchant.
     */
    async approveRequest(
      customerId: number,
    ): Promise<MerchantRedemptionMutationApiResponse> {
      return apiRequest<MerchantRedemptionMutationApiResponse>(
        `/redemptions/customers/${encodeURIComponent(customerId)}/approve`,
        { method: "POST" },
      );
    },

    /**
     * POST /redemptions/customers/:customerId/reject — manager-only.
     * Atomic via SQL RPC `redemption_reject`: writes the rejected audit
     * row + zeroes `pending_redemption_amount` on every touched credit.
     * 404 if there is no pending request at the merchant.
     */
    async rejectRequest(
      customerId: number,
    ): Promise<MerchantRedemptionMutationApiResponse> {
      return apiRequest<MerchantRedemptionMutationApiResponse>(
        `/redemptions/customers/${encodeURIComponent(customerId)}/reject`,
        { method: "POST" },
      );
    },
  };
}

export const redemptionService = createRedemptionService();
