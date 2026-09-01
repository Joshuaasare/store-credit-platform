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
      configId: number,
      payload: UpdateRunningCreditConfigRequest,
    ): Promise<RunningCreditConfigMutationApiResponse> {
      return apiRequest<RunningCreditConfigMutationApiResponse>(
        `/credit-configs/running/${configId}`,
        { method: "PATCH", body: payload },
      );
    },

    async deleteRunningConfig(
      configId: number,
    ): Promise<RunningCreditConfigDeleteApiResponse> {
      return apiRequest<RunningCreditConfigDeleteApiResponse>(
        `/credit-configs/running/${configId}`,
        { method: "DELETE" },
      );
    },

    async toggleRunningConfigActive(
      configId: number,
      isActive: boolean,
    ): Promise<RunningCreditConfigMutationApiResponse> {
      const body: ToggleActiveRequest = { is_active: isActive };
      return apiRequest<RunningCreditConfigMutationApiResponse>(
        `/credit-configs/running/${configId}/active`,
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
      configId: number,
      payload: UpdateFixedCreditConfigRequest,
    ): Promise<FixedCreditConfigMutationApiResponse> {
      return apiRequest<FixedCreditConfigMutationApiResponse>(
        `/credit-configs/fixed/${configId}`,
        { method: "PATCH", body: payload },
      );
    },

    async deleteFixedConfig(
      configId: number,
    ): Promise<FixedCreditConfigDeleteApiResponse> {
      return apiRequest<FixedCreditConfigDeleteApiResponse>(
        `/credit-configs/fixed/${configId}`,
        { method: "DELETE" },
      );
    },

    async toggleFixedConfigActive(
      configId: number,
      isActive: boolean,
    ): Promise<FixedCreditConfigMutationApiResponse> {
      const body: ToggleActiveRequest = { is_active: isActive };
      return apiRequest<FixedCreditConfigMutationApiResponse>(
        `/credit-configs/fixed/${configId}/active`,
        { method: "PATCH", body },
      );
    },
  };
}

export const creditConfigService = createCreditConfigService();