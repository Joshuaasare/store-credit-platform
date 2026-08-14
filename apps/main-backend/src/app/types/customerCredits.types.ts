import {
  ApiErrorResponse,
  BaseBranch,
  BaseCustomerCredit,
  BaseMerchant,
} from "./main.types";

// ────────────────────────────────────────────────────────────────────────────
// Customer-app Credits screen (`/customers/me/credits`)
// ────────────────────────────────────────────────────────────────────────────
// The customer-app Credits tab lists every `customer_credit` row belonging to
// the logged-in customer, split into `live` and `expired` arrays. The composed
// row extends `BaseCustomerCredit` (so any column added to the
// BASE_CUSTOMER_CREDIT fragment + base type auto-propagates) and adds the
// nested `branch` + `merchant` joins and the live `remaining` aggregate.
//
// After the row-state collapse the redemption slice lives on the credit
// row itself:
//   `approved_redemption_amount`  — already deducted (formerly the SUM
//                                   of approved customer_credit_redemptions
//                                   rows per credit)
//   `pending_redemption_amount`   — currently reserved by a pending request
//                                   at this customer + merchant
// The composed row exposes both columns directly (auto-propagated from
// BaseCustomerCredit) and also keeps `redeemed_total` / `pending_total`
// as back-compat aliases (equal to the corresponding column on the row)
// so any older frontend code that still reads them doesn't break.
//
// `credit_type` distinguishes credits issued from a running_credit_config
// ("running") vs a fixed_credit_config ("fixed"). The current schema does not
// store a FK from `customer_credit` to either config table — only
// `issueRunningCreditsForPurchase` writes to `customer_credit` today, so the
// service defaults the value to `"running"` and the field stays nullable so
// future fixed-issuance flows can surface `"fixed"` once a config_group_id
// link is added.
//
// `status` is the customer-facing bucket:
//   - "live"    → not deleted, not revoked, expires_at null or in the future
//   - "expired"→ expires_at in the past (and not revoked / not deleted)
//   - "revoked"→ revoked_at is set
// `deleted_at` rows are excluded entirely (soft-deleted credits are not
// shown to the customer).
//
// `expires_at` is Unix epoch seconds (nullable = lifetime credit). The
// frontend uses it to render the expiry / revocation date on each card.

export type CustomerCreditStatus = "live" | "expired" | "revoked";

export type CustomerCreditType = "running" | "fixed" | null;

export interface CustomerCreditWithBranch extends BaseCustomerCredit {
  // Nested joins — branch is the issuing branch, merchant is reached via
  // branch.merchant_id (the FK lives on branches, not on customer_credit).
  branch: BaseBranch & { merchant: BaseMerchant };
  // Back-compat alias for `approved_redemption_amount` (the SUM of
  // approved redemptions this credit has ever had). Kept as a separate
  // field so older frontend code keeps working — equal to the row's
  // `approved_redemption_amount`.
  redeemed_total: number;
  // Back-compat alias for `pending_redemption_amount` (the slice of this
  // credit currently reserved by a pending request). Equal to the row's
  // `pending_redemption_amount`.
  pending_total: number;
  // max(0, credit_amount - approved_redemption_amount - pending_redemption_amount).
  // Clamped at 0 so fully-redeemed credits still appear with a 0
  // remaining rather than a negative.
  remaining: number;
  // Customer-facing bucket — see CustomerCreditStatus above.
  status: CustomerCreditStatus;
  // Running vs fixed — see note on CustomerCreditType above.
  credit_type: CustomerCreditType;
}

export interface CustomerCredits {
  live: CustomerCreditWithBranch[];
  expired: CustomerCreditWithBranch[];
}

export interface CustomerCreditsResponse {
  success: true;
  data: CustomerCredits;
}

export type CustomerCreditsApiResponse =
  | CustomerCreditsResponse
  | ApiErrorResponse;