// Customer-app profile-edit flow (/customers/me/*). All customer-token only (customerId from JWT). Phone change is two-step: OTP to new phone → phone-verified JWT → PATCH /me/profile with that token.

import { ApiErrorResponse, CustomerAuthUser } from "./main.types";

// Rejects no-op (same as current), rejects uniqueness clash, then sends the OTP.
export interface CustomerPhoneChangeSendOtpRequest {
  newPhone: string;
}

export interface CustomerPhoneChangeSendOtpResponse {
  success: true;
  data: { message: string };
}

export type CustomerPhoneChangeSendOtpApiResponse =
  | CustomerPhoneChangeSendOtpResponse
  | ApiErrorResponse;

// Verifies the OTP (MAX_OTP_ATTEMPTS=5) then issues a 10-minute phone-verified token.
export interface CustomerPhoneChangeVerifyRequest {
  newPhone: string;
  otp: string;
}

export interface CustomerPhoneChangeVerifyResult {
  phoneVerifiedToken: string;
}

export interface CustomerPhoneChangeVerifyResponse {
  success: true;
  data: CustomerPhoneChangeVerifyResult;
}

export type CustomerPhoneChangeVerifyApiResponse =
  | CustomerPhoneChangeVerifyResponse
  | ApiErrorResponse;

// All fields optional. newPhone requires phoneVerifiedToken (verified + uniqueness re-check as a race guard). Empty surname rejected.
export interface CustomerProfileUpdateRequest {
  surname?: string;
  other_names?: string;
  avatar_url?: string | null;
  newPhone?: string;
  phoneVerifiedToken?: string;
  latitude?: number | null;
  longitude?: number | null;
  place_id?: string | null;
  place_label?: string | null;
}

// DB-level update payload for the customers table. Built conditionally in updateProfile — only
// fields the request actually touches are set; trimmed surname/other_names are string (not null).
export interface CustomerUpdate {
  surname?: string;
  other_names?: string;
  avatar_url?: string | null;
  phone?: string;
  latitude?: number | null;
  longitude?: number | null;
  place_id?: string | null;
  place_label?: string | null;
  updated_at?: string;
}

// The returned CustomerAuthUser is post-update so the customer-app can setUser without a refetch.
export interface CustomerProfileUpdateResponse {
  success: true;
  data: { user: CustomerAuthUser };
}

export type CustomerProfileUpdateApiResponse =
  | CustomerProfileUpdateResponse
  | ApiErrorResponse;