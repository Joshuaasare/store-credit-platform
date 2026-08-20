import { createApiClient } from "./apiService.js";
import {
  TransactionsQuerystring,
  CreatePurchaseRequest,
  TransactionsApiResponse,
  CreatePurchaseApiResponse,
} from "../types/api.types.js";

export function createTransactionService() {
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
    async getTransactions(
      params: TransactionsQuerystring,
    ): Promise<TransactionsApiResponse> {
      const qs = buildQS(params as Record<string, unknown>);
      return apiRequest<TransactionsApiResponse>(`/transactions${qs}`, {
        method: "GET",
      });
    },

    async createPurchase(
      payload: CreatePurchaseRequest,
    ): Promise<CreatePurchaseApiResponse> {
      return apiRequest<CreatePurchaseApiResponse>("/transactions/purchase", {
        method: "POST",
        body: payload,
      });
    },
  };
}

export const transactionService = createTransactionService();