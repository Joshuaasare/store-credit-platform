import { createApiClient, ApiClientConfig } from "./apiService.js";
import { NearbyOffersApiResponse } from "../types/api.types.js";

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
  };
}

export const customerOfferService = createCustomerOfferService();