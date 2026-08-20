import { createApiClient, ApiClientConfig } from "./apiService.js";
import { CustomerCreditsApiResponse } from "../types/api.types.js";

export function createCustomerCreditsService(config?: ApiClientConfig) {
  const { apiRequest } = createApiClient(config);

  return {
    async getMyCredits(): Promise<CustomerCreditsApiResponse> {
      return apiRequest<CustomerCreditsApiResponse>(
        "/customers/me/credits",
        { method: "GET" },
      );
    },
  };
}

export const customerCreditsService = createCustomerCreditsService();