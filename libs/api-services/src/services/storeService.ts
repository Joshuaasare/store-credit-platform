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

/**
 * Store service — wraps the My Store backend endpoints.
 * Mirrors the createAuthService pattern: factory returns the API methods,
 * all authed via apiRequest (which handles 401 silent refresh).
 */
export function createStoreService() {
  const { apiRequest } = createApiClient();

  return {
    /** GET /merchants/me — merchant + stats + pool (or null if no merchant). */
    async getMyStore(): Promise<MerchantMeApiResponse> {
      return apiRequest<MerchantMeApiResponse>("/merchants/me", {
        method: "GET",
      });
    },

    /** GET /branches — list of branches with per-branch aggregates. */
    async getMyBranches(): Promise<BranchListApiResponse> {
      return apiRequest<BranchListApiResponse>("/branches", {
        method: "GET",
      });
    },

    /** POST /branches — manager-only. */
    async createBranch(
      payload: CreateBranchRequest,
    ): Promise<BranchMutationApiResponse> {
      return apiRequest<BranchMutationApiResponse>("/branches", {
        method: "POST",
        body: payload,
      });
    },

    /** PATCH /branches/:id — manager-only. */
    async updateBranch(
      id: number,
      payload: UpdateBranchRequest,
    ): Promise<BranchMutationApiResponse> {
      return apiRequest<BranchMutationApiResponse>(`/branches/${id}`, {
        method: "PATCH",
        body: payload,
      });
    },

    /** PATCH /merchants/me — manager-only. */
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