import { Type, Static } from "@sinclair/typebox";
import { ApiErrorResponse } from "./main.schema";

// ────────────────────────────────────────────────────────────────────────────
// Querystring / sort types
// ────────────────────────────────────────────────────────────────────────────

export type LeaderboardSort = Static<typeof LeaderboardSort>;
export const LeaderboardSort = Type.Union([
  Type.Literal("purchases"),
  Type.Literal("credits_issued"),
  Type.Literal("credits_redeemed"),
]);

export type LeaderboardQuerystring = Static<typeof LeaderboardQuerystring>;
export const LeaderboardQuerystring = Type.Object({
  sort: Type.Optional(LeaderboardSort),
  branch_id: Type.Optional(Type.Number()),
  start: Type.Optional(Type.Number()),
  end: Type.Optional(Type.Number()),
  limit: Type.Optional(Type.Number()),
  offset: Type.Optional(Type.Number()),
});

export type TransactionsQuerystring = Static<typeof TransactionsQuerystring>;
export const TransactionsQuerystring = Type.Object({
  branch_id: Type.Optional(Type.Number()),
  start: Type.Optional(Type.Number()),
  end: Type.Optional(Type.Number()),
  limit: Type.Optional(Type.Number()),
  offset: Type.Optional(Type.Number()),
});

// ────────────────────────────────────────────────────────────────────────────
// Row shapes
// ────────────────────────────────────────────────────────────────────────────

export type LeaderboardRow = Static<typeof LeaderboardRow>;
export const LeaderboardRow = Type.Object({
  customer_id: Type.Number(),
  phone: Type.Union([Type.String(), Type.Null()]),
  user_id: Type.Union([Type.String(), Type.Null()]),
  customer_name: Type.String(),
  branch_id: Type.Union([Type.Number(), Type.Null()]),
  total_purchases: Type.Number(),
  total_credits_issued: Type.Number(),
  total_credits_redeemed: Type.Number(),
  transaction_count: Type.Number(),
});

export type TransactionRow = Static<typeof TransactionRow>;
export const TransactionRow = Type.Object({
  id: Type.Number(),
  transaction_date: Type.Number(),
  amount: Type.Number(),
  transaction_type: Type.Union([
    Type.Literal("purchase"),
    Type.Literal("credit_issue"),
    Type.Literal("credit_redeem"),
  ]),
  customer_id: Type.Number(),
  customer_name: Type.Union([Type.String(), Type.Null()]),
  customer_phone: Type.Union([Type.String(), Type.Null()]),
  branch_id: Type.Number(),
  branch_name: Type.Union([Type.String(), Type.Null()]),
  recorded_by_user_id: Type.Union([Type.String(), Type.Null()]),
  recorded_by_name: Type.Union([Type.String(), Type.Null()]),
});

// ────────────────────────────────────────────────────────────────────────────
// Response envelopes
// ────────────────────────────────────────────────────────────────────────────

export type LeaderboardResponse = Static<typeof LeaderboardResponse>;
export const LeaderboardResponse = Type.Object({
  success: Type.Literal(true),
  data: Type.Object({
    rows: Type.Array(LeaderboardRow),
    total: Type.Number(),
    offset: Type.Number(),
    limit: Type.Number(),
  }),
});

export type LeaderboardStatsResponse = Static<typeof LeaderboardStatsResponse>;
export const LeaderboardStatsResponse = Type.Object({
  success: Type.Literal(true),
  data: Type.Object({
    total_customers: Type.Number(),
    total_purchases: Type.Number(),
    total_credits_issued: Type.Number(),
  }),
});

export type TransactionsResponse = Static<typeof TransactionsResponse>;
export const TransactionsResponse = Type.Object({
  success: Type.Literal(true),
  data: Type.Object({
    rows: Type.Array(TransactionRow),
    total: Type.Number(),
    offset: Type.Number(),
    limit: Type.Number(),
  }),
});

export type CreatePurchaseRequest = Static<typeof CreatePurchaseRequest>;
export const CreatePurchaseRequest = Type.Object({
  phone: Type.String({ minLength: 6 }),
  amount: Type.Number({ minimum: 0.01 }),
});

export type CreatePurchaseResponse = Static<typeof CreatePurchaseResponse>;
export const CreatePurchaseResponse = Type.Object({
  success: Type.Literal(true),
  data: TransactionRow,
});

// ────────────────────────────────────────────────────────────────────────────
// API response unions (success | ApiErrorResponse)
// ────────────────────────────────────────────────────────────────────────────

export type LeaderboardApiResponse = Static<typeof LeaderboardApiResponse>;
export const LeaderboardApiResponse = Type.Union([
  LeaderboardResponse,
  ApiErrorResponse,
]);

export type LeaderboardStatsApiResponse = Static<
  typeof LeaderboardStatsApiResponse
>;
export const LeaderboardStatsApiResponse = Type.Union([
  LeaderboardStatsResponse,
  ApiErrorResponse,
]);

export type TransactionsApiResponse = Static<typeof TransactionsApiResponse>;
export const TransactionsApiResponse = Type.Union([
  TransactionsResponse,
  ApiErrorResponse,
]);

export type CreatePurchaseApiResponse = Static<
  typeof CreatePurchaseApiResponse
>;
export const CreatePurchaseApiResponse = Type.Union([
  CreatePurchaseResponse,
  ApiErrorResponse,
]);