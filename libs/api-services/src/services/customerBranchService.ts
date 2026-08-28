import { createApiClient, ApiClientConfig } from "./apiService.js";
import {
  BranchesNearbyApiResponse,
  BranchSearchApiResponse,
  BranchCategoryValues,
} from "../types/api.types.js";

export function createCustomerBranchService(config?: ApiClientConfig) {
  const { apiRequest } = createApiClient(config);

  return {
    async getBranchesByLocation(
      lat: number,
      lng: number,
      category?: BranchCategoryValues[] | null,
      limit?: number,
      offset?: number,
    ): Promise<BranchesNearbyApiResponse> {
      const params = new URLSearchParams();
      params.set("lat", String(lat));
      params.set("lng", String(lng));
      if (category && category.length > 0) {
        category.forEach((c) => params.append("category", c));
      }
      if (limit != null) params.set("limit", String(limit));
      if (offset != null) params.set("offset", String(offset));
      return apiRequest<BranchesNearbyApiResponse>(
        `/branches/nearby?${params.toString()}`,
        { method: "GET" },
      );
    },
    async searchBranchesByLocation(
      lat: number,
      lng: number,
      query: string,
      limit?: number,
      offset?: number,
    ): Promise<BranchSearchApiResponse> {
      const params = new URLSearchParams();
      params.set("lat", String(lat));
      params.set("lng", String(lng));
      params.set("q", query);
      if (limit != null) params.set("limit", String(limit));
      if (offset != null) params.set("offset", String(offset));
      return apiRequest<BranchSearchApiResponse>(
        `/branches/search?${params.toString()}`,
        { method: "GET" },
      );
    },
  };
}

export const customerBranchService = createCustomerBranchService();