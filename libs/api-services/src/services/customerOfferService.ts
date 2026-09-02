import { createApiClient, ApiClientConfig } from "./apiService.js";
import {
  NearbyOffersApiResponse,
  OfferBranchesApiResponse,
} from "../types/api.types.js";

export type OfferConfigType = "running" | "fixed";

export function createCustomerOfferService(config?: ApiClientConfig) {
  const { apiRequest } = createApiClient(config);

  return {
    async getNearbyOffers(
      lat: number,
      lng: number,
      limit?: number,
      offset?: number,
    ): Promise<NearbyOffersApiResponse> {
      const search = new URLSearchParams();
      search.set("lat", String(lat));
      search.set("lng", String(lng));
      if (limit != null) search.set("limit", String(limit));
      if (offset != null) search.set("offset", String(offset));
      return apiRequest<NearbyOffersApiResponse>(
        `/customers/me/offers/nearby?${search.toString()}`,
        { method: "GET" },
      );
    },

    async getOfferBranches(params: {
      configType: OfferConfigType;
      configId: number;
      lat: number | null;
      lng: number | null;
    }): Promise<OfferBranchesApiResponse> {
      const search = new URLSearchParams();
      if (params.lat != null) search.set("lat", String(params.lat));
      if (params.lng != null) search.set("lng", String(params.lng));
      const query = search.toString();
      const endpoint = `/customers/me/offers/${params.configType}/${params.configId}/branches${
        query ? `?${query}` : ""
      }`;
      return apiRequest<OfferBranchesApiResponse>(endpoint, { method: "GET" });
    },
  };
}

export const customerOfferService = createCustomerOfferService();