import { createApiClient, ApiClientConfig } from "./apiService.js";
import {
  CustomerFavoritesListApiResponse,
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
  };
}

export const customerConfigInteractionService =
  createCustomerConfigInteractionService();