import { createApiClient, ApiClientConfig } from "./apiService.js";
import {
  CustomerPhoneChangeSendOtpApiResponse,
  CustomerPhoneChangeVerifyApiResponse,
  CustomerProfileUpdateApiResponse,
} from "../types/api.types.js";

export function createCustomerProfileService(config?: ApiClientConfig) {
  const { apiRequest } = createApiClient(config);

  return {
    async sendPhoneChangeOtp(params: {
      newPhone: string;
    }): Promise<CustomerPhoneChangeSendOtpApiResponse> {
      return apiRequest<CustomerPhoneChangeSendOtpApiResponse>(
        `/customers/me/phone-change/send-otp`,
        { method: "POST", body: { newPhone: params.newPhone } },
      );
    },

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

    // When newPhone is present, phoneVerifiedToken must accompany it
    // (issued by verifyPhoneChangeOtp).
    async updateProfile(params: {
      surname?: string;
      other_names?: string;
      avatar_url?: string | null;
      newPhone?: string;
      phoneVerifiedToken?: string;
      latitude?: number | null;
      longitude?: number | null;
      place_id?: string | null;
    }): Promise<CustomerProfileUpdateApiResponse> {
      return apiRequest<CustomerProfileUpdateApiResponse>(
        `/customers/me/profile`,
        { method: "PATCH", body: params },
      );
    },
  };
}

export const customerProfileService = createCustomerProfileService();