import { createApiClient } from "./apiService.js";
import {
  TransactionsQuerystring,
  CreatePurchaseRequest,
  TransactionsApiResponse,
  CreatePurchaseApiResponse,
} from "../types/api.types.js";

/**
 * Transaction service — wraps the Transactions backend endpoints
 * (activity feed + purchase recording). Mirrors the createCustomerService
 * factory pattern. Credit redemption + remaining live on customerService
 * since they operate on a customer's credit row.
 */
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
    /** GET /transactions — paginated, merchant-scoped activity feed. `type` filters the union. */
    async getTransactions(
      params: TransactionsQuerystring,
    ): Promise<TransactionsApiResponse> {
      const qs = buildQS(params as Record<string, unknown>);
      return apiRequest<TransactionsApiResponse>(`/transactions${qs}`, {
        method: "GET",
      });
    },

    /** POST /transactions/purchase — record a purchase (auto-issues matching running credits). */
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