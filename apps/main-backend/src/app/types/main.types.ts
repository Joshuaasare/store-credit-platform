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
  avatar_url: string | null;
  created_at: string;
  deleted_at: string | null;
}

// Customer-app auth identity — the user-facing projection returned by the
// `/api/customer-auth/*` endpoints. Lives here (not in auth.types.ts) so both
// auth.types.ts and customer-auth.types.ts can import it without the typegen
// stripping the cross-file reference. `id` is the `users.id` (uuid); the
// numeric `customer_id` is the linked `customers.id`.
export interface CustomerAuthUser {
  id: string;
  phone: string | null;
  customer_id: number;
  surname: string | null;
  other_names: string | null;
  avatar_url: string | null;
}

export interface BaseCustomerTransaction {
  id: number;
  customer_id: number;
  branch_id: number;
  amount: number;
  transaction_date: number;
  transaction_type: TransactionTypeValues;
  created_at: string;
  // Set for credit_issue and credit_redeem rows (the originating
  // customer_credit.id). Null for purchase rows. Used by the frontend to
  // open the redemption dialog against a specific credit.
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

// Base row type for customer_credit. Mirrors the BASE_CUSTOMER_CREDIT
// query fragment. The redemption state lives on the row itself
// (collapsed from the legacy customer_credit_redemptions rows): the
// pending slice is `pending_redemption_amount`, the approved slice is
// `approved_redemption_amount`, and the row's remaining is derived
//   remaining = credit_amount − approved_redemption_amount − pending_redemption_amount
// The two redemption slices are bounded by `credit_amount` (DB CHECK
// constraint) so an over-redemption can never land. `revoked_at` /
// `expires_at` still drive the customer-facing status bucket (live /
// expired / revoked) and the auto-shrink trigger re-fans-out any
// orphaned pending slice when a row is revoked or expires.
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

// Base row type for customer_credit_redemptions. Mirrors the
// BASE_CUSTOMER_CREDIT_REDEMPTION query fragment. After the row-state
// collapse this table is a thin append-only AUDIT log — one row per
// approved or rejected fan-out at a (customer, merchant) pair, no
// per-credit FK. The two terminal states are derived from approved_at /
// rejected_at (no status enum):
//   Approved → approved_at IS NOT NULL
//   Rejected → rejected_at IS NOT NULL (implies approved_at IS NULL)
// approved_at and rejected_at are mutually exclusive (enforced in the
// service layer / RPC). Customer-initiated cancels write NO row —
// cancelling is a `pending_redemption_amount := 0` on every touched
// credit row, not an audit entry.
export interface BaseCustomerCreditRedemption {
  id: number;
  customer_id: number;
  // Set by every approve / reject write path so the activity feed and
  // merchant audit feeds can join directly to merchants without going
  // back through customer_credit → branches. Nullable for legacy audit
  // rows written before this column existed; the activity feed drops
  // those (orphan audit rows from a deleted merchant aren't surfacable
  // anyway).
  merchant_id: number | null;
  amount_redeemed: number;
  approved_at: string | null;
  approved_by_staff_id: number | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  branch_id: number;
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
