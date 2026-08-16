import { createApiClient, ApiClientConfig } from "./apiService.js";
import {
  CustomerMerchantBranchesApiResponse,
  CustomerPendingRedemptionApiResponse,
  CustomerRedemptionCancelApiResponse,
  CustomerRedemptionRequestBody,
  CustomerRedemptionRequestMutationApiResponse,
} from "../types/api.types.js";

/**
 * Customer-app redemption-request service — backs the "Redeem at merchant"
 * flow on the customer mobile app.
 *
 * Row-based model: there's at most one `customer_credit_redemptions`
 * row per (customer, merchant) pair in the pending state. The row
 * carries a 4-digit code that's shown on the customer's Pending tab
 * and entered by the merchant staff at approve / reject time.
 *
 * Five endpoints:
 *   GET    .../branches             — list non-deleted branches at the merchant
 *   GET    .../redemptions/pending  — fetch the pending audit row + code
 *   POST   .../redemptions          — create (rejects 409 if pending exists)
 *   PATCH  .../redemptions          — edit (404 if no pending; no-op when amount+branch unchanged)
 *   DELETE .../redemptions          — cancel (idempotent: hard-deletes the row + zeroes fan-out)
 *
 * Mutations go through SQL RPCs (`redemption_request_create`,
 * `redemption_request_update`, `redemption_request_cancel`) so the
 * audit-row write + fan-out happen atomically server-side.
 *
 * Mirrors the createCustomerCreditsService factory pattern: takes an
 * optional `ApiClientConfig` so the React Native app can plug in its
 * own access-token source and refresh handler.
 */
export function createCustomerRedemptionsService(
  config?: ApiClientConfig,
) {
  const { apiRequest } = createApiClient(config);

  return {
    /**
     * GET /customers/me/merchants/:merchantId/branches — list non-deleted
     * branches at the merchant. Drives the redemption sheet's branch
     * picker. Customer-token only.
     */
    async getMyBranches(
      merchantId: number,
    ): Promise<CustomerMerchantBranchesApiResponse> {
      return apiRequest<CustomerMerchantBranchesApiResponse>(
        `/customers/me/merchants/${encodeURIComponent(merchantId)}/branches`,
        { method: "GET" },
      );
    },

    /**
     * GET /customers/me/merchants/:merchantId/redemptions/pending — fetch
     * the customer's pending redemption at one merchant, including the
     * 4-digit `redemption_code`. Returns `{ success: true, data: null }`
     * when there's no pending row.
     */
    async getMyPendingRequest(
      merchantId: number,
    ): Promise<CustomerPendingRedemptionApiResponse> {
      return apiRequest<CustomerPendingRedemptionApiResponse>(
        `/customers/me/merchants/${encodeURIComponent(merchantId)}/redemptions/pending`,
        { method: "GET" },
      );
    },

    /**
     * POST /customers/me/merchants/:merchantId/redemptions — create a
     * new pending redemption request. Body: `{ amount, branchId }`.
     * The server generates the 4-digit code via the SQL RPC and
     * returns it in the response.
     *
     * 409 when a pending row already exists at this merchant — the
     * client should fall through to PATCH (or surface the conflict).
     */
    async createMyRedemptionRequest(params: {
      merchantId: number;
      amount: number;
      branchId: number;
    }): Promise<CustomerRedemptionRequestMutationApiResponse> {
      const body: CustomerRedemptionRequestBody = {
        amount: params.amount,
        branchId: params.branchId,
      };
      return apiRequest<CustomerRedemptionRequestMutationApiResponse>(
        `/customers/me/merchants/${encodeURIComponent(params.merchantId)}/redemptions`,
        { method: "POST", body },
      );
    },

    /**
     * PATCH /customers/me/merchants/:merchantId/redemptions — edit an
     * existing pending redemption request. Body: `{ amount, branchId }`.
     * The SQL RPC no-ops when amount + branch are unchanged (code
     * stays), otherwise rotates the code + re-runs the fan-out.
     *
     * 404 when there's no pending row to edit.
     */
    async updateMyRedemptionRequest(params: {
      merchantId: number;
      amount: number;
      branchId: number;
    }): Promise<CustomerRedemptionRequestMutationApiResponse> {
      const body: CustomerRedemptionRequestBody = {
        amount: params.amount,
        branchId: params.branchId,
      };
      return apiRequest<CustomerRedemptionRequestMutationApiResponse>(
        `/customers/me/merchants/${encodeURIComponent(params.merchantId)}/redemptions`,
        { method: "PATCH", body },
      );
    },

    /**
     * DELETE /customers/me/merchants/:merchantId/redemptions — cancel
     * the pending redemption request. Idempotent (no-op if no
     * pending). The SQL RPC hard-deletes the audit row + zeroes the
     * fan-out slices.
     */
    async cancelMyRedemptionRequest(
      merchantId: number,
    ): Promise<CustomerRedemptionCancelApiResponse> {
      return apiRequest<CustomerRedemptionCancelApiResponse>(
        `/customers/me/merchants/${encodeURIComponent(merchantId)}/redemptions`,
        { method: "DELETE" },
      );
    },
  };
}

/**
 * Web-default singleton. The customer mobile app does NOT use this — it
 * calls `createCustomerRedemptionsService(rnConfig)` with its own injected
 * transport. Kept here for parity with the other service singletons.
 */
export const customerRedemptionsService = createCustomerRedemptionsService();
