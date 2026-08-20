import {
  createApiClient,
  ApiClientConfig,
} from "./apiService.js";
import {
  CustomerOtpSendRequest,
  CustomerOtpVerifyRequest,
  CustomerRegisterRequest,
  CustomerRefreshRequest,
  CustomerOtpSendApiResponse,
  CustomerOtpVerifyApiResponse,
  CustomerRegisterApiResponse,
  CustomerRefreshApiResponse,
  CustomerLogoutApiResponse,
  CustomerGetCurrentUserApiResponse,
} from "../types/api.types.js";

export function createCustomerAuthService(config?: ApiClientConfig) {
  const { publicApiRequest, apiRequest } = createApiClient(config);

  return {
    async sendOtp(phone: string): Promise<CustomerOtpSendApiResponse> {
      const body: CustomerOtpSendRequest = { phone };
      return publicApiRequest<CustomerOtpSendApiResponse>(
        "/customer-auth/otp/send",
        { method: "POST", body },
      );
    },

    async verifyOtp(
      phone: string,
      otp: string,
    ): Promise<CustomerOtpVerifyApiResponse> {
      const body: CustomerOtpVerifyRequest = { phone, otp };
      return publicApiRequest<CustomerOtpVerifyApiResponse>(
        "/customer-auth/otp/verify",
        { method: "POST", body },
      );
    },

    async register(
      pendingToken: string,
      surname: string,
      otherNames: string,
    ): Promise<CustomerRegisterApiResponse> {
      const body: CustomerRegisterRequest = {
        pending_token: pendingToken,
        surname,
        other_names: otherNames,
      };
      return publicApiRequest<CustomerRegisterApiResponse>(
        "/customer-auth/register",
        { method: "POST", body },
      );
    },

    async refresh(refreshToken: string): Promise<CustomerRefreshApiResponse> {
      const body: CustomerRefreshRequest = { refresh_token: refreshToken };
      return publicApiRequest<CustomerRefreshApiResponse>(
        "/customer-auth/refresh",
        { method: "POST", body },
      );
    },

    async logout(refreshToken: string): Promise<CustomerLogoutApiResponse> {
      const body: CustomerRefreshRequest = { refresh_token: refreshToken };
      return publicApiRequest<CustomerLogoutApiResponse>(
        "/customer-auth/logout",
        { method: "POST", body },
      );
    },

    async getMe(): Promise<CustomerGetCurrentUserApiResponse> {
      return apiRequest<CustomerGetCurrentUserApiResponse>(
        "/customer-auth/me",
        { method: "GET" },
      );
    },
  };
}

export const customerAuthService = createCustomerAuthService();