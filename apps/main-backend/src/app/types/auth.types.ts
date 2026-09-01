import { StaffRoleValues, CustomerAuthUser } from "./main.types";

export interface SendOtpRequest {
  phone: string;
}

export interface VerifyOtpRequest {
  phone: string;
  otp: string;
}

export interface AccessTokenPayload {
  sub: string;
  phone: string | null;
  role: StaffRoleValues | null;
  merchant_id: number | null;
  branch_id: number | null;
  staff_id: number | null;
  customer_id: number | null;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  jti: string;
}

export interface AuthUser {
  id: string;
  email: string;
  phone: string | null;
  // Names live on staff/customers, not users; null when the user has no staff row.
  surname: string | null;
  other_names: string | null;
  access_granted: boolean;
  role: StaffRoleValues | null;
  merchant_id: number | null;
  branch_id: number | null;
  // Carried in the access token so staff routes can stamp redemption_approval_staff_id without an extra lookup. Null for non-staff.
  staff_id: number | null;
}

export interface AuthSession {
  access_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: AuthUser;
}

export interface SendOtpResponse {
  success: true;
  message: string;
}

export interface VerifyOtpResponse {
  success: true;
  message: string;
  data: AuthSession;
}

export interface RefreshTokenResponse {
  success: true;
  message: string;
  data: AuthSession;
}

export interface LogoutResponse {
  success: true;
  message: string;
}

export interface SessionListItem {
  id: string;
  device_fingerprint: string | null;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  is_current: boolean;
}

export interface SessionListResponse {
  success: true;
  data: SessionListItem[];
}

export interface SessionRevokeResponse {
  success: true;
  message: string;
}

export interface GetCurrentUserResponse {
  success: true;
  data: AuthUser;
}

export interface AuthErrorResponse {
  success: false;
  error: string;
  details?: unknown[];
}

export type SendOtpApiResponse = SendOtpResponse | AuthErrorResponse;
export type VerifyOtpApiResponse = VerifyOtpResponse | AuthErrorResponse;
export type RefreshTokenApiResponse = RefreshTokenResponse | AuthErrorResponse;
export type LogoutApiResponse = LogoutResponse | AuthErrorResponse;
export type SessionListApiResponse = SessionListResponse | AuthErrorResponse;
export type SessionRevokeApiResponse =
  | SessionRevokeResponse
  | AuthErrorResponse;
export type GetCurrentUserApiResponse =
  | GetCurrentUserResponse
  | AuthErrorResponse;

// Customer-app auth — separate namespace from staff (/api/customer-auth/*). Reuses primitives but NOT staff-gated logic; a customer has no staff row.

export interface CustomerOtpSendRequest {
  phone: string;
}

export interface CustomerOtpVerifyRequest {
  phone: string;
  otp: string;
}

export interface CustomerRegisterRequest {
  pending_token: string;
  surname: string;
  other_names: string;
  latitude?: number | null;
  longitude?: number | null;
  place_id?: string | null;
}

export interface CustomerRefreshRequest {
  refresh_token: string;
}

export interface CustomerSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: CustomerAuthUser;
}

export interface CustomerOtpSendResponse {
  success: true;
  message: string;
}

export interface CustomerLoggedInResponse {
  success: true;
  message: string;
  data: {
    status: "logged_in";
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at: number;
    token_type: string;
    user: CustomerAuthUser;
  };
}

export interface CustomerNeedsProfileResponse {
  success: true;
  message: string;
  data: {
    status: "needs_profile";
    pending_token: string;
  };
}

export type CustomerOtpVerifyResponse =
  | CustomerLoggedInResponse
  | CustomerNeedsProfileResponse;

export interface CustomerRegisterResponse {
  success: true;
  message: string;
  data: CustomerSession;
}

export interface CustomerRefreshResponse {
  success: true;
  message: string;
  data: CustomerSession;
}

export interface CustomerLogoutResponse {
  success: true;
  message: string;
}

export interface CustomerGetCurrentUserResponse {
  success: true;
  data: CustomerAuthUser;
}

export type CustomerOtpSendApiResponse =
  | CustomerOtpSendResponse
  | AuthErrorResponse;
export type CustomerOtpVerifyApiResponse =
  | CustomerOtpVerifyResponse
  | AuthErrorResponse;
export type CustomerRegisterApiResponse =
  | CustomerRegisterResponse
  | AuthErrorResponse;
export type CustomerRefreshApiResponse =
  | CustomerRefreshResponse
  | AuthErrorResponse;
export type CustomerLogoutApiResponse =
  | CustomerLogoutResponse
  | AuthErrorResponse;
export type CustomerGetCurrentUserApiResponse =
  | CustomerGetCurrentUserResponse
  | AuthErrorResponse;
