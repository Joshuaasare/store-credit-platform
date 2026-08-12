// Composed response types for the customer-auth service layer.
//
// These mirror the `data` payloads of the `/api/customer-auth/*` routes (see
// auth.types.ts) but are returned directly from the service methods so the
// route handlers can spread them into the `{ success, message, data }` envelope
// without re-shaping. The route layer owns the success/error envelope; the
// service owns the bare session shape.

import { CustomerAuthUser } from "./main.types";

export type CustomerOtpVerifyServiceResponse = {
  status: "logged_in";
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: CustomerAuthUser;
} | {
  status: "needs_profile";
  pending_token: string;
};

export type CustomerRegisterServiceResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: CustomerAuthUser;
};

export type CustomerRefreshServiceResponse = CustomerRegisterServiceResponse;