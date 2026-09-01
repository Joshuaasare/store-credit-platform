// Merchant-side redemption approval queue (/redemptions/*). Pending/Approved/Rejected views; approve+reject are atomic RPCs that verify the customer-supplied 4-digit code and stamp the audit row + fan-out in one transaction.

import {
  ApiErrorResponse,
  BaseBranch,
  BaseCustomer,
  BaseCustomerCreditRedemption,
  BaseMerchant,
  BaseStaff,
  BaseUserProfile,
} from "./main.types";

// redemption_code is INTENTIONALLY OMITTED — the code is customer-only and never returned to the webapp. The merchant reads it via a separate code-entry dialog.
export interface MerchantPendingRequest
  extends BaseCustomerCreditRedemption {
  branch: BaseBranch | null;
  customer: (BaseCustomer & { users: BaseUserProfile | null }) | null;
  merchant: BaseMerchant;
}

export interface MerchantPendingRequestsPage {
  rows: MerchantPendingRequest[];
  total: number;
  offset: number;
  limit: number;
}

// One audit row joined to customer + merchant + the approving staff. Carries the branch the customer picked.
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

// The merchant staff enters the 4-digit code the customer shows; the RPC verifies it matches the pending audit row.
export interface MerchantRedemptionActionBody {
  redemption_code: number;
  redemption_id: number;
}

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

// redemption_code is intentionally not echoed back (the merchant already supplied it).
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
