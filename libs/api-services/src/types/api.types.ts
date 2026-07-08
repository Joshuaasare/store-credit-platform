/**
 * Auto-generated API Types
 * Generated on: 2026-07-08T13:25:38.667Z
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

// ========================================
// API-SPECIFIC TYPES
// ========================================
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

export type GetCurrentUserApiResponse =
  | GetCurrentUserResponse
  | AuthErrorResponse;

