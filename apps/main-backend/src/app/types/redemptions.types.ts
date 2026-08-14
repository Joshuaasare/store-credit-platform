// ────────────────────────────────────────────────────────────────────────────
// Merchant-side redemption approval queue (`/merchants/:merchantId/...`)
// ────────────────────────────────────────────────────────────────────────────
// Three views on the customer-initiated redemption flow at a merchant:
//
//   1. Pending  — one row per (customer, merchant) pair where any
//                 customer_credit row at the merchant has
//                 pending_redemption_amount > 0. Pending is no longer
//                 a row in customer_credit_redemptions; it's the
//                 implicit set of fan-out rows. `requested_amount` is
//                 the sum of pending_redemption_amount across the
//                 touched credit rows; `pending_credit_breakdown` is
//                 the per-credit breakdown for the UI.
//
//   2. Approved — audit feed from customer_credit_redemptions where
//                 approved_at IS NOT NULL. One row per merchant
//                 approval, joined to customer + merchant + the
//                 approving staff.
//
//   3. Rejected — audit feed from customer_credit_redemptions where
//                 rejected_at IS NOT NULL. Same shape as approved.
//
// Approve / reject are atomic single-call RPCs (`redemption_approve` /
// `redemption_reject`) that write the audit row + update touched
// customer_credit rows in one transaction.

import {
  ApiErrorResponse,
  BaseBranch,
  BaseCustomer,
  BaseCustomerCredit,
  BaseCustomerCreditRedemption,
  BaseMerchant,
  BaseStaff,
  BaseUserProfile,
} from "./main.types";

// ────────────────────────────────────────────────────────────────────────────
// Pending view
// ────────────────────────────────────────────────────────────────────────────

// One customer_credit row at the merchant that holds a slice of the
// pending request. The customer app's confirm-step shows this fan-out
// preview; the merchant's Pending tab carries it as a per-row
// breakdown so the approver can see which credits will be touched.
export interface PendingCreditBreakdown extends BaseCustomerCredit {
  branch: BaseBranch;
}

export interface MerchantPendingRequest {
  customer_id: number;
  requested_amount: number;
  // Sum of requested_amount across every customer credit row that has
  // pending_redemption_amount > 0 at this merchant. Always equals
  // requested_amount by construction.
  pending_credit_breakdown: PendingCreditBreakdown[];
  // Created-at of the OLDEST touched credit row (the row the fan-out
  // picked first). The merchant UI sorts Pending by this timestamp so
  // the longest-waiting requests surface first.
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
// approving staff. `branch` is the customer's primary branch at the
// merchant — derived from the customer's most recent credit row at
// this merchant (no `branch_id` lives on the audit row anymore).
export interface MerchantApprovedRedemption extends BaseCustomerCreditRedemption {
  customer: BaseCustomer & { users: BaseUserProfile | null };
  merchant: BaseMerchant;
  approved_by_staff: BaseStaff | null;
}

export interface MerchantRejectedRedemption extends BaseCustomerCreditRedemption {
  customer: BaseCustomer & { users: BaseUserProfile | null };
  merchant: BaseMerchant;
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

// Approve / Reject response: the resulting state of the (customer,
// merchant) pair after the mutation. The pending breakdown now shows
// no pending rows for the merchant approval, or the requested amount
// has been cleared on the merchant reject.
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
