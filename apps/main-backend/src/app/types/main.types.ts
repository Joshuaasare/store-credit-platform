export type StaffRoleValues = "manager" | "cashier";

export type BranchCategoryValues =
  | "electronics"
  | "home_appliances"
  | "furniture"
  | "retail_shops"
  | "restaurants"
  | "schools";

export type CreditTypeValues = "fixed" | "percentage";

export type CumulativeScopeValues = "per_branch" | "merchant_wide";

export type SendSMSMessageParams = {
  phone: string; // international format, e.g. +233501234567
  message: string;
  sender?: string; // max 11 characters
};

export type SendSMSMessageResponse = {
  status: "success";
};

export type SMSMessageErrorReponse = {
  status: "error";
  message: string;
};

export interface BaseMerchant {
  id: number;
  name: string;
  phone: string;
  country_code: string;
  slug: string | null;
  logo_url: string | null;
  cover_photo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface BaseBranch {
  id: number;
  merchant_id: number;
  name: string | null;
  phone: string | null;
  address: string | null;
  city: string;
  country_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  place_label: string | null;
  category: BranchCategoryValues | null;
  purchase_threshold_amount: number | null;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown[];
}

export type TransactionTypeValues =
  | "purchase"
  | "credit_issue"
  | "credit_redeem";

export interface BaseCustomer {
  id: number;
  phone: string | null;
  unique_id: string | null;
  user_id: string | null;
  surname: string | null;
  other_names: string | null;
  avatar_url: string | null;
  created_at: string;
  deleted_at: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  place_label: string | null;
}

// Cross-file projection (lives here so auth + customer-auth types share it). id is users.id (uuid); customer_id is the linked numeric customers.id.
export interface CustomerAuthUser {
  id: string;
  phone: string | null;
  customer_id: number;
  surname: string | null;
  other_names: string | null;
  avatar_url: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  place_label: string | null;
}

export interface BaseCustomerTransaction {
  id: number;
  customer_id: number;
  branch_id: number;
  amount: number;
  transaction_date: number;
  transaction_type: TransactionTypeValues;
  created_at: string;
  // Set for credit_issue/credit_redeem (originating customer_credit.id); null for purchases. Frontend opens the redemption dialog against this id.
}

// Excludes otp/otp_expires_at so sensitive fields don't ship over the transactions API. Names + access_granted live on staff/customers, not users — joins go through those.
export interface BaseUserProfile {
  id: string;
  phone: string;
  last_login_at: string | null;
  created_at: string;
  deleted_at: string | null;
}

// Mirrors QueryFragments.BASE_STAFF; composed types extend this + nested joins so a column added here + the fragment auto-propagates.
export interface BaseStaff {
  id: number;
  user_id: string;
  branch_id: number;
  role: StaffRoleValues | null;
  surname: string | null;
  other_names: string | null;
  access_granted: boolean;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

// Redemption state collapsed onto the row: pending + approved slices, remaining = credit_amount − both (CHECK-bounded so over-redemption can't land). revoked_at/expires_at drive the live/expired/revoked bucket.
export interface BaseCustomerCredit {
  id: number;
  customer_id: number;
  branch_id: number;
  credit_amount: number;
  pending_redemption_amount: number | null;
  approved_redemption_amount: number | null;
  redemption_approval_staff_id: number | null;
  expires_at: number | null;
  revoked_at: string | null;
  revoked_by_user_id: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

// Append-only audit log — one row per approved/rejected fan-out at a (customer, merchant) pair, no per-credit FK. Approved↔approved_at, Rejected↔rejected_at (mutually exclusive); cancels write no row.
export interface BaseCustomerCreditRedemption {
  id: number;
  customer_id: number;
  // Denormalized so audit/activity feeds join directly to merchants without customer_credit→branches. Nullable for legacy rows; the feed drops orphans.
  merchant_id: number | null;
  amount_redeemed: number;
  approved_at: string | null;
  approved_by_staff_id: number | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  branch_id: number;
  requested_date: number;
  transaction_date: number;
}

export interface BaseRunningCreditConfig {
  created_at: string;
  credit_type: CreditTypeValues | null;
  credit_validity: number | null;
  cumulative_scope: CumulativeScopeValues;
  deleted_at: string | null;
  eligible_window: number | null;
  fixed_credit_value: number | null;
  id: number;
  is_active: boolean;
  maximum_allowed_credit: number | null;
  percentage_credit_value: number | null;
  terms: string | null;
  threshold_amount: number | null;
  updated_at: string | null;
  images: string[] | null;
}

export interface BaseFixedCreditConfig {
  created_at: string;
  deleted_at: string | null;
  description: string | null;
  end_date: number | null;
  id: number;
  images: string[] | null;
  is_active: boolean;
  start_date: number | null;
  terms: string | null;
  title: string | null;
  updated_at: string | null;
}
