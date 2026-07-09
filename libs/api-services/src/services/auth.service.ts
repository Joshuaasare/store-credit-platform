import { createApiClient } from "./apiService.js";
import {
  SendOtpRequest,
  VerifyOtpRequest,
  SendOtpApiResponse,
  VerifyOtpApiResponse,
  GetCurrentUserApiResponse,
} from "../types/api.types.js";
import { SupabaseClient } from "@supabase/supabase-js";

export function createAuthService(supabaseClient: SupabaseClient) {
  const { publicApiRequest } = createApiClient(supabaseClient);

  return {
    async sendOtp(data: SendOtpRequest): Promise<SendOtpApiResponse> {
      return publicApiRequest<SendOtpApiResponse>("/api/auth/otp/send", {
        method: "POST",
        body: data,
      });
    },

    async verifyOtp(data: VerifyOtpRequest): Promise<VerifyOtpApiResponse> {
      return publicApiRequest<VerifyOtpApiResponse>("/api/auth/otp/verify", {
        method: "POST",
        body: data,
      });
    },

    async getCurrentUser(): Promise<GetCurrentUserApiResponse> {
      const { apiRequest } = createApiClient(supabaseClient);
      return apiRequest<GetCurrentUserApiResponse>("/api/auth/me", {
        method: "GET",
      });
    },
  };
}
