import { createApiClient } from "./apiService.js";
import {
  CreateRunningCreditConfigRequest,
  UpdateRunningCreditConfigRequest,
  RunningCreditConfigListApiResponse,
  RunningCreditConfigMutationApiResponse,
  RunningCreditConfigDeleteApiResponse,
  ToggleActiveRequest,
  CreateFixedCreditConfigRequest,
  UpdateFixedCreditConfigRequest,
  FixedCreditConfigListApiResponse,
  FixedCreditConfigMutationApiResponse,
  FixedCreditConfigDeleteApiResponse,
} from "../types/api.types.js";

export function createCreditConfigService() {
  const { apiRequest } = createApiClient();

  return {
    async listRunningConfigs(): Promise<RunningCreditConfigListApiResponse> {
      return apiRequest<RunningCreditConfigListApiResponse>(
        "/credit-configs/running",
        { method: "GET" },
      );
    },

    async createRunningConfig(
      payload: CreateRunningCreditConfigRequest,
    ): Promise<RunningCreditConfigMutationApiResponse> {
      return apiRequest<RunningCreditConfigMutationApiResponse>(
        "/credit-configs/running",
        { method: "POST", body: payload },
      );
    },

    async updateRunningConfig(
      configGroupId: string,
      payload: UpdateRunningCreditConfigRequest,
    ): Promise<RunningCreditConfigMutationApiResponse> {
      return apiRequest<RunningCreditConfigMutationApiResponse>(
        `/credit-configs/running/${configGroupId}`,
        { method: "PATCH", body: payload },
      );
    },

    async deleteRunningConfig(
      configGroupId: string,
    ): Promise<RunningCreditConfigDeleteApiResponse> {
      return apiRequest<RunningCreditConfigDeleteApiResponse>(
        `/credit-configs/running/${configGroupId}`,
        { method: "DELETE" },
      );
    },

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

    async listFixedConfigs(): Promise<FixedCreditConfigListApiResponse> {
      return apiRequest<FixedCreditConfigListApiResponse>(
        "/credit-configs/fixed",
        { method: "GET" },
      );
    },

    async createFixedConfig(
      payload: CreateFixedCreditConfigRequest,
    ): Promise<FixedCreditConfigMutationApiResponse> {
      return apiRequest<FixedCreditConfigMutationApiResponse>(
        "/credit-configs/fixed",
        { method: "POST", body: payload },
      );
    },

    async updateFixedConfig(
      configGroupId: string,
      payload: UpdateFixedCreditConfigRequest,
    ): Promise<FixedCreditConfigMutationApiResponse> {
      return apiRequest<FixedCreditConfigMutationApiResponse>(
        `/credit-configs/fixed/${configGroupId}`,
        { method: "PATCH", body: payload },
      );
    },

    async deleteFixedConfig(
      configGroupId: string,
    ): Promise<FixedCreditConfigDeleteApiResponse> {
      return apiRequest<FixedCreditConfigDeleteApiResponse>(
        `/credit-configs/fixed/${configGroupId}`,
        { method: "DELETE" },
      );
    },

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