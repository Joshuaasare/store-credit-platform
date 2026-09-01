import {
  ApiErrorResponse,
  BaseBranch,
  BaseCustomerCredit,
  BaseFixedCreditConfig,
  BaseRunningCreditConfig,
  CreditTypeValues,
  CumulativeScopeValues,
} from "./main.types";

export type RunningCreditConfig = BaseRunningCreditConfig & {
  branches: BaseBranch[];
};

export type FixedCreditConfig = BaseFixedCreditConfig & {
  branches: BaseBranch[];
};

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
  url?: string | null;
  cumulative_scope: CumulativeScopeValues;
  images?: string[] | null;
}

export type UpdateRunningCreditConfigRequest = CreateRunningCreditConfigRequest;

// DB-level update payload written to .update() on the config row.
export interface RunningCreditConfigUpdate {
  credit_type: CreditTypeValues | null;
  credit_validity: number | null;
  eligible_window: number | null;
  fixed_credit_value: number | null;
  percentage_credit_value: number | null;
  maximum_allowed_credit: number | null;
  threshold_amount: number | null;
  terms: string | null;
  url: string | null;
  cumulative_scope: CumulativeScopeValues;
  images?: string[];
}

export interface CreateFixedCreditConfigRequest {
  branch_ids: number[];
  title?: string | null;
  description?: string | null;
  images?: string[] | null;
  start_date?: number | null;
  end_date?: number | null;
  terms?: string | null;
  url?: string | null;
}

export type UpdateFixedCreditConfigRequest = CreateFixedCreditConfigRequest;

// DB-level update payload written to .update() on the config row.
export interface FixedCreditConfigUpdate {
  title: string | null;
  description: string | null;
  start_date: number | null;
  end_date: number | null;
  terms: string | null;
  url: string | null;
  images?: string[];
}

export interface ToggleActiveRequest {
  is_active: boolean;
}

// A config the customer favorited. Favorites are keyed by config only —
// favoriting at one branch favorites the config at every branch it runs at.
export type FavoritedRunningCreditConfig = RunningCreditConfig & {
  favorited_at: string;
};

export type FavoritedFixedCreditConfig = FixedCreditConfig & {
  favorited_at: string;
};

export interface CustomerFavoritesListResponse {
  success: true;
  data: {
    running: FavoritedRunningCreditConfig[];
    fixed: FavoritedFixedCreditConfig[];
  };
}

export interface FavoriteMutationResponse {
  success: true;
}

export type CustomerFavoritesListApiResponse =
  | CustomerFavoritesListResponse
  | ApiErrorResponse;

export type FavoriteMutationApiResponse =
  | FavoriteMutationResponse
  | ApiErrorResponse;

export interface RunningCreditConfigListResponse {
  success: true;
  data: RunningCreditConfig[];
}

export interface RunningCreditConfigMutationResponse {
  success: true;
  data: RunningCreditConfig;
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
  data: FixedCreditConfig[];
}

export interface FixedCreditConfigMutationResponse {
  success: true;
  data: FixedCreditConfig;
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