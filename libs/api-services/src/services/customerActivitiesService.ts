import { createApiClient, ApiClientConfig } from "./apiService.js";
import { CustomerActivitiesApiResponse } from "../types/api.types.js";

/**
 * Customer-app activities service — wraps the `/customers/me/transactions`
 * backend endpoint. Mirrors the `createCustomerCreditsService` factory
 * pattern: takes an optional injected `ApiClientConfig` so the React Native
 * app can plug in its own access-token source (zustand store) and refresh
 * handler. The web app default singleton is kept for parity / future
 * staff tooling, but the customer mobile app instantiates its own.
 */
export function createCustomerActivitiesService(config?: ApiClientConfig) {
  const { apiRequest } = createApiClient(config);

  return {
    /**
     * GET /customers/me/transactions — the logged-in customer's recent
     * activity feed (issuances + approved redemptions), most recent first.
     * Customer-token only; the backend resolves `customer_id` from the JWT.
     *
     * Pass `cursor` (the previous page's `nextCursor`) to fetch the next
     * page; pass `limit` to override the default page size (server clamps
     * to [1, 50], default 20). Omit both for the first page.
     */
    async list(params: {
      cursor?: number | null;
      limit?: number;
    } = {}): Promise<CustomerActivitiesApiResponse> {
      const search = new URLSearchParams();
      if (params.cursor != null) {
        search.set("cursor", String(params.cursor));
      }
      if (params.limit != null) {
        search.set("limit", String(params.limit));
      }
      const query = search.toString();
      const endpoint = query
        ? `/customers/me/transactions?${query}`
        : "/customers/me/transactions";
      return apiRequest<CustomerActivitiesApiResponse>(endpoint, {
        method: "GET",
      });
    },
  };
}

/**
 * Web-default singleton. The customer mobile app does NOT use this — it
 * calls `createCustomerActivitiesService(rnConfig)` with its own injected
 * transport. Kept here for parity with the other service singletons.
 */
export const customerActivitiesService = createCustomerActivitiesService();
