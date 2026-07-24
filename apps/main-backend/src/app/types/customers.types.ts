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
  branch_id?: number | null;
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
export type TransactionsApiResponse = TransactionsResponse | ApiErrorResponse;
export type CreatePurchaseApiResponse =
  | CreatePurchaseResponse
  | ApiErrorResponse;
export type CreateRedemptionApiResponse =
  | CreateRedemptionResponse
  | ApiErrorResponse;
export type CreditRemainingApiResponse =
  | CreditRemainingApiResponseData
  | ApiErrorResponse;
