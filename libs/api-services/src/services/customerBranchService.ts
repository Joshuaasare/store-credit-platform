import { createApiClient, ApiClientConfig } from "./apiService.js";
import { BranchesByLocationApiResponse } from "../types/api.types.js";

export function createCustomerBranchService(config?: ApiClientConfig) {
  const { apiRequest } = createApiClient(config);

  return {
    async getBranchesByLocation(
      lat: number,
      lng: number,
    ): Promise<BranchesByLocationApiResponse> {
      return apiRequest<BranchesByLocationApiResponse>(
        `/branches/nearby?lat=${lat}&lng=${lng}`,
        { method: "GET" },
      );
    },
    async searchBranchesByLocation(
      lat: number,
      lng: number,
      query: string,
    ): Promise<BranchesByLocationApiResponse> {
      return apiRequest<BranchesByLocationApiResponse>(
        `/branches/search?lat=${lat}&lng=${lng}&q=${encodeURIComponent(query)}`,
        { method: "GET" },
      );
    },
  };
}

export const customerBranchService = createCustomerBranchService();