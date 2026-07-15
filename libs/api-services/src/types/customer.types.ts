/**
 * Customer Management types — hand-written mirror of the backend TypeBox
 * schemas in apps/main-backend/src/app/schemas/customers.schema.ts.
 *
 * Keep in sync with the backend shapes when the schema changes.
 */

export type LeaderboardSort = "purchases" | "credits_issued" | "credits_redeemed";

export interface LeaderboardQuerystring {
  sort?: LeaderboardSort;
  branch_id?: number;
  start?: number;
  end?: number;
  limit?: number;
  offset?: number;
}

export interface TransactionsQuerystring {
  branch_id?: number;
  start?: number;
  end?: number;
  limit?: number;
  offset?: number;
}

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

export interface TransactionRow {
  id: number;
  transaction_date: number;
  amount: number;
  transaction_type: "purchase" | "credit_issue" | "credit_redeem";
  customer_id: number;
  customer_name: string | null;
  customer_phone: string | null;
  branch_id: number;
  branch_name: string | null;
  recorded_by_user_id: string | null;
  recorded_by_name: string | null;
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
  rows: TransactionRow[];
  total: number;
  offset: number;
  limit: number;
}

export interface CreatePurchaseRequest {
  phone: string;
  amount: number;
}

export interface ApiErrorPayload {
  success: false;
  error: string;
  details?: unknown[];
}

export type LeaderboardApiResponse =
  | { success: true; data: LeaderboardPage }
  | ApiErrorPayload;

export type LeaderboardStatsApiResponse =
  | { success: true; data: LeaderboardStats }
  | ApiErrorPayload;

export type TransactionsApiResponse =
  | { success: true; data: TransactionsPage }
  | ApiErrorPayload;

export type CreatePurchaseApiResponse =
  | { success: true; data: TransactionRow }
  | ApiErrorPayload;