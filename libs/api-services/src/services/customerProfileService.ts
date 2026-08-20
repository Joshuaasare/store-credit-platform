import { createApiClient, ApiClientConfig } from "./apiService.js";
import {
  CustomerPhoneChangeSendOtpApiResponse,
  CustomerPhoneChangeVerifyApiResponse,
  CustomerProfileUpdateApiResponse,
} from "../types/api.types.js";

/**
 * Customer-app profile-edit service — backs the EditProfile screen on
 * the customer mobile app.
 *
 * Three endpoints, all customer-token only (`customerId` is read from
 * the JWT on the backend):
 *   POST   /customers/me/phone-change/send-otp   — send an OTP to a
 *     candidate new phone (no-op + uniqueness + rate-limit guards).
 *   POST   /customers/me/phone-change/verify     — verify the OTP and
 *     receive a 10-minute phone-verified JWT.
 *   PATCH  /customers/me/profile                 — commit surname /
 *     other_names / avatar_url / phone in one request. When `newPhone`
 *     is present, `phoneVerifiedToken` must accompany it.
 *
 * Avatar uploads go through the generic `POST /storage/upload-url`
 * endpoint (same path the webapp uses for vendor logos) — the
 * customer-app calls `storage.uploadFile()` from `api-services`, then
 * PATCHes `avatar_url` here. No customer-specific avatar-upload
 * endpoint.
 *
 * Mirrors the `createCustomerRedemptionsService` factory pattern: takes
 * an optional `ApiClientConfig` so the React Native app can plug in its
 * own access-token source and refresh handler.
 */
export function createCustomerProfileService(config?: ApiClientConfig) {
  const { apiRequest } = createApiClient(config);

  return {
    /**
     * POST /customers/me/phone-change/send-otp — send an OTP to a
     * candidate new phone. Backend guards: no-op (same as current),
     * uniqueness clash, rate limit. Returns `{ message }` on success.
     */
    async sendPhoneChangeOtp(params: {
      newPhone: string;
    }): Promise<CustomerPhoneChangeSendOtpApiResponse> {
      return apiRequest<CustomerPhoneChangeSendOtpApiResponse>(
        `/customers/me/phone-change/send-otp`,
        { method: "POST", body: { newPhone: params.newPhone } },
      );
    },

    /**
     * POST /customers/me/phone-change/verify — verify the OTP the
     * customer entered. Returns a 10-minute `phoneVerifiedToken` the
     * app includes in the subsequent `updateProfile` call. Same
     * MAX_OTP_ATTEMPTS=5 logic as `/customer-auth/verify-otp` — error
     * messages read "Invalid code. N attempts remaining" and "Too
     * many failed attempts. Please request a new code." at 0.
     */
    async verifyPhoneChangeOtp(params: {
      newPhone: string;
      otp: string;
    }): Promise<CustomerPhoneChangeVerifyApiResponse> {
      return apiRequest<CustomerPhoneChangeVerifyApiResponse>(
        `/customers/me/phone-change/verify`,
        {
          method: "POST",
          body: { newPhone: params.newPhone, otp: params.otp },
        },
      );
    },

    /**
     * PATCH /customers/me/profile — commit a profile update. All
     * fields optional. When `newPhone` is present, `phoneVerifiedToken`
     * must accompany it (issued by `verifyPhoneChangeOtp`). Returns
     * the full post-update `CustomerAuthUser` so the customer-app can
     * call `setUser` on the auth store and re-render every surface
     * that reads `user`.
     */
    async updateProfile(params: {
      surname?: string;
      other_names?: string;
      avatar_url?: string | null;
      newPhone?: string;
      phoneVerifiedToken?: string;
    }): Promise<CustomerProfileUpdateApiResponse> {
      return apiRequest<CustomerProfileUpdateApiResponse>(
        `/customers/me/profile`,
        { method: "PATCH", body: params },
      );
    },
  };
}

/**
 * Web-default singleton. The customer mobile app does NOT use this — it
 * calls `createCustomerProfileService(rnConfig)` with its own injected
 * transport. Kept here for parity with the other service singletons.
 */
export const customerProfileService = createCustomerProfileService();