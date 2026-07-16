import {
  ApiErrorResponse,
  BaseCustomer,
  BaseCustomerTransaction,
  BaseUserProfile,
  BaseBranch,
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

export interface CustomerWithUser extends BaseCustomer {
  users: BaseUserProfile | null;
}

export interface CustomerTransactions extends BaseCustomerTransaction {
  customer: CustomerWithUser;
  branch: BaseBranch;
  recorded_by_user: BaseUserProfile | null;
}

export interface LeaderboardFilters {
  sort?: LeaderboardSort;
  branch_id?: number | null;
  start?: number | null;
  end?: number | null;
  limit?: number;
  offset?: number;
}

export interface TransactionsFilters {
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

export interface TransactionsPage {
  rows: CustomerTransactions[];
  total: number;
  offset: number;
  limit: number;
}

export interface CreatePurchaseRequest {
  phone: string;
  amount: number;
}

export type LeaderboardQuerystring = LeaderboardFilters;

export type TransactionsQuerystring = TransactionsFilters;

export interface LeaderboardResponse {
  success: true;
  data: LeaderboardPage;
}

export interface LeaderboardStatsResponse {
  success: true;
  data: LeaderboardStats;
}

export interface TransactionsResponse {
  success: true;
  data: TransactionsPage;
}

export interface CreatePurchaseResponse {
  success: true;
  data: CustomerTransactions;
}

export type LeaderboardApiResponse = LeaderboardResponse | ApiErrorResponse;
export type LeaderboardStatsApiResponse =
  | LeaderboardStatsResponse
  | ApiErrorResponse;
export type TransactionsApiResponse = TransactionsResponse | ApiErrorResponse;
export type CreatePurchaseApiResponse =
  | CreatePurchaseResponse
  | ApiErrorResponse;
