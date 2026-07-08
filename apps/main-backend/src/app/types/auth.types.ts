import { BaseUserRole } from "./main.types";

export interface UserData {
  id: string;
  email: string;
  phone: string | null;
  is_access_granted: boolean;
  user_roles: BaseUserRole[];
}

export interface VerifyOTPRequest {
  phone: string;
  otp: string;
}

export interface SendOTPRequest {
  phone: string;
}

export interface VerifyOTPResponse {
  success: true;
  message: string;
}

export interface AuthErrorResponse {
  success: false;
  error: string;
  details?: any[];
}

export interface GetCurrentUserResponse {
  success: true;
  data: UserData;
}

// API response unions
export type GetCurrentUserApiResponse =
  | GetCurrentUserResponse
  | AuthErrorResponse;
