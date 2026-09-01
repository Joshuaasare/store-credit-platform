import {
  ApiErrorResponse,
  BaseBranch,
  BaseCustomerCredit,
  BaseMerchant,
} from "./main.types";

// Customer-app Credits tab — every customer_credit row for the logged-in customer, split into live / expired / revoked. Row extends BaseCustomerCredit + branch/merchant joins + live remaining.

export type CustomerCreditStatus = "live" | "expired" | "revoked";

export type CustomerCreditType = "running" | "fixed" | null;

export type CustomerCreditWithBranch = BaseCustomerCredit & {
  branch: BaseBranch & { merchant: BaseMerchant };
  redeemed_total: number;
  pending_total: number;
  remaining: number;
  status: CustomerCreditStatus;
  credit_type: CustomerCreditType;
};

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
