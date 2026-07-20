import { createApiClient } from "./apiService.js";
import {
  CreateRunningCreditConfigRequest,
  UpdateRunningCreditConfigRequest,
  RunningCreditConfigListApiResponse,
  RunningCreditConfigMutationApiResponse,
  ToggleActiveRequest,
  CreateFixedCreditConfigRequest,
  UpdateFixedCreditConfigRequest,
  FixedCreditConfigListApiResponse,
  FixedCreditConfigMutationApiResponse,
} from "../types/api.types.js";

/**
 * Credit Config service — wraps the credit-configs backend endpoints.
 * All routes are manager-writable; reads are available to any authed user.
 */
export function createCreditConfigService() {
  const { apiRequest } = createApiClient();

  return {
    /** GET /credit-configs/running — grouped list. */
    async listRunningConfigs(): Promise<RunningCreditConfigListApiResponse> {
      return apiRequest<RunningCreditConfigListApiResponse>(
        "/credit-configs/running",
        { method: "GET" },
      );
    },

    /** POST /credit-configs/running — create a multi-branch config. */
    async createRunningConfig(
      payload: CreateRunningCreditConfigRequest,
    ): Promise<RunningCreditConfigMutationApiResponse> {
      return apiRequest<RunningCreditConfigMutationApiResponse>(
        "/credit-configs/running",
        { method: "POST", body: payload },
      );
    },

    /** PATCH /credit-configs/running/:configGroupId — full-replace update. */
    async updateRunningConfig(
      configGroupId: string,
      payload: UpdateRunningCreditConfigRequest,
    ): Promise<RunningCreditConfigMutationApiResponse> {
      return apiRequest<RunningCreditConfigMutationApiResponse>(
        `/credit-configs/running/${configGroupId}`,
        { method: "PATCH", body: payload },
      );
    },

    /** DELETE /credit-configs/running/:configGroupId — hard-delete group. */
    async deleteRunningConfig(
      configGroupId: string,
    ): Promise<RunningCreditConfigMutationApiResponse> {
      return apiRequest<RunningCreditConfigMutationApiResponse>(
        `/credit-configs/running/${configGroupId}`,
        { method: "DELETE" },
      );
    },

    /** PATCH /credit-configs/running/:configGroupId/active — toggle active. */
    async toggleRunningConfigActive(
      configGroupId: string,
      isActive: boolean,
    ): Promise<RunningCreditConfigMutationApiResponse> {
      const body: ToggleActiveRequest = { is_active: isActive };
      return apiRequest<RunningCreditConfigMutationApiResponse>(
        `/credit-configs/running/${configGroupId}/active`,
        { method: "PATCH", body },
      );
    },

    /** GET /credit-configs/fixed — grouped list. */
    async listFixedConfigs(): Promise<FixedCreditConfigListApiResponse> {
      return apiRequest<FixedCreditConfigListApiResponse>(
        "/credit-configs/fixed",
        { method: "GET" },
      );
    },

    /** POST /credit-configs/fixed — create a multi-branch fixed promo. */
    async createFixedConfig(
      payload: CreateFixedCreditConfigRequest,
    ): Promise<FixedCreditConfigMutationApiResponse> {
      return apiRequest<FixedCreditConfigMutationApiResponse>(
        "/credit-configs/fixed",
        { method: "POST", body: payload },
      );
    },

    /** PATCH /credit-configs/fixed/:configGroupId — full-replace update. */
    async updateFixedConfig(
      configGroupId: string,
      payload: UpdateFixedCreditConfigRequest,
    ): Promise<FixedCreditConfigMutationApiResponse> {
      return apiRequest<FixedCreditConfigMutationApiResponse>(
        `/credit-configs/fixed/${configGroupId}`,
        { method: "PATCH", body: payload },
      );
    },

    /** DELETE /credit-configs/fixed/:configGroupId — hard-delete group. */
    async deleteFixedConfig(
      configGroupId: string,
    ): Promise<FixedCreditConfigMutationApiResponse> {
      return apiRequest<FixedCreditConfigMutationApiResponse>(
        `/credit-configs/fixed/${configGroupId}`,
        { method: "DELETE" },
      );
    },

    /** PATCH /credit-configs/fixed/:configGroupId/active — toggle active. */
    async toggleFixedConfigActive(
      configGroupId: string,
      isActive: boolean,
    ): Promise<FixedCreditConfigMutationApiResponse> {
      const body: ToggleActiveRequest = { is_active: isActive };
      return apiRequest<FixedCreditConfigMutationApiResponse>(
        `/credit-configs/fixed/${configGroupId}/active`,
        { method: "PATCH", body },
      );
    },
  };
}

export const creditConfigService = createCreditConfigService();