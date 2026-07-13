/**
 * Auto-generated API Types
 * Generated on: 2026-07-13T11:58:43.929Z
 * 
 * ⚠️ DO NOT EDIT MANUALLY
 * Source: apps/smartschool-api/src/app/types/
 * Script: yarn generate:types
 * 
 * TYPE-FIRST WORKFLOW:
 * 1. Edit types in backend: apps/main-backend/src/app/types/*.types.ts
 * 2. Run: yarn generate:types
 * 3. Backend gets TypeBox schemas (for validation)
 * 4. Frontend gets TypeScript types (for type safety)
 * 5. Everything stays in sync automatically!
 * 
 * NOTE: Shared types from main.types.ts are included first.
 *       API-specific types follow, with imports removed.
 */

// ========================================
// SHARED TYPES (from main.types.ts)
// ========================================
export type UserRoleValues = "manager" | "cashier";

export type BaseUserRole = {
  created_at: string | null;
  id: number;
  role: UserRoleValues;
  updated_at: string | null;
  user_id: string;
  assigned_by_user_id: string;
};

export interface UserWithRoles {
  id: string;
  email: string;
  phone: string | null;
  surname: string;
  other_names: string | null;
  access_granted: boolean;
  roles: BaseUserRole[];
}


export type SendSMSMessageParams = {
  phone: string; 
  message: string; 
  sender?: string; 
};

export type SendSMSMessageResponse = {
  status: "success";
};

export type SMSMessageErrorReponse = {
  status: "error";
  message: string;
};

// ========================================
// API-SPECIFIC TYPES
// ========================================
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
  roles: string[];
  merchant_id: number | null;
  branch_id: number | null;
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
  surname: string;
  other_names: string | null;
  access_granted: boolean;
  roles: BaseUserRole[];
  merchant_id: number | null;
  branch_id: number | null;
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
export type SessionRevokeApiResponse = SessionRevokeResponse | AuthErrorResponse;
export type GetCurrentUserApiResponse = GetCurrentUserResponse | AuthErrorResponse;

export interface MerchantBase {
  id: number;
  name: string;
  phone: string;
  country_code: string;
  slug: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MerchantWithStats extends MerchantBase {
  branch_count: number;
  staff_count: number;
  customer_count: number;
  lifetime_credit_issued: number;
  credit_pool_used: number;
  credit_pool_limit: number | null;
}

export interface BranchBase {
  id: number;
  merchant_id: number;
  name: string | null;
  phone: string | null;
  address: string | null;
  city: string;
  country_code: string;
  is_active: boolean;
  created_at: string;
}

export interface BranchWithAggregates extends BranchBase {
  staff_count: number;
  customer_count: number;
  credit_issued_this_month: number;
  last_activity_date: string | null;
}

export interface CreateBranchRequest {
  name: string;
  phone?: string;
  address?: string;
  city: string;
  country_code: string;
}

export interface UpdateBranchRequest {
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  country_code?: string;
}

export interface UpdateMerchantRequest {
  name?: string;
  phone?: string;
  country_code?: string;
  slug?: string | null;
}

export interface MerchantMeResponse {
  success: true;
  data: MerchantWithStats | null;
}

export interface BranchListResponse {
  success: true;
  data: BranchWithAggregates[];
}

export interface BranchMutationResponse {
  success: true;
  data: BranchWithAggregates;
}

export interface MerchantMutationResponse {
  success: true;
  data: MerchantWithStats;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown[];
}

export type MerchantMeApiResponse = MerchantMeResponse | ApiErrorResponse;
export type BranchListApiResponse = BranchListResponse | ApiErrorResponse;
export type BranchMutationApiResponse = BranchMutationResponse | ApiErrorResponse;
export type MerchantMutationApiResponse = MerchantMutationResponse | ApiErrorResponse;

