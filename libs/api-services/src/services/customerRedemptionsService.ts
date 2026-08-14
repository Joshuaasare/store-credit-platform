import { createApiClient, ApiClientConfig } from "./apiService.js";
import {
  CustomerRedemptionsApiResponse,
  CustomerRedemptionCancelResponse,
  CustomerRedemptionStatusFilter,
} from "../types/api.types.js";

/**
 * Customer-app redemptions service — backs the "Credits Redeemed" tab on
 * the merchant detail screen. Mirrors the createCustomerCreditsService
 * factory pattern: takes an optional `ApiClientConfig` so the React Native
 * app can plug in its own access-token source and refresh handler.
 *
 * Two operations:
 *   - `getMyRedemptions({ merchantId, status })` — list every redemption
 *     the logged-in customer has at the given merchant, optionally
 *     narrowed by status. Customer-token only (the backend resolves
 *     `customer_id` from the JWT).
 *   - `cancelMyRedemption(id)` — soft-cancel a pending redemption.
 *     Returns the raw ApiResponse so the caller can branch on
 *     `success` and surface the error string on failure.
 */
export function createCustomerRedemptionsService(
  config?: ApiClientConfig,
) {
  const { apiRequest } = createApiClient(config);

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
     * GET /customers/me/redemptions — paginated-free list (single page —
     * the customer's redemption history at one merchant is bounded).
     * `status` narrows the row set; "all" returns pending + approved +
     * rejected merged.
     */
    async getMyRedemptions(params: {
      merchantId: number;
      status: CustomerRedemptionStatusFilter;
    }): Promise<CustomerRedemptionsApiResponse> {
      const qs = buildQS({
        merchant_id: params.merchantId,
        status: params.status,
      });
      return apiRequest<CustomerRedemptionsApiResponse>(
        `/customers/me/redemptions${qs}`,
        { method: "GET" },
      );
    },

    /**
     * DELETE /customers/me/redemptions/:id — soft-cancel a pending
     * redemption. Returns the raw ApiResponse; 409 if the redemption is
     * already in a terminal state, 403 if it belongs to another customer,
     * 404 if it doesn't exist.
     */
    async cancelMyRedemption(
      id: number,
    ): Promise<CustomerRedemptionCancelResponse | { success: false; error: string }> {
      return apiRequest<
        | CustomerRedemptionCancelResponse
        | { success: false; error: string }
      >(`/customers/me/redemptions/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  };
}

/**
 * Web-default singleton. The customer mobile app does NOT use this — it
 * calls `createCustomerRedemptionsService(rnConfig)` with its own injected
 * transport. Kept here for parity with the other service singletons.
 */
export const customerRedemptionsService = createCustomerRedemptionsService();
