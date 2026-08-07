import {
  ApiErrorResponse,
  BaseBranch,
  BaseCustomerCredit,
  CreditTypeValues,
  CumulativeScopeValues,
} from "./main.types";

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

// customer_credit row type is now `BaseCustomerCredit` in main.types.ts —
// the composed nested shape propagates column changes via QueryFragments.

// Credit row augmented with the live "remaining" = credit_amount −
// SUM(approved redemptions). Used by the redemption dialog and any
// credit-list endpoint.
export interface CustomerCreditWithRemaining extends BaseCustomerCredit {
  remaining: number;
  redeemed_total: number;
}