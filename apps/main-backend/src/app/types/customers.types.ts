import { ApiErrorResponse } from "./main.types";

export type LeaderboardSort =
  | "purchases"
  | "credits_issued"
  | "credits_redeemed";

export interface LeaderboardRow {
  customer_id: number;
  phone: string | null;
  user_id: string | null;
  customer_name: string;
  branch_id: number | null;
  total_purchases: number;
  total_credits_issued: number;
  total_credits_redeemed: number;
  transaction_count: number;
}

export interface LeaderboardFilters {
  sort?: LeaderboardSort;
  branch_id?: number | null;
  start?: number | null;
  end?: number | null;
  limit?: number;
  offset?: number;
}

export interface LeaderboardPage {
  rows: LeaderboardRow[];
  total: number;
  offset: number;
  limit: number;
}

export interface LeaderboardStats {
  total_customers: number;
  total_purchases: number;
  total_credits_issued: number;
}

// Records a redemption against a specific customer_credit row. The webapp
// auto-approves on creation (approved_at = now(), approved_by_user_id = caller)
// — the approved_at column exists so a future customer-initiated flow can
// record pending redemptions that await manager approval.
export interface CreateRedemptionRequest {
  credit_id: number;
  amount_redeemed: number;
}

// Live "remaining credit" snapshot for a single customer_credit row.
//   remaining       = credit_amount − redeemed_total
//   redeemed_total  = SUM(amount_redeemed) WHERE approved_at IS NOT NULL
//                     AND deleted_at IS NULL
export interface CreditRemainingResponse {
  credit_id: number;
  customer_id: number;
  branch_id: number;
  credit_amount: number;
  redeemed_total: number;
  remaining: number;
}

export type LeaderboardQuerystring = LeaderboardFilters;

export interface LeaderboardResponse {
  success: true;
  data: LeaderboardPage;
}

export interface LeaderboardStatsResponse {
  success: true;
  data: LeaderboardStats;
}

export interface CreateRedemptionResponse {
  success: true;
  data: CreditRemainingResponse;
}

export interface CreditRemainingApiResponseData {
  success: true;
  data: CreditRemainingResponse;
}

export type LeaderboardApiResponse = LeaderboardResponse | ApiErrorResponse;
export type LeaderboardStatsApiResponse =
  | LeaderboardStatsResponse
  | ApiErrorResponse;
export type CreateRedemptionApiResponse =
  | CreateRedemptionResponse
  | ApiErrorResponse;
export type CreditRemainingApiResponse =
  | CreditRemainingApiResponseData
  | ApiErrorResponse;

// ────────────────────────────────────────────────────────────────────────────
// Customer directory (/customers) — list + detail
// ────────────────────────────────────────────────────────────────────────────
// A customer appears in the directory iff they have ≥1 non-deleted purchase at
// a merchant branch. List aggregates are scoped to the branch filter; detail
// aggregates are merchant-wide for that customer.

export interface CustomerListFilters {
  // null/undefined = all merchant branches; a number = that branch only.
  branch_id?: number | null;
  // Substring match on customer surname, other_names, or phone. Empty/null
  // disables search.
  search?: string | null;
  limit?: number;
  offset?: number;
}

// Row shape returned by the get_customers RPC (minus the pagination `total`
// column, which is extracted into CustomerListPage.total).
export interface CustomerListRow {
  customer_id: number;
  phone: string | null;
  user_id: string | null;
  customer_name: string;
  total_purchases: number;
  available_credits: number;
  live_credit_count: number;
  last_activity_epoch: number | null;
}

export interface CustomerListPage {
  rows: CustomerListRow[];
  total: number;
  offset: number;
  limit: number;
}

export type CustomerListQuerystring = CustomerListFilters;

export interface CustomerListResponse {
  success: true;
  data: CustomerListPage;
}

// A single live credit row on the detail page. `remaining` is clamped at 0
// per credit; fully-redeemed credits (remaining = 0) are still listed but
// rendered greyed. `expires_at` is Unix epoch seconds; null = lifetime.
export interface CustomerDetailCreditRow {
  id: number;
  credit_amount: number;
  redeemed_total: number;
  remaining: number;
  expires_at: number | null;
  created_at: string;
  branch_id: number;
  branch_name: string | null;
}

export interface CustomerDetail {
  customer_id: number;
  phone: string | null;
  user_id: string | null;
  customer_name: string;
  // Merchant-wide totals for this customer (NOT branch-scoped — the detail
  // page shows the full picture across every branch of the merchant).
  total_purchases: number;
  available_credits: number;
  live_credit_count: number;
  last_activity_epoch: number | null;
  credits: CustomerDetailCreditRow[];
}

export interface CustomerDetailResponse {
  success: true;
  data: CustomerDetail;
}

export type CustomerListApiResponse = CustomerListResponse | ApiErrorResponse;
export type CustomerDetailApiResponse = CustomerDetailResponse | ApiErrorResponse;