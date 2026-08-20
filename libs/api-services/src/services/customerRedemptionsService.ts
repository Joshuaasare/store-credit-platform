import { createApiClient, ApiClientConfig } from "./apiService.js";
import {
  CustomerApprovedRedemptionApiResponse,
  CustomerMerchantBranchesApiResponse,
  CustomerPendingRedemptionApiResponse,
  CustomerRedemptionCancelApiResponse,
  CustomerRedemptionRequestBody,
  CustomerRedemptionRequestMutationApiResponse,
} from "../types/api.types.js";

export function createCustomerRedemptionsService(
  config?: ApiClientConfig,
) {
  const { apiRequest } = createApiClient(config);

  return {
    async getMyBranches(
      merchantId: number,
    ): Promise<CustomerMerchantBranchesApiResponse> {
      return apiRequest<CustomerMerchantBranchesApiResponse>(
        `/customers/me/merchants/${encodeURIComponent(merchantId)}/branches`,
        { method: "GET" },
      );
    },

    async getMyPendingRequest(
      merchantId: number,
    ): Promise<CustomerPendingRedemptionApiResponse> {
      return apiRequest<CustomerPendingRedemptionApiResponse>(
        `/customers/me/merchants/${encodeURIComponent(merchantId)}/redemptions/pending`,
        { method: "GET" },
      );
    },

    async getMyApprovedRedemptions(
      merchantId: number,
      params: { cursor?: number; limit: number },
    ): Promise<CustomerApprovedRedemptionApiResponse> {
      const search = new URLSearchParams();
      if (params.cursor !== undefined) {
        search.set("cursor", String(params.cursor));
      }
      search.set("limit", String(params.limit));
      const endpoint = `/customers/me/merchants/${encodeURIComponent(
        merchantId,
      )}/redemptions/approved?${search.toString()}`;
      return apiRequest<CustomerApprovedRedemptionApiResponse>(endpoint, {
        method: "GET",
      });
    },

    // 409 when a pending row already exists at this merchant — fall through to PATCH.
    async createMyRedemptionRequest(params: {
      merchantId: number;
      amount: number;
      branchId: number;
    }): Promise<CustomerRedemptionRequestMutationApiResponse> {
      const body: CustomerRedemptionRequestBody = {
        amount: params.amount,
        branchId: params.branchId,
      };
      return apiRequest<CustomerRedemptionRequestMutationApiResponse>(
        `/customers/me/merchants/${encodeURIComponent(params.merchantId)}/redemptions`,
        { method: "POST", body },
      );
    },

    // RPC no-ops when amount+branch are unchanged; otherwise rotates the code + re-runs fan-out.
    async updateMyRedemptionRequest(params: {
      merchantId: number;
      amount: number;
      branchId: number;
    }): Promise<CustomerRedemptionRequestMutationApiResponse> {
      const body: CustomerRedemptionRequestBody = {
        amount: params.amount,
        branchId: params.branchId,
      };
      return apiRequest<CustomerRedemptionRequestMutationApiResponse>(
        `/customers/me/merchants/${encodeURIComponent(params.merchantId)}/redemptions`,
        { method: "PATCH", body },
      );
    },

    async cancelMyRedemptionRequest(
      merchantId: number,
    ): Promise<CustomerRedemptionCancelApiResponse> {
      return apiRequest<CustomerRedemptionCancelApiResponse>(
        `/customers/me/merchants/${encodeURIComponent(merchantId)}/redemptions`,
        { method: "DELETE" },
      );
    },
  };
}

export const customerRedemptionsService = createCustomerRedemptionsService();
