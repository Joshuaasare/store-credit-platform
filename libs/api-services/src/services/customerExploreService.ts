import { createApiClient, ApiClientConfig } from "./apiService.js";
import {
  CustomerExploreBranchesApiResponse,
  CustomerExploreOffersApiResponse,
  CustomerMerchantSearchApiResponse,
} from "../types/api.types.js";

export function createCustomerExploreService(config?: ApiClientConfig) {
  const { apiRequest } = createApiClient(config);

  return {
    async getExploreOffers(): Promise<CustomerExploreOffersApiResponse> {
      return apiRequest<CustomerExploreOffersApiResponse>(
        `/customers/me/explore-offers`,
        { method: "GET" },
      );
    },
    async getExploreBranches(): Promise<CustomerExploreBranchesApiResponse> {
      return apiRequest<CustomerExploreBranchesApiResponse>(
        `/customers/me/explore-branches`,
        { method: "GET" },
      );
    },
    async searchMerchants(query: string): Promise<CustomerMerchantSearchApiResponse> {
      return apiRequest<CustomerMerchantSearchApiResponse>(
        `/customers/me/merchants/search?q=${encodeURIComponent(query)}`,
        { method: "GET" },
      );
    },
  };
}

export const customerExploreService = createCustomerExploreService();
