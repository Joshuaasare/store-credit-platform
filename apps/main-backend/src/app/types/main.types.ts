export type StaffRoleValues = "manager" | "cashier";

export type CreditTypeValues = "fixed" | "percentage";

export type CumulativeScopeValues = "per_branch" | "merchant_wide";

// SMS Message Types
export type SendSMSMessageParams = {
  phone: string; // Phone number in international format (e.g., +233501234567)
  message: string; // SMS message body
  sender?: string; // Sender ID (optional, max 11 characters)
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
  created_at: string;
  deleted_at: string | null;
}

export interface BaseCustomerTransaction {
  id: number;
  customer_id: number;
  branch_id: number;
  recorded_by_staff_id: number | null;
  amount: number;
  transaction_date: number;
  transaction_type: TransactionTypeValues;
  created_at: string;
  // Set for credit_issue and credit_redeem rows (the originating
  // customer_credit.id). Null for purchase rows. Used by the frontend to
  // open the redemption dialog against a specific credit.
  credit_id?: number | null;
}

// Slim profile projection of users for customer / recorded-by joins.
// Deliberately excludes otp / otp_expires_at from BASE_USER so those
// sensitive fields are not shipped over the transactions API.
// NOTE: names (surname / other_names) AND access_granted live on `staff` /
// `customers`, NOT on `users` — a user is a phone-based OTP login identity.
// Reads that need a display name or access flag join through to the staff /
// customer row.
export interface BaseUserProfile {
  id: string;
  phone: string;
  last_login_at: string | null;
  created_at: string;
  deleted_at: string | null;
}

// Base row types mirroring QueryFragments.* constants. Composed types in
// feature *.types.ts files extend these + add nested joins (user, branch)
// so a column added to a fragment + base type auto-propagates everywhere.
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

export interface BaseCustomerCredit {
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

// Base row type for customer_credit_redemptions. Mirrors the
// BASE_CUSTOMER_CREDIT_REDEMPTION query fragment. The three redemption states
// are derived from approved_at / rejected_at (no status enum):
//   Pending  → approved_at IS NULL AND rejected_at IS NULL
//   Approved → approved_at IS NOT NULL
//   Rejected → rejected_at IS NOT NULL (implies approved_at IS NULL)
// approved_at and rejected_at are mutually exclusive (enforced in the service
// layer). `recorded_by_staff_id` is the cashier/manager who recorded the row
// (historic — the cashier-initiated creation flow is being removed); the future
// customer-app initiation channel will leave it null. `approved_by_staff_id`
// is the manager who approved the redemption.
export interface BaseCustomerCreditRedemption {
  id: number;
  credit_id: number;
  customer_id: number;
  branch_id: number;
  amount_redeemed: number;
  approved_at: string | null;
  approved_by_staff_id: number | null;
  recorded_by_staff_id: number | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface BaseRunningCreditConfig {
  id: number;
  config_group_id: string;
  branch_id: number;
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
  deleted_at: string | null;
}

export interface BaseFixedCreditConfig {
  id: number;
  config_group_id: string;
  branch_id: number;
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
  deleted_at: string | null;
}
