import { Type, Static } from '@sinclair/typebox'
import { BaseBranch, ApiErrorResponse, BaseCustomer, BaseCustomerTransaction, BaseUserProfile } from './main.schema'



export type LeaderboardSort = Static<typeof LeaderboardSort>
export const LeaderboardSort = Type.Union([
Type.Literal("purchases"),
Type.Literal("credits_issued"),
Type.Literal("credits_redeemed")
])

export type LeaderboardRow = Static<typeof LeaderboardRow>
export const LeaderboardRow = Type.Object({
customer_id: Type.Number(),
phone: Type.Union([
Type.String(),
Type.Null()
]),
user_id: Type.Union([
Type.String(),
Type.Null()
]),
customer_name: Type.String(),
branch_id: Type.Union([
Type.Number(),
Type.Null()
]),
total_purchases: Type.Number(),
total_credits_issued: Type.Number(),
total_credits_redeemed: Type.Number(),
transaction_count: Type.Number()
})

export type CustomerWithUser = Static<typeof CustomerWithUser>
export const CustomerWithUser = Type.Composite([BaseCustomer, Type.Object({
users: Type.Union([
BaseUserProfile,
Type.Null()
])
})])

export type CustomerTransactions = Static<typeof CustomerTransactions>
export const CustomerTransactions = Type.Composite([BaseCustomerTransaction, Type.Object({
customer: CustomerWithUser,
branch: BaseBranch,
recorded_by_user: Type.Union([
BaseUserProfile,
Type.Null()
])
})])

export type LeaderboardFilters = Static<typeof LeaderboardFilters>
export const LeaderboardFilters = Type.Object({
sort: Type.Optional(LeaderboardSort),
branch_id: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
start: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
end: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
limit: Type.Optional(Type.Number()),
offset: Type.Optional(Type.Number())
})

export type TransactionsFilters = Static<typeof TransactionsFilters>
export const TransactionsFilters = Type.Object({
branch_id: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
start: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
end: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
limit: Type.Optional(Type.Number()),
offset: Type.Optional(Type.Number())
})

export type LeaderboardPage = Static<typeof LeaderboardPage>
export const LeaderboardPage = Type.Object({
rows: Type.Array(LeaderboardRow),
total: Type.Number(),
offset: Type.Number(),
limit: Type.Number()
})

export type LeaderboardStats = Static<typeof LeaderboardStats>
export const LeaderboardStats = Type.Object({
total_customers: Type.Number(),
total_purchases: Type.Number(),
total_credits_issued: Type.Number()
})

export type TransactionsPage = Static<typeof TransactionsPage>
export const TransactionsPage = Type.Object({
rows: Type.Array(CustomerTransactions),
total: Type.Number(),
offset: Type.Number(),
limit: Type.Number()
})

export type CreatePurchaseRequest = Static<typeof CreatePurchaseRequest>
export const CreatePurchaseRequest = Type.Object({
phone: Type.String(),
amount: Type.Number(),
branch_id: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
]))
})

export type LeaderboardQuerystring = Static<typeof LeaderboardQuerystring>
export const LeaderboardQuerystring = LeaderboardFilters

export type TransactionsQuerystring = Static<typeof TransactionsQuerystring>
export const TransactionsQuerystring = TransactionsFilters

export type LeaderboardResponse = Static<typeof LeaderboardResponse>
export const LeaderboardResponse = Type.Object({
success: Type.Literal(true),
data: LeaderboardPage
})

export type LeaderboardStatsResponse = Static<typeof LeaderboardStatsResponse>
export const LeaderboardStatsResponse = Type.Object({
success: Type.Literal(true),
data: LeaderboardStats
})

export type TransactionsResponse = Static<typeof TransactionsResponse>
export const TransactionsResponse = Type.Object({
success: Type.Literal(true),
data: TransactionsPage
})

export type CreatePurchaseResponse = Static<typeof CreatePurchaseResponse>
export const CreatePurchaseResponse = Type.Object({
success: Type.Literal(true),
data: CustomerTransactions
})

export type LeaderboardApiResponse = Static<typeof LeaderboardApiResponse>
export const LeaderboardApiResponse = Type.Union([
LeaderboardResponse,
ApiErrorResponse
])

export type LeaderboardStatsApiResponse = Static<typeof LeaderboardStatsApiResponse>
export const LeaderboardStatsApiResponse = Type.Union([
LeaderboardStatsResponse,
ApiErrorResponse
])

export type TransactionsApiResponse = Static<typeof TransactionsApiResponse>
export const TransactionsApiResponse = Type.Union([
TransactionsResponse,
ApiErrorResponse
])

export type CreatePurchaseApiResponse = Static<typeof CreatePurchaseApiResponse>
export const CreatePurchaseApiResponse = Type.Union([
CreatePurchaseResponse,
ApiErrorResponse
])