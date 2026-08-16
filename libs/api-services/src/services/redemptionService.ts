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

/**
 * Merchant-side redemption service — backs the Redemptions page on the
 * webapp. Mirrors the createCustomerService factory pattern.
 *
 * Three list views (Pending, Approved, Rejected) and two mutations
 * (Approve, Reject). Pending is the `customer_credit_redemptions` audit
 * row WHERE approved_at IS NULL AND rejected_at IS NULL AND deleted_at
 * IS NULL — exactly one row per (customer, merchant) pair in pending.
 *
 * Approve / Reject take the customer-shown 4-digit `redemption_code`
 * + the audit row's `redemption_id` in the body — the SQL RPC verifies
 * the code matches the pending audit row at this merchant before
 * stamping approved_at / rejected_at. Atomic single-call RPCs.
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
     * caller's merchant. One row per (customer, merchant) pair that has
     * a `customer_credit_redemptions` row in the pending state. The
     * `redemption_code` is INTENTIONALLY NOT returned — the staff
     * member reads it from the customer's screen and types it into the
     * approve dialog.
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
     * Body: `{ redemption_code, redemption_id }`. The 4-digit code is
     * what the customer shows on the Pending tab; the SQL RPC verifies
     * it matches the pending audit row at this merchant before
     * stamping `approved_at` + `approved_by_staff_id` + moving
     * `pending → approved` + stamping `redemption_approval_staff_id`.
     *
     * 404 when there's no pending request at the merchant. 400 when
     * the supplied code does not match (the SQL RPC raises P0001).
     */
    async approveRequest(
      customerId: number,
      body: MerchantRedemptionActionBody,
    ): Promise<MerchantRedemptionMutationApiResponse> {
      return apiRequest<MerchantRedemptionMutationApiResponse>(
        `/redemptions/customers/${encodeURIComponent(customerId)}/approve`,
        { method: "POST", body },
      );
    },

    /**
     * POST /redemptions/customers/:customerId/reject — manager-only.
     * Body: `{ redemption_code, redemption_id }`. Atomic via SQL RPC
     * `redemption_reject`: verifies the code, stamps `rejected_at` on
     * the audit row, zeroes `pending_redemption_amount` on every
     * touched credit.
     *
     * 404 when there's no pending request at the merchant. 400 when
     * the supplied code does not match.
     */
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
