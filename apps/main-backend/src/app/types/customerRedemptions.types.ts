// ────────────────────────────────────────────────────────────────────────────
// Customer-app pending-request endpoints (`/customers/me/merchants/:merchantId/redemptions`)
// ────────────────────────────────────────────────────────────────────────────
// The customer app's "redeem at merchant" flow is no longer row-based.
// There's no per-redemption-row CRUD anymore — instead:
//
//   POST   /customers/me/merchants/:merchantId/redemptions   — create
//   PATCH  /customers/me/merchants/:merchantId/redemptions   — edit (upsert)
//   DELETE /customers/me/merchants/:merchantId/redemptions   — cancel
//
// All three funnel through `redemption_fan_out(customerId, merchantId,
// amount)` which walks the merchant's credit rows oldest-expiry-first
// and writes `pending_redemption_amount` to each. The fan-out is
// idempotent: amount = 0 zeroes every row (cancel), amount = same
// produces the same allocation (no-op), amount = different re-splits.
//
// Pending state is derived from the `customer_credit` row's
// `pending_redemption_amount` column — the customer app reads it via
// `/customers/me/credits` (live rows expose the pending slice directly)
// rather than a dedicated pending endpoint.

import {
  ApiErrorResponse,
  BaseBranch,
  BaseCustomerCredit,
  BaseMerchant,
} from "./main.types";

// Body for create / edit. Amount is in the same scale as
// credit_amount (numeric, 2 decimal places). The server caps the
// amount at the merchant's `available_total + current_pending` so the
// request can never reserve more than the customer can spend at the
// merchant.
export interface CustomerPendingRequestAmountBody {
  amount: number;
}

// Result of create / edit / cancel. Mirrors the merchant Pending view
// but customer-scoped (no nested customer row — the caller IS the
// customer). `requested_amount` is 0 on cancel; on create/edit it's
// the sum of `pending_credit_breakdown[].pending_redemption_amount`.
export interface CustomerPendingRequestResult {
  merchant_id: number;
  requested_amount: number;
  pending_credit_breakdown: (BaseCustomerCredit & { branch: BaseBranch })[];
  merchant: BaseMerchant;
}

export interface CustomerPendingRequestMutationResponse {
  success: true;
  data: CustomerPendingRequestResult;
}

export type CustomerPendingRequestMutationApiResponse =
  | CustomerPendingRequestMutationResponse
  | ApiErrorResponse;
