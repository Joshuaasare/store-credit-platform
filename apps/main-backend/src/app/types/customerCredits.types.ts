import {
  ApiErrorResponse,
  BaseBranch,
  BaseCustomerCredit,
  BaseMerchant,
} from "./main.types";

// Customer-app Credits tab — every customer_credit row for the logged-in customer, split into live / expired / revoked. Row extends BaseCustomerCredit + branch/merchant joins + live remaining.

export type CustomerCreditStatus = "live" | "expired" | "revoked";

export type CustomerCreditType = "running" | "fixed" | null;

export interface CustomerCreditWithBranch extends BaseCustomerCredit {
  // branch is the issuing branch; merchant is reached via branch.merchant_id (the FK lives on branches, not customer_credit).
  branch: BaseBranch & { merchant: BaseMerchant };
  // Back-compat alias for approved_redemption_amount.
  redeemed_total: number;
  // Back-compat alias for pending_redemption_amount.
  pending_total: number;
  // max(0, credit_amount − approved − pending). Clamped at 0 so fully-redeemed credits show 0, not negative.
  remaining: number;
  // Customer-facing bucket — see CustomerCreditStatus.
  status: CustomerCreditStatus;
  // Defaults to "running"; nullable until a config_group_id link is added for fixed issuance.
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