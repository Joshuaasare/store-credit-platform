import { Type, Static } from '@sinclair/typebox'
import { BaseBranch, ApiErrorResponse, BaseCustomer, BaseUserProfile, BaseCustomerCredit } from './main.schema'



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

export type LeaderboardQuerystring = Static<typeof LeaderboardQuerystring>
export const LeaderboardQuerystring = LeaderboardFilters

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

export type CustomerListFilters = Static<typeof CustomerListFilters>
export const CustomerListFilters = Type.Object({
branch_id: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
search: Type.Optional(Type.Union([
Type.String(),
Type.Null()
])),
limit: Type.Optional(Type.Number()),
offset: Type.Optional(Type.Number())
})

export type CustomerListRow = Static<typeof CustomerListRow>
export const CustomerListRow = Type.Object({
customer_id: Type.Number(),
user_id: Type.Union([
Type.String(),
Type.Null()
]),
phone: Type.Union([
Type.String(),
Type.Null()
]),
user: Type.Union([
BaseUserProfile,
Type.Null()
]),
customer_name: Type.String(),
total_purchases: Type.Number(),
available_credits: Type.Number(),
live_credit_count: Type.Number(),
last_activity_epoch: Type.Union([
Type.Number(),
Type.Null()
])
})

export type CustomerListPage = Static<typeof CustomerListPage>
export const CustomerListPage = Type.Object({
rows: Type.Array(CustomerListRow),
total: Type.Number(),
offset: Type.Number(),
limit: Type.Number()
})

export type CustomerListQuerystring = Static<typeof CustomerListQuerystring>
export const CustomerListQuerystring = CustomerListFilters

export type CustomerListResponse = Static<typeof CustomerListResponse>
export const CustomerListResponse = Type.Object({
success: Type.Literal(true),
data: CustomerListPage
})

export type CustomerDetailCreditRow = Static<typeof CustomerDetailCreditRow>
export const CustomerDetailCreditRow = Type.Composite([BaseCustomerCredit, Type.Object({
redeemed_total: Type.Number(),
pending_total: Type.Number(),
remaining: Type.Number(),
branch: BaseBranch
})])

export type CustomerDetail = Static<typeof CustomerDetail>
export const CustomerDetail = Type.Object({
customer_id: Type.Number(),
user_id: Type.Union([
Type.String(),
Type.Null()
]),
phone: Type.Union([
Type.String(),
Type.Null()
]),
user: Type.Union([
BaseUserProfile,
Type.Null()
]),
customer_name: Type.String(),
total_purchases: Type.Number(),
available_credits: Type.Number(),
live_credit_count: Type.Number(),
last_activity_epoch: Type.Union([
Type.Number(),
Type.Null()
]),
credits: Type.Array(CustomerDetailCreditRow)
})

export type CustomerDetailResponse = Static<typeof CustomerDetailResponse>
export const CustomerDetailResponse = Type.Object({
success: Type.Literal(true),
data: CustomerDetail
})

export type CustomerListApiResponse = Static<typeof CustomerListApiResponse>
export const CustomerListApiResponse = Type.Union([
CustomerListResponse,
ApiErrorResponse
])

export type CustomerDetailApiResponse = Static<typeof CustomerDetailApiResponse>
export const CustomerDetailApiResponse = Type.Union([
CustomerDetailResponse,
ApiErrorResponse
])

export type GlobalCustomerSearchFilters = Static<typeof GlobalCustomerSearchFilters>
export const GlobalCustomerSearchFilters = Type.Object({
phone: Type.String(),
limit: Type.Optional(Type.Number())
})

export type GlobalCustomerSearchPage = Static<typeof GlobalCustomerSearchPage>
export const GlobalCustomerSearchPage = Type.Object({
rows: Type.Array(BaseCustomer),
total: Type.Number(),
limit: Type.Number()
})

export type GlobalCustomerSearchResponse = Static<typeof GlobalCustomerSearchResponse>
export const GlobalCustomerSearchResponse = Type.Object({
success: Type.Literal(true),
data: GlobalCustomerSearchPage
})

export type GlobalCustomerSearchApiResponse = Static<typeof GlobalCustomerSearchApiResponse>
export const GlobalCustomerSearchApiResponse = Type.Union([
GlobalCustomerSearchResponse,
ApiErrorResponse
])