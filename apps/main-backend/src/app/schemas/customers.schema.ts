import { Type, Static } from '@sinclair/typebox'
import { ApiErrorResponse } from './main.schema'



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

export type CreateRedemptionRequest = Static<typeof CreateRedemptionRequest>
export const CreateRedemptionRequest = Type.Object({
credit_id: Type.Number(),
amount_redeemed: Type.Number()
})

export type CreditRemainingResponse = Static<typeof CreditRemainingResponse>
export const CreditRemainingResponse = Type.Object({
credit_id: Type.Number(),
customer_id: Type.Number(),
branch_id: Type.Number(),
credit_amount: Type.Number(),
redeemed_total: Type.Number(),
remaining: Type.Number()
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

export type CreateRedemptionResponse = Static<typeof CreateRedemptionResponse>
export const CreateRedemptionResponse = Type.Object({
success: Type.Literal(true),
data: CreditRemainingResponse
})

export type CreditRemainingApiResponseData = Static<typeof CreditRemainingApiResponseData>
export const CreditRemainingApiResponseData = Type.Object({
success: Type.Literal(true),
data: CreditRemainingResponse
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

export type CreateRedemptionApiResponse = Static<typeof CreateRedemptionApiResponse>
export const CreateRedemptionApiResponse = Type.Union([
CreateRedemptionResponse,
ApiErrorResponse
])

export type CreditRemainingApiResponse = Static<typeof CreditRemainingApiResponse>
export const CreditRemainingApiResponse = Type.Union([
CreditRemainingApiResponseData,
ApiErrorResponse
])