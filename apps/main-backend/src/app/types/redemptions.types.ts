import {
  ApiErrorResponse,
  BaseBranch,
  BaseCustomer,
  BaseCustomerCredit,
  BaseCustomerCreditRedemption,
  BaseUserProfile,
} from "./main.types";

// Redemption status is derived from approved_at / rejected_at — no status enum.
//   Pending  → approved_at IS NULL AND rejected_at IS NULL
//   Approved → approved_at IS NOT NULL
//   Rejected → rejected_at IS NOT NULL (implies approved_at IS NULL)
export type RedemptionStatus = "pending" | "approved" | "rejected";

// Nested customer shape returned on each redemption row. Mirrors the
// CustomerWithUser pattern from transactions.types.ts: the customer's
// names live on the customer row (surname / other_names), the linked user
// profile carries phone / last_login only.
export interface RedemptionCustomer extends BaseCustomer {
  users: BaseUserProfile | null;
}

// Row returned by GET /redemptions and by POST /redemptions/:id/approve|reject.
// Composed from the base redemption row + nested customer/branch/credit joins.
// `remaining` is a per-row derived field attached in the service layer:
//   remaining = credit.credit_amount − SUM(approved, non-deleted redemptions
//                on this credit, INCLUDING this row when it is approved)
// For approved rows, remaining is the live credit remaining after this and
// other approved redemptions; for rejected rows it is informational; for
// pending rows it is the credit's current remaining at list time.
// The nested `credit` is a plain BaseCustomerCredit (no extra joins) — the
// credit's branch is reached via the redemption's denormalized branch_id.
export interface RedemptionRow extends BaseCustomerCreditRedemption {
  customer: RedemptionCustomer | null;
  branch: BaseBranch | null;
  credit: BaseCustomerCredit | null;
  remaining: number;
}

export interface RedemptionsFilters {
  // Required — the page is always in one of the three tabs (no "all").
  status: RedemptionStatus;
  branch_id?: number | null;
  limit?: number;
  offset?: number;
}

export interface RedemptionsPage {
  rows: RedemptionRow[];
  total: number;
  offset: number;
  limit: number;
}

export type RedemptionsQuerystring = RedemptionsFilters;

export interface RedemptionsResponse {
  success: true;
  data: RedemptionsPage;
}

export interface RedemptionMutationResponse {
  success: true;
  data: RedemptionRow;
}

export type RedemptionsApiResponse = RedemptionsResponse | ApiErrorResponse;
export type RedemptionMutationApiResponse =
  | RedemptionMutationResponse
  | ApiErrorResponse;