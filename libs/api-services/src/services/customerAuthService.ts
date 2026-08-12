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

/**
 * Customer-app auth service — wraps the `/customer-auth/*` backend
 * endpoints. Mirrors the createAuthService / createStaffService factory
 * pattern but takes an optional injected `ApiClientConfig` so the React
 * Native app can plug in its own access-token source (zustand store) and
 * refresh handler (expo-secure-store + `/customer-auth/refresh`).
 *
 * Web app: `createCustomerAuthService()` with no args uses the web default
 * client (the web app doesn't currently call these endpoints — they're for
 * the customer mobile app — but the path exists for future admin tooling).
 */
export function createCustomerAuthService(config?: ApiClientConfig) {
  const { publicApiRequest, apiRequest } = createApiClient(config);

  return {
    /** POST /customer-auth/otp/send — always sends an OTP (no anti-enumeration). */
    async sendOtp(phone: string): Promise<CustomerOtpSendApiResponse> {
      const body: CustomerOtpSendRequest = { phone };
      return publicApiRequest<CustomerOtpSendApiResponse>(
        "/customer-auth/otp/send",
        { method: "POST", body },
      );
    },

    /**
     * POST /customer-auth/otp/verify — discriminated response:
     * `status: "logged_in"` carries the full session; `status: "needs_profile"`
     * carries a `pending_token` for the register step.
     */
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

    /**
     * POST /customer-auth/register — consumes the pending_token (carrying the
     * OTP-verified phone) + submitted name, returns the real session.
     */
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

    /**
     * POST /customer-auth/refresh — rotates the refresh token from the JSON
     * body. The RN app reads the refresh token from expo-secure-store.
     */
    async refresh(refreshToken: string): Promise<CustomerRefreshApiResponse> {
      const body: CustomerRefreshRequest = { refresh_token: refreshToken };
      return publicApiRequest<CustomerRefreshApiResponse>(
        "/customer-auth/refresh",
        { method: "POST", body },
      );
    },

    /** POST /customer-auth/logout — revokes the refresh token from the JSON body. */
    async logout(refreshToken: string): Promise<CustomerLogoutApiResponse> {
      const body: CustomerRefreshRequest = { refresh_token: refreshToken };
      return publicApiRequest<CustomerLogoutApiResponse>(
        "/customer-auth/logout",
        { method: "POST", body },
      );
    },

    /** GET /customer-auth/me — current customer (customer-token only). */
    async getMe(): Promise<CustomerGetCurrentUserApiResponse> {
      return apiRequest<CustomerGetCurrentUserApiResponse>(
        "/customer-auth/me",
        { method: "GET" },
      );
    },
  };
}

/**
 * Web-default singleton. The customer mobile app does NOT use this — it
 * calls `createCustomerAuthService(rnConfig)` with its own injected transport.
 * Kept here for parity with the other service singletons and for any future
 * staff-web tooling that needs to call customer-auth endpoints.
 */
export const customerAuthService = createCustomerAuthService();