import { createApiClient, ApiClientConfig } from "./apiService.js";
import {
  CustomerPendingRequestAmountBody,
  CustomerPendingRequestMutationApiResponse,
} from "../types/api.types.js";

/**
 * Customer-app pending-request service — backs the "Redeem at merchant"
 * flow on the customer mobile app.
 *
 * There is no per-redemption-row CRUD anymore. A redemption request is
 * the implicit set of `customer_credit` rows at the (customer, merchant)
 * pair that have `pending_redemption_amount > 0`. This service exposes
 * one upsert endpoint (POST / PATCH) and one cancel endpoint (DELETE).
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
     * POST /customers/me/merchants/:merchantId/redemptions — create or
     * upsert the customer's pending request at a merchant. Body:
     * `{ amount }`. The server caps the amount at the merchant's
     * `available_total + current_pending`. Atomic via SQL RPC
     * `redemption_fan_out`.
     */
    async upsertMyPendingRequest(params: {
      merchantId: number;
      amount: number;
    }): Promise<CustomerPendingRequestMutationApiResponse> {
      const body: CustomerPendingRequestAmountBody = { amount: params.amount };
      return apiRequest<CustomerPendingRequestMutationApiResponse>(
        `/customers/me/merchants/${encodeURIComponent(params.merchantId)}/redemptions`,
        { method: "POST", body },
      );
    },

    /**
     * PATCH /customers/me/merchants/:merchantId/redemptions — edit the
     * pending request amount. Same RPC as POST (the fan-out is
     * idempotent and re-splits on amount change). We expose PATCH for
     * HTTP-semantic correctness on the edit action.
     */
    async updateMyPendingRequest(params: {
      merchantId: number;
      amount: number;
    }): Promise<CustomerPendingRequestMutationApiResponse> {
      const body: CustomerPendingRequestAmountBody = { amount: params.amount };
      return apiRequest<CustomerPendingRequestMutationApiResponse>(
        `/customers/me/merchants/${encodeURIComponent(params.merchantId)}/redemptions`,
        { method: "PATCH", body },
      );
    },

    /**
     * DELETE /customers/me/merchants/:merchantId/redemptions — cancel
     * the pending request. Idempotent (no-op if no pending). The SQL
     * RPC zeroes `pending_redemption_amount` on every touched credit.
     */
    async cancelMyPendingRequest(
      merchantId: number,
    ): Promise<CustomerPendingRequestMutationApiResponse> {
      return apiRequest<CustomerPendingRequestMutationApiResponse>(
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
