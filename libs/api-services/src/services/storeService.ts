import { createApiClient } from "./apiService.js";
import {
  CreateBranchRequest,
  UpdateBranchRequest,
  UpdateMerchantRequest,
  MerchantMeApiResponse,
  BranchListApiResponse,
  BranchMutationApiResponse,
  MerchantMutationApiResponse,
} from "../types/api.types.js";

export function createStoreService() {
  const { apiRequest } = createApiClient();

  return {
    async getMyStore(): Promise<MerchantMeApiResponse> {
      return apiRequest<MerchantMeApiResponse>("/merchants/me", {
        method: "GET",
      });
    },

    async getMyBranches(): Promise<BranchListApiResponse> {
      return apiRequest<BranchListApiResponse>("/branches", {
        method: "GET",
      });
    },

    async createBranch(
      payload: CreateBranchRequest,
    ): Promise<BranchMutationApiResponse> {
      return apiRequest<BranchMutationApiResponse>("/branches", {
        method: "POST",
        body: payload,
      });
    },

    async updateBranch(
      id: number,
      payload: UpdateBranchRequest,
    ): Promise<BranchMutationApiResponse> {
      return apiRequest<BranchMutationApiResponse>(`/branches/${id}`, {
        method: "PATCH",
        body: payload,
      });
    },

    async updateMyMerchant(
      payload: UpdateMerchantRequest,
    ): Promise<MerchantMutationApiResponse> {
      return apiRequest<MerchantMutationApiResponse>("/merchants/me", {
        method: "PATCH",
        body: payload,
      });
    },
  };
}