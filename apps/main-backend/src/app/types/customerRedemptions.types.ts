// ────────────────────────────────────────────────────────────────────────────
// Customer-app redemption-request endpoints
// (`/customers/me/merchants/:merchantId/*`)
// ────────────────────────────────────────────────────────────────────────────
// The customer-app "redeem at merchant" flow is row-based — there's one
// `customer_credit_redemptions` row per (customer, merchant) pair in the
// pending state. The row carries a 4-digit code that's shown on the
// customer's pending card; the merchant enters the same code at approve
// or reject time.
//
// Two query endpoints (`GET .../branches`, `GET .../redemptions/pending`)
// and three mutation endpoints (`POST/PATCH/DELETE .../redemptions`).
// Mutations go through SQL RPCs (`redemption_request_create`,
// `redemption_request_update`, `redemption_request_cancel`) so the
// audit-row write + fan-out happen atomically.

import { ApiErrorResponse, BaseBranch } from "./main.types";

// ────────────────────────────────────────────────────────────────────────────
// GET .../branches
// ────────────────────────────────────────────────────────────────────────────

// List of non-deleted branches at the merchant — drives the redemption
// sheet's branch picker. Customer-app renders one picker per merchant
// detail screen; the list is small (≤ a handful of branches).
export interface CustomerMerchantBranchesResponse {
  success: true;
  data: BaseBranch[];
}

export type CustomerMerchantBranchesApiResponse =
  | CustomerMerchantBranchesResponse
  | ApiErrorResponse;

// ────────────────────────────────────────────────────────────────────────────
// GET .../redemptions/pending
// ────────────────────────────────────────────────────────────────────────────

// Customer-facing view of the pending redemption row at one merchant.
// Carries the 4-digit code so the customer can show it to the merchant
// at the till. The webapp MUST NOT see this — the code is customer-only.
export interface CustomerPendingRedemption {
  redemption_code: number;
  redemption_id: number;
  branch_id: number;
  branch_name: string | null;
  amount_redeemed: number;
  requested_date: number;
  requested_at: string;
}

// Wrapped success shape: `{ success: true, data: <pending|null> }`.
// `null` when there's no pending row at this merchant. The wrapper
// always resolves (the route is idempotent on "no pending").
export interface CustomerPendingRedemptionResponse {
  success: true;
  data: CustomerPendingRedemption | null;
}

export type CustomerPendingRedemptionApiResponse =
  | CustomerPendingRedemptionResponse
  | ApiErrorResponse;

// ────────────────────────────────────────────────────────────────────────────
// POST/PATCH .../redemptions
// ────────────────────────────────────────────────────────────────────────────

// Body for create / edit. `branchId` is now required (the customer
// picks the branch on the redemption sheet). `amount` is in the same
// scale as `credit_amount` (numeric, 2 decimal places). The server
// caps the amount at the merchant's `available_total + current_pending`
// so the request can never reserve more than the customer can spend at
// the merchant.
export interface CustomerRedemptionRequestBody {
  amount: number;
  branchId: number;
}

// Result of create / edit. Returns the audit row from the SQL RPC —
// the customer app uses `redemption_code` to display the code on the
// pending card.
export interface CustomerRedemptionRequestResult {
  audit_id: number;
  redemption_code: number;
  requested_date: number;
  branch_id: number;
  amount_redeemed: number;
  requested_at: string;
}

export interface CustomerRedemptionRequestMutationResponse {
  success: true;
  data: CustomerRedemptionRequestResult;
}

export type CustomerRedemptionRequestMutationApiResponse =
  | CustomerRedemptionRequestMutationResponse
  | ApiErrorResponse;

// ────────────────────────────────────────────────────────────────────────────
// DELETE .../redemptions
// ────────────────────────────────────────────────────────────────────────────

// DELETE returns the wrapped success with a `cancelled` boolean so the
// customer app can distinguish a successful cancel from a no-op. The
// route is idempotent (no-op if no pending).
export interface CustomerRedemptionCancelResult {
  cancelled: boolean;
}

export interface CustomerRedemptionCancelResponse {
  success: true;
  data: CustomerRedemptionCancelResult;
}

export type CustomerRedemptionCancelApiResponse =
  | CustomerRedemptionCancelResponse
  | ApiErrorResponse;
