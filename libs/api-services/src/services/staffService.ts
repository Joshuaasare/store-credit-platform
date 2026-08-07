import { createApiClient } from "./apiService.js";
import {
  StaffListQuerystring,
  CreateStaffRequest,
  UpdateStaffRequest,
  SetStaffAccessRequest,
  StaffListApiResponse,
  StaffMutationApiResponse,
  StaffAccessApiResponse,
  StaffDeleteApiResponse,
} from "../types/api.types.js";

/**
 * Staff service — wraps the /staff backend endpoints. Mirrors the
 * createCustomerService / createAuthService factory pattern.
 */
export function createStaffService() {
  const { apiRequest } = createApiClient();

  function buildQS(params: Record<string, unknown>): string {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(params)) {
      if (v == null || v === "") continue;
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
    }
    return parts.length ? `?${parts.join("&")}` : "";
  }

  return {
    /** GET /staff — manager-only, merchant-scoped staff directory. */
    async listStaff(
      params: StaffListQuerystring,
    ): Promise<StaffListApiResponse> {
      const qs = buildQS(params as Record<string, unknown>);
      return apiRequest<StaffListApiResponse>(`/staff${qs}`, { method: "GET" });
    },

    /**
     * POST /staff — create a new staff member (or auto-restore a
     * soft-deleted phone — the backend service handles both paths).
     */
    async createStaff(
      payload: CreateStaffRequest,
    ): Promise<StaffMutationApiResponse> {
      return apiRequest<StaffMutationApiResponse>("/staff", {
        method: "POST",
        body: payload,
      });
    },

    /** PATCH /staff/:userId — full-replace edit (name, phone, role, branch, access, address, notes). */
    async updateStaff(
      userId: string,
      payload: UpdateStaffRequest,
    ): Promise<StaffMutationApiResponse> {
      return apiRequest<StaffMutationApiResponse>(
        `/staff/${encodeURIComponent(userId)}`,
        { method: "PATCH", body: payload },
      );
    },

    /** PATCH /staff/:userId/access — toggle access_granted. */
    async setStaffAccess(
      userId: string,
      payload: SetStaffAccessRequest,
    ): Promise<StaffAccessApiResponse> {
      return apiRequest<StaffAccessApiResponse>(
        `/staff/${encodeURIComponent(userId)}/access`,
        { method: "PATCH", body: payload },
      );
    },

    /** DELETE /staff/:userId — soft delete (tombstones users + linked staff + role rows). */
    async deleteStaff(userId: string): Promise<StaffDeleteApiResponse> {
      return apiRequest<StaffDeleteApiResponse>(
        `/staff/${encodeURIComponent(userId)}`,
        { method: "DELETE" },
      );
    },
  };
}

export const staffService = createStaffService();