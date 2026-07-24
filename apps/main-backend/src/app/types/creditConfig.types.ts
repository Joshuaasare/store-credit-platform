import { ApiErrorResponse, BaseBranch } from "./main.types";

export type CreditTypeValues = "fixed" | "percentage";

export type CumulativeScopeValues = "per_branch" | "merchant_wide";

export interface RunningCreditConfigGroup {
  config_group_id: string;
  branches: BaseBranch[];
  credit_type: CreditTypeValues | null;
  credit_validity: number | null;
  eligible_window: number | null;
  fixed_credit_value: number | null;
  percentage_credit_value: number | null;
  maximum_allowed_credit: number | null;
  threshold_amount: number | null;
  terms: string | null;
  cumulative_scope: CumulativeScopeValues;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface CreateRunningCreditConfigRequest {
  branch_ids: number[];
  credit_type: CreditTypeValues | null;
  credit_validity?: number | null;
  eligible_window?: number | null;
  fixed_credit_value?: number | null;
  percentage_credit_value?: number | null;
  maximum_allowed_credit?: number | null;
  threshold_amount?: number | null;
  terms?: string | null;
  cumulative_scope: CumulativeScopeValues;
}

export type UpdateRunningCreditConfigRequest = CreateRunningCreditConfigRequest;

export interface FixedCreditConfigGroup {
  config_group_id: string;
  branches: BaseBranch[];
  credit_type: CreditTypeValues | null;
  fixed_credit_value: number | null;
  percentage_credit_value: number | null;
  maximum_allowed_credit: number | null;
  start_date: number | null;
  end_date: number | null;
  terms: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface CreateFixedCreditConfigRequest {
  branch_ids: number[];
  credit_type: CreditTypeValues | null;
  fixed_credit_value?: number | null;
  percentage_credit_value?: number | null;
  maximum_allowed_credit?: number | null;
  start_date?: number | null;
  end_date?: number | null;
  terms?: string | null;
}

export type UpdateFixedCreditConfigRequest = CreateFixedCreditConfigRequest;

export interface ToggleActiveRequest {
  is_active: boolean;
}

export interface RunningCreditConfigListResponse {
  success: true;
  data: RunningCreditConfigGroup[];
}

export interface RunningCreditConfigMutationResponse {
  success: true;
  data: RunningCreditConfigGroup;
}

export interface RunningCreditConfigDeleteResponse {
  success: true;
  data: null;
}

export type RunningCreditConfigListApiResponse =
  | RunningCreditConfigListResponse
  | ApiErrorResponse;

export type RunningCreditConfigMutationApiResponse =
  | RunningCreditConfigMutationResponse
  | ApiErrorResponse;

export type RunningCreditConfigDeleteApiResponse =
  | RunningCreditConfigDeleteResponse
  | ApiErrorResponse;

export interface FixedCreditConfigListResponse {
  success: true;
  data: FixedCreditConfigGroup[];
}

export interface FixedCreditConfigMutationResponse {
  success: true;
  data: FixedCreditConfigGroup;
}

export interface FixedCreditConfigDeleteResponse {
  success: true;
  data: null;
}

export type FixedCreditConfigListApiResponse =
  | FixedCreditConfigListResponse
  | ApiErrorResponse;

export type FixedCreditConfigMutationApiResponse =
  | FixedCreditConfigMutationResponse
  | ApiErrorResponse;

export type FixedCreditConfigDeleteApiResponse =
  | FixedCreditConfigDeleteResponse
  | ApiErrorResponse;

// A row of customer_credit. After the re-architecture, customer_credit
// stores only the calculated GHS amount (credit_amount) plus expiry/revocation
// metadata. The credit_type / percentage / cap that produced it live on the
// running_credit_config that issued it; we no longer denormalize them here.
export interface CustomerCreditRow {
  id: number;
  customer_id: number;
  branch_id: number;
  credit_amount: number;
  expires_at: number | null;
  revoked_at: string | null;
  revoked_by_user_id: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

// Credit row augmented with the live "remaining" = credit_amount −
// SUM(approved redemptions). Used by the redemption dialog and any
// credit-list endpoint.
export interface CustomerCreditWithRemaining extends CustomerCreditRow {
  remaining: number;
  redeemed_total: number;
}