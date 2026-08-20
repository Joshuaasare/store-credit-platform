import { createApiClient, refreshAccessToken } from "./apiService.js";
import { accessTokenStorage } from "./accessTokenStorage.js";
import {
  SendOtpRequest,
  VerifyOtpRequest,
  SendOtpApiResponse,
  VerifyOtpApiResponse,
  RefreshTokenApiResponse,
  LogoutApiResponse,
  SessionListApiResponse,
  SessionRevokeApiResponse,
  GetCurrentUserApiResponse,
} from "../types/api.types.js";

export function createAuthService() {
  const { publicApiRequest, apiRequest } = createApiClient();

  return {
    async sendOtp(data: SendOtpRequest): Promise<SendOtpApiResponse> {
      return publicApiRequest<SendOtpApiResponse>("/auth/otp/send", {
        method: "POST",
        body: data,
      });
    },

    async verifyOtp(data: VerifyOtpRequest): Promise<VerifyOtpApiResponse> {
      return publicApiRequest<VerifyOtpApiResponse>("/auth/otp/verify", {
        method: "POST",
        body: data,
      });
    },

    async refreshToken(): Promise<RefreshTokenApiResponse> {
      return publicApiRequest<RefreshTokenApiResponse>("/auth/refresh", {
        method: "POST",
        body: {},
      });
    },

    async logout(): Promise<LogoutApiResponse> {
      return publicApiRequest<LogoutApiResponse>("/auth/logout", {
        method: "POST",
        body: {},
      });
    },

    async getCurrentUser(): Promise<GetCurrentUserApiResponse> {
      return apiRequest<GetCurrentUserApiResponse>("/auth/me", {
        method: "GET",
      });
    },

    async listSessions(): Promise<SessionListApiResponse> {
      return apiRequest<SessionListApiResponse>("/auth/sessions", {
        method: "GET",
      });
    },

    async revokeSession(sessionId: string): Promise<SessionRevokeApiResponse> {
      return apiRequest<SessionRevokeApiResponse>(
        `/auth/sessions/${sessionId}/revoke`,
        {
          method: "POST",
          body: {},
        },
      );
    },
  };
}

export async function tryRefreshToken(): Promise<boolean> {
  try {
    return await refreshAccessToken();
  } catch {
    accessTokenStorage.clearAccessToken();
    return false;
  }
}
