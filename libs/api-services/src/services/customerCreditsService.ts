import { createApiClient, ApiClientConfig } from "./apiService.js";
import { CustomerCreditsApiResponse } from "../types/api.types.js";

/**
 * Customer-app credits service — wraps the `/customers/me/credits` backend
 * endpoint. Mirrors the createCustomerAuthService factory pattern: takes an
 * optional injected `ApiClientConfig` so the React Native app can plug in its
 * own access-token source (zustand store) and refresh handler. The web app
 * `createCustomerCreditsService()` singleton is kept for parity / future
 * staff tooling, but the customer mobile app instantiates its own.
 */
export function createCustomerCreditsService(config?: ApiClientConfig) {
  const { apiRequest } = createApiClient(config);

  return {
    /**
     * GET /customers/me/credits — the logged-in customer's credit rows
     * split into `live` and `expired` arrays. Customer-token only; the
     * backend resolves `customer_id` from the JWT.
     */
    async getMyCredits(): Promise<CustomerCreditsApiResponse> {
      return apiRequest<CustomerCreditsApiResponse>(
        "/customers/me/credits",
        { method: "GET" },
      );
    },
  };
}

/**
 * Web-default singleton. The customer mobile app does NOT use this — it
 * calls `createCustomerCreditsService(rnConfig)` with its own injected
 * transport. Kept here for parity with the other service singletons.
 */
export const customerCreditsService = createCustomerCreditsService();