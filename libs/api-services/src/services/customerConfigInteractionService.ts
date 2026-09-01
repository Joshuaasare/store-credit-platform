import { createApiClient, ApiClientConfig } from "./apiService.js";
import {
  ClickMutationApiResponse,
  CustomerFavoritesListApiResponse,
  CustomerFavoritesPageApiResponse,
  FavoriteMutationApiResponse,
} from "../types/api.types.js";

export type FavoriteConfigType = "running" | "fixed";

export function createCustomerConfigInteractionService(
  config?: ApiClientConfig,
) {
  const { apiRequest } = createApiClient(config);

  return {
    async listFavorites(): Promise<CustomerFavoritesListApiResponse> {
      return apiRequest<CustomerFavoritesListApiResponse>(
        `/customers/me/credit-configs/favorites`,
        { method: "GET" },
      );
    },

    async listFavoritesPage(
      params: { limit?: number; offset?: number } = {},
    ): Promise<CustomerFavoritesPageApiResponse> {
      const search = new URLSearchParams();
      if (params.limit != null) search.set("limit", String(params.limit));
      if (params.offset != null) search.set("offset", String(params.offset));
      const query = search.toString();
      const endpoint = query
        ? `/customers/me/credit-configs/favorites/page?${query}`
        : "/customers/me/credit-configs/favorites/page";
      return apiRequest<CustomerFavoritesPageApiResponse>(endpoint, {
        method: "GET",
      });
    },

    async addFavorite(params: {
      configType: FavoriteConfigType;
      configId: number;
    }): Promise<FavoriteMutationApiResponse> {
      return apiRequest<FavoriteMutationApiResponse>(
        `/customers/me/credit-configs/${params.configType}/${params.configId}/favorite`,
        { method: "POST" },
      );
    },

    async removeFavorite(params: {
      configType: FavoriteConfigType;
      configId: number;
    }): Promise<FavoriteMutationApiResponse> {
      return apiRequest<FavoriteMutationApiResponse>(
        `/customers/me/credit-configs/${params.configType}/${params.configId}/favorite`,
        { method: "DELETE" },
      );
    },

    async recordClick(params: {
      configType: FavoriteConfigType;
      configId: number;
    }): Promise<ClickMutationApiResponse> {
      return apiRequest<ClickMutationApiResponse>(
        `/customers/me/credit-configs/${params.configType}/${params.configId}/click`,
        { method: "POST" },
      );
    },
  };
}

export const customerConfigInteractionService =
  createCustomerConfigInteractionService();