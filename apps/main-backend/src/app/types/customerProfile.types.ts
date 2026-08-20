// ────────────────────────────────────────────────────────────────────────────
// Customer-app profile-edit endpoints (`/customers/me/*`)
// ────────────────────────────────────────────────────────────────────────────
// Three endpoints on the customer-app profile flow:
//   POST   /me/phone-change/send-otp   — send an OTP to a new phone
//   POST   /me/phone-change/verify     — verify the OTP, get a phoneVerifiedToken
//   PATCH  /me/profile                 — commit surname / other_names / avatar_url / phone
//
// All three are customer-token only — `customerId` is read from the JWT
// (`request.user.customer_id`), never trusted from the client. The phone
// change is a two-step dance: the customer-app sends an OTP to the new
// phone, the customer enters the code, the backend verifies and returns
// a short-lived phone-verified JWT. The subsequent PATCH includes that
// token so the profile update can prove ownership of the new phone
// without re-sending an OTP.
//
// Avatar uploads go through the generic `POST /storage/upload-url`
// endpoint (same path the webapp uses for vendor logos) — the
// customer-app calls `storage.uploadFile()` from `api-services`, then
// PATCHes `avatar_url` here. No customer-specific avatar-upload
// endpoint.

import { ApiErrorResponse, CustomerAuthUser } from "./main.types";

// ────────────────────────────────────────────────────────────────────────────
// POST /me/phone-change/send-otp
// ────────────────────────────────────────────────────────────────────────────

// Request body — the new phone the customer wants to switch to. The
// backend normalizes via `normalizePhone`, rejects a no-op (same as
// current), rejects if another `users` row already has this phone
// (uniqueness), then sends the OTP via `MessagingService.sendSMSMessage`.
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

// ────────────────────────────────────────────────────────────────────────────
// POST /me/phone-change/verify
// ────────────────────────────────────────────────────────────────────────────

// Request body — the new phone + the OTP the customer entered. The
// backend verifies the OTP (same MAX_OTP_ATTEMPTS=5 logic as
// `CustomerAuthService.verifyOtp`), then issues a 10-minute
// phone-verified token via `TokenService.signPhoneVerifiedToken`.
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

// ────────────────────────────────────────────────────────────────────────────
// PATCH /me/profile
// ────────────────────────────────────────────────────────────────────────────

// Request body — all fields optional. The customer-app sends the union
// of whatever the customer changed. `newPhone` requires
// `phoneVerifiedToken`; the backend verifies the token, asserts
// `token.newPhone === newPhone`, and re-checks uniqueness (race guard)
// before updating `users.phone`. `avatar_url` is the public URL returned
// by `/me/avatar-upload-url` (or `null` to clear the photo). Empty
// `surname` is rejected (matches registration).
export interface CustomerProfileUpdateRequest {
  surname?: string;
  other_names?: string;
  avatar_url?: string | null;
  newPhone?: string;
  phoneVerifiedToken?: string;
}

// Wrapped success shape: `{ success: true, data: { user: CustomerAuthUser } }`.
// The returned `CustomerAuthUser` reflects the post-update state — the
// customer-app calls `setUser` on the auth store so the header + every
// other surface that reads `user` re-renders with the new data without
// a refetch.
export interface CustomerProfileUpdateResponse {
  success: true;
  data: { user: CustomerAuthUser };
}

export type CustomerProfileUpdateApiResponse =
  | CustomerProfileUpdateResponse
  | ApiErrorResponse;