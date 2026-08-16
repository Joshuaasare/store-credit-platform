import {
  ApiErrorResponse,
  BaseCustomer,
  BaseCustomerTransaction,
  BaseStaff,
  BaseUserProfile,
  BaseBranch,
} from "./main.types";

export interface CustomerWithUser extends BaseCustomer {
  users: BaseUserProfile | null;
}

export interface CustomerTransactions extends BaseCustomerTransaction {
  customer: CustomerWithUser;
  branch: BaseBranch;
  recorded_by_staff?: BaseStaff | null;
  approved_by_staff?: BaseStaff | null;
}

// Server-side filter on the activity feed. "all" returns the full union;
// the other values filter to a single kind before pagination so `total`
// and the returned page reflect only that kind.
export type TransactionTypeFilter =
  | "all"
  | "purchase"
  | "credit_issue"
  | "credit_redeem";

export interface TransactionsFilters {
  type?: TransactionTypeFilter;
  branch_id?: number | null;
  start?: number | null;
  end?: number | null;
  limit?: number;
  offset?: number;
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

export type TransactionsQuerystring = TransactionsFilters;

export interface TransactionsResponse {
  success: true;
  data: TransactionsPage;
}

export interface CreatePurchaseResponse {
  success: true;
  data: CustomerTransactions;
}

export type TransactionsApiResponse = TransactionsResponse | ApiErrorResponse;
export type CreatePurchaseApiResponse =
  | CreatePurchaseResponse
  | ApiErrorResponse;
