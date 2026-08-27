// Customer-app redemption-request flow — one customer_credit_redemptions row per (customer, merchant) in pending, carrying a 4-digit code. Mutations go through SQL RPCs so the audit-row write + fan-out are atomic.

import { ApiErrorResponse, BaseBranch } from "./main.types";

// Drives the redemption sheet's branch picker; small list (≤ a handful of branches).
export interface CustomerMerchantBranchesResponse {
  success: true;
  data: BaseBranch[];
}

export type CustomerMerchantBranchesApiResponse =
  | CustomerMerchantBranchesResponse
  | ApiErrorResponse;

export interface CustomerPendingRedemption {
  id: number;
  branch_id: number;
  amount_redeemed: number;
  created_at: string;
  branch: { id: number; name: string | null } | null;
  redemption_code: number;
  requested_date: number;
}

// null when there's no pending row at this merchant (idempotent on "no pending").
export interface CustomerPendingRedemptionResponse {
  success: true;
  data: CustomerPendingRedemption | null;
}

export type CustomerPendingRedemptionApiResponse =
  | CustomerPendingRedemptionResponse
  | ApiErrorResponse;

// amount is capped at the merchant's available_total + current_pending so the request can never reserve more than the customer can spend.
export interface CustomerRedemptionRequestBody {
  amount: number;
  branchId: number;
}

// The customer app uses redemption_code to display the code on the pending card.
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

// cancelled distinguishes a successful cancel from a no-op; the route is idempotent.
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

// Past approved redemptions at one merchant — one row per approved request. The 4-digit code is intentionally NOT included (used once at the till).

// approved_at is epoch ms (matches the customer-app date utils). branch.name is null when the branch was soft-deleted after the redemption (UI falls back to —).
export interface CustomerApprovedRedemption {
  id: number;
  branch_id: number;
  amount_redeemed: number;
  branch: { id: number; name: string | null } | null;
  approved_at: number;
}

// nextCursor = last item's approved_at (ms) when the page was full; null on partial/empty (end-of-feed).
export interface CustomerApprovedRedemptionPage {
  items: CustomerApprovedRedemption[];
  nextCursor: number | null;
}

export interface CustomerApprovedRedemptionResponse {
  success: true;
  data: CustomerApprovedRedemptionPage;
}

export type CustomerApprovedRedemptionApiResponse =
  | CustomerApprovedRedemptionResponse
  | ApiErrorResponse;

// cursor arrives as a string and is coerced to number in the route handler; limit defaults to 20, capped at 50.
export interface CustomerApprovedRedemptionQuerystring {
  cursor?: string | number;
  limit?: number;
}
