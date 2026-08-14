// ────────────────────────────────────────────────────────────────────────────
// Customer-app redemptions feed (`/customers/me/redemptions`)
// ────────────────────────────────────────────────────────────────────────────
// Customer-scoped projection of the `customer_credit_redemptions` table,
// scoped to the logged-in customer's `customer_id` (from JWT) and filtered
// to a single merchant by branch. Powers the "Credits Redeemed" tab on the
// merchant detail screen on the customer mobile app.
//
// The status of each row is derived from `approved_at` / `rejected_at`
// (no status enum on the table itself):
//   Pending  → approved_at IS NULL AND rejected_at IS NULL
//   Approved → approved_at IS NOT NULL
//   Rejected → rejected_at IS NOT NULL (implies approved_at IS NULL)
//
// `status` on the query string accepts an additional `"all"` value that
// the service maps to "no status filter".
//
// The row shape intentionally OMITS the merchant-side `customer` join:
// the caller IS the customer, so emitting the nested customer is at best
// redundant and at worst a privacy leak (the customer_id is the auth
// identity and shouldn't echo back). Branch + merchant are kept because
// they're how the row is contextualized in the redeemed feed.

import {
  ApiErrorResponse,
  BaseBranch,
  BaseCustomerCredit,
  BaseCustomerCreditRedemption,
  BaseMerchant,
} from "./main.types";

export type CustomerRedemptionStatus = "pending" | "approved" | "rejected";

export type CustomerRedemptionStatusFilter =
  | CustomerRedemptionStatus
  | "all";

/**
 * Single-row shape for `/customers/me/redemptions`. Composed from the base
 * `customer_credit_redemption` row plus the nested `branch` (with its
 * `merchant`) and the joined `credit` (plain `BaseCustomerCredit` — no
 * extra joins — because the redemption's denormalized `branch_id` is the
 * canonical branch for the row). `remaining` is intentionally excluded:
 * the customer's redeemed feed only needs the amount + date + status, and
 * leaking per-row remaining can mis-lead the customer (a rejected row's
 * remaining is meaningless; a pending row's remaining is the live
 * snapshot at row creation, which drifts the moment anything else
 * changes on the credit).
 */
export type CustomerRedemptionRow = BaseCustomerCreditRedemption & {
  branch: BaseBranch & { merchant: BaseMerchant };
  credit: BaseCustomerCredit;
};

export interface CustomerRedemptionsResponse {
  success: true;
  data: CustomerRedemptionRow[];
}

export interface CustomerRedemptionCancelResponse {
  success: true;
  data: null;
}

export type CustomerRedemptionsApiResponse =
  | CustomerRedemptionsResponse
  | ApiErrorResponse;
