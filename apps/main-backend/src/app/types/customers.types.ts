import {
  ApiErrorResponse,
  BaseBranch,
  BaseCustomer,
  BaseCustomerCredit,
  BaseUserProfile,
} from "./main.types";

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

export type LeaderboardQuerystring = LeaderboardFilters;

export interface LeaderboardResponse {
  success: true;
  data: LeaderboardPage;
}

export interface LeaderboardStatsResponse {
  success: true;
  data: LeaderboardStats;
}

export type LeaderboardApiResponse = LeaderboardResponse | ApiErrorResponse;
export type LeaderboardStatsApiResponse =
  | LeaderboardStatsResponse
  | ApiErrorResponse;

// Customer directory (/customers). A customer appears iff they have ≥1 non-deleted purchase at a merchant branch. List aggregates are branch-scoped; detail aggregates are merchant-wide.

export interface CustomerListFilters {
  // null/undefined = all merchant branches; a number = that branch only.
  branch_id?: number | null;
  // Substring match on customer surname, other_names, or phone. Empty/null disables search.
  search?: string | null;
  limit?: number;
  offset?: number;
}

// From the get_customers RPC (pagination total extracted into CustomerListPage.total). user is null for walk-in customers; phone/user_id stay top-level for back-compat.
export interface CustomerListRow {
  customer_id: number;
  user_id: string | null;
  phone: string | null;
  user: BaseUserProfile | null;
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

// Extends BaseCustomerCredit + live remaining/redeemed_total + nested branch. remaining clamped at 0; expires_at is epoch ms (null = lifetime).
export interface CustomerDetailCreditRow extends BaseCustomerCredit {
  redeemed_total: number;
  pending_total: number;
  remaining: number;
  branch: BaseBranch;
}

export interface CustomerDetail {
  customer_id: number;
  user_id: string | null;
  phone: string | null;
  user: BaseUserProfile | null;
  customer_name: string;
  // Merchant-wide totals (the detail page shows the full picture across every branch of the merchant).
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
export type CustomerDetailApiResponse =
  | CustomerDetailResponse
  | ApiErrorResponse;

// /customers/global-search: any authenticated merchant user can look up
// customers by phone digits (no merchant scoping) so the Add-a-purchase
// typeahead can surface customers who haven't shopped at this merchant yet.
export interface GlobalCustomerSearchFilters {
  phone: string;
  limit?: number;
}

export interface GlobalCustomerSearchPage {
  rows: BaseCustomer[];
  total: number;
  limit: number;
}

export interface GlobalCustomerSearchResponse {
  success: true;
  data: GlobalCustomerSearchPage;
}

export type GlobalCustomerSearchApiResponse =
  | GlobalCustomerSearchResponse
  | ApiErrorResponse;
