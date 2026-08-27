import {
  ApiErrorResponse,
  BaseBranch,
  BaseCustomerCredit,
  BaseFixedCreditConfig,
  BaseRunningCreditConfig,
  CreditTypeValues,
  CumulativeScopeValues,
} from "./main.types";

// CreditTypeValues is still used by the running-config interfaces below.

export type RunningCreditConfig = BaseRunningCreditConfig & {
  branch: BaseBranch;
};

export type FixedCreditConfig = BaseFixedCreditConfig & {
  branch: BaseBranch;
};
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
  images: string[] | null;
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
  images?: string[] | null;
}

export type UpdateRunningCreditConfigRequest = CreateRunningCreditConfigRequest;

// DB-level update payload — the normalized values written to .update(), plus optional images.
// Replaces Database["public"]["Tables"]["running_credit_config"]["Update"] references.
export interface RunningCreditConfigUpdate {
  credit_type: CreditTypeValues | null;
  credit_validity: number | null;
  eligible_window: number | null;
  fixed_credit_value: number | null;
  percentage_credit_value: number | null;
  maximum_allowed_credit: number | null;
  threshold_amount: number | null;
  terms: string | null;
  cumulative_scope: CumulativeScopeValues;
  images?: string[];
}

export interface FixedCreditConfigGroup {
  config_group_id: string;
  branches: BaseBranch[];
  title: string | null;
  description: string | null;
  images: string[] | null;
  start_date: number | null;
  end_date: number | null;
  terms: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface CreateFixedCreditConfigRequest {
  branch_ids: number[];
  title?: string | null;
  description?: string | null;
  images?: string[] | null;
  start_date?: number | null;
  end_date?: number | null;
  terms?: string | null;
}

export type UpdateFixedCreditConfigRequest = CreateFixedCreditConfigRequest;

// DB-level update payload — the normalized values written to .update(), plus optional images.
// Replaces Database["public"]["Tables"]["fixed_credit_config"]["Update"] references.
export interface FixedCreditConfigUpdate {
  title: string | null;
  description: string | null;
  start_date: number | null;
  end_date: number | null;
  terms: string | null;
  images?: string[];
}

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

// Augmented with live remaining = credit_amount − SUM(approved redemptions). Used by the redemption dialog and credit-list endpoints.
export interface CustomerCreditWithRemaining extends BaseCustomerCredit {
  remaining: number;
  redeemed_total: number;
}
