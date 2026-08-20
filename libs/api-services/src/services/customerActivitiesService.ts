import { createApiClient, ApiClientConfig } from "./apiService.js";
import { CustomerActivitiesApiResponse } from "../types/api.types.js";

export function createCustomerActivitiesService(config?: ApiClientConfig) {
  const { apiRequest } = createApiClient(config);

  return {
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

export const customerActivitiesService = createCustomerActivitiesService();
