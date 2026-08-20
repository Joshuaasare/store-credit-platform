// Service-layer response shapes for /api/customer-auth/*. The route owns the success/error envelope; the service owns the bare session shape.

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