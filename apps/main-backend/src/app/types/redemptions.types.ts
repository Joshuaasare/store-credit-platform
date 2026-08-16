// ────────────────────────────────────────────────────────────────────────────
// Merchant-side redemption approval queue (`/redemptions/*`)
// ────────────────────────────────────────────────────────────────────────────
// Three views on the customer-initiated redemption flow at a merchant:
//
//   1. Pending  — rows from `customer_credit_redemptions` where
//                 `approved_at IS NULL AND rejected_at IS NULL AND
//                 deleted_at IS NULL`, scoped to the merchant via the
//                 audit row's `merchant_id` column. Each row carries a
//                 4-digit `redemption_code` (NOT exposed to the
//                 webapp — see `MerchantPendingRequest` for the
//                 webapp-safe view) and a fan-out via the
//                 `customer_credit.pending_redemption_amount` slices.
//
//   2. Approved — audit feed from `customer_credit_redemptions` where
//                 `approved_at IS NOT NULL`. One row per merchant
//                 approval, joined to customer + merchant + the
//                 approving staff.
//
//   3. Rejected — audit feed from `customer_credit_redemptions` where
//                 `rejected_at IS NOT NULL`. Same shape as approved.
//
// Approve / reject are atomic single-call RPCs (`redemption_approve` /
// `redemption_reject`) that verify the customer-supplied
// `redemption_code` and stamp approved_at / rejected_at + mutate the
// customer_credit fan-out rows in one transaction.

import {
  ApiErrorResponse,
  BaseBranch,
  BaseCustomer,
  BaseCustomerCreditRedemption,
  BaseMerchant,
  BaseStaff,
  BaseUserProfile,
} from "./main.types";

// ────────────────────────────────────────────────────────────────────────────
// Pending view
// ────────────────────────────────────────────────────────────────────────────

// One pending audit row at the merchant, joined to the customer (for
// display name + phone) and the merchant. The audit row carries
// `redemption_code` (4-digit), `branch_id` (the branch the customer
// picked), and `amount_redeemed` (the customer's requested total).
//
// IMPORTANT: `redemption_code` is INTENTIONALLY OMITTED from this type
// — the code is customer-only and never returned to the webapp. The
// SQL `customer_credit_redemptions` row has it, but the merchant
// service's response shape never carries it. The merchant app reads
// the code via a separate code-entry dialog that the customer shows.
export interface MerchantPendingRequest {
  redemption_id: number;
  customer_id: number;
  branch_id: number;
  branch_name: string | null;
  amount_redeemed: number;
  requested_date: number;
  requested_at: string;
  customer: BaseCustomer & { users: BaseUserProfile | null };
  merchant: BaseMerchant;
}

export interface MerchantPendingRequestsPage {
  rows: MerchantPendingRequest[];
  total: number;
  offset: number;
  limit: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Approved / Rejected view (audit feed)
// ────────────────────────────────────────────────────────────────────────────

// One audit row joined to the customer, the merchant, and the
// approving staff. The audit row carries `branch_id` (the branch the
// customer picked on the redemption sheet).
export interface MerchantApprovedRedemption extends BaseCustomerCreditRedemption {
  customer: BaseCustomer & { users: BaseUserProfile | null };
  merchant: BaseMerchant;
  approved_by_staff: BaseStaff | null;
  branch: BaseBranch | null;
}

export interface MerchantRejectedRedemption extends BaseCustomerCreditRedemption {
  customer: BaseCustomer & { users: BaseUserProfile | null };
  merchant: BaseMerchant;
  branch: BaseBranch | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Approve / Reject request body
// ────────────────────────────────────────────────────────────────────────────

// Body for `POST /redemptions/customers/:customerId/approve` and
// `.../reject`. The merchant staff enters the 4-digit code the
// customer shows them; the SQL RPC verifies it matches the pending
// audit row at this merchant.
export interface MerchantRedemptionActionBody {
  redemption_code: number;
  redemption_id: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Filters + responses
// ────────────────────────────────────────────────────────────────────────────

export interface MerchantPendingRequestFilters {
  branch_id?: number | null;
  limit?: number;
  offset?: number;
}

export interface MerchantAuditFeedFilters {
  branch_id?: number | null;
  limit?: number;
  offset?: number;
}

export interface MerchantAuditFeedPage<T> {
  rows: T[];
  total: number;
  offset: number;
  limit: number;
}

export type MerchantPendingRequestsQuerystring = MerchantPendingRequestFilters;
export type MerchantApprovedRedemptionsQuerystring = MerchantAuditFeedFilters;
export type MerchantRejectedRedemptionsQuerystring = MerchantAuditFeedFilters;

export interface MerchantPendingRequestsResponse {
  success: true;
  data: MerchantPendingRequestsPage;
}

export interface MerchantApprovedRedemptionsResponse {
  success: true;
  data: MerchantAuditFeedPage<MerchantApprovedRedemption>;
}

export interface MerchantRejectedRedemptionsResponse {
  success: true;
  data: MerchantAuditFeedPage<MerchantRejectedRedemption>;
}

// Approve / Reject response: the audit row id + the total amount that
// was approved / rejected. The `redemption_code` is intentionally NOT
// echoed back (the merchant already supplied it).
export interface MerchantRedemptionMutationResponse {
  success: true;
  data: {
    audit_id: number;
    amount_redeemed: number;
  };
}

export type MerchantPendingRequestsApiResponse =
  | MerchantPendingRequestsResponse
  | ApiErrorResponse;
export type MerchantApprovedRedemptionsApiResponse =
  | MerchantApprovedRedemptionsResponse
  | ApiErrorResponse;
export type MerchantRejectedRedemptionsApiResponse =
  | MerchantRejectedRedemptionsResponse
  | ApiErrorResponse;
export type MerchantRedemptionMutationApiResponse =
  | MerchantRedemptionMutationResponse
  | ApiErrorResponse;
