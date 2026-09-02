import { createApiClient } from "./apiService.js";
import {
  LeaderboardQuerystring,
  LeaderboardApiResponse,
  LeaderboardStatsApiResponse,
  CustomerListQuerystring,
  CustomerListApiResponse,
  CustomerDetailApiResponse,
  GlobalCustomerSearchApiResponse,
} from "../types/api.types.js";

export function createCustomerService() {
  const { apiRequest } = createApiClient();

  function buildQS(params: Record<string, unknown>): string {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(params)) {
      if (v == null) continue;
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
    return parts.length ? `?${parts.join("&")}` : "";
  }

  return {
    async listCustomers(
      params: CustomerListQuerystring,
    ): Promise<CustomerListApiResponse> {
      const qs = buildQS(params as Record<string, unknown>);
      return apiRequest<CustomerListApiResponse>(`/customers${qs}`, {
        method: "GET",
      });
    },

    async getCustomerDetail(
      customerId: number,
    ): Promise<CustomerDetailApiResponse> {
      return apiRequest<CustomerDetailApiResponse>(
        `/customers/${encodeURIComponent(customerId)}`,
        { method: "GET" },
      );
    },

    async getLeaderboard(
      params: LeaderboardQuerystring,
    ): Promise<LeaderboardApiResponse> {
      const qs = buildQS(params as Record<string, unknown>);
      return apiRequest<LeaderboardApiResponse>(`/customers/leaderboard${qs}`, {
        method: "GET",
      });
    },

    async getLeaderboardStats(
      params: Omit<LeaderboardQuerystring, "sort" | "limit" | "offset">,
    ): Promise<LeaderboardStatsApiResponse> {
      const qs = buildQS(params as Record<string, unknown>);
      return apiRequest<LeaderboardStatsApiResponse>(
        `/customers/leaderboard-stats${qs}`,
        { method: "GET" },
      );
    },

    async globalSearchByPhone(
      phone: string,
      limit?: number,
    ): Promise<GlobalCustomerSearchApiResponse> {
      return apiRequest<GlobalCustomerSearchApiResponse>(
        `/customers/global-search${buildQS({ phone, limit })}`,
        { method: "GET" },
      );
    },
  };
}

export const customerService = createCustomerService();
