import { Type, Static } from '@sinclair/typebox'
import { BaseMerchant, BaseBranch, ApiErrorResponse } from './main.schema'



export type BranchWithAggregates = Static<typeof BranchWithAggregates>
export const BranchWithAggregates = Type.Composite([BaseBranch, Type.Object({
staff_count: Type.Number(),
customer_count: Type.Number(),
credit_issued_this_month: Type.Number(),
last_activity_date: Type.Union([
Type.String(),
Type.Null()
])
})])

export type BranchListResponse = Static<typeof BranchListResponse>
export const BranchListResponse = Type.Object({
success: Type.Literal(true),
data: Type.Array(BranchWithAggregates)
})

export type BranchMutationResponse = Static<typeof BranchMutationResponse>
export const BranchMutationResponse = Type.Object({
success: Type.Literal(true),
data: BranchWithAggregates
})

export type CreateBranchRequest = Static<typeof CreateBranchRequest>
export const CreateBranchRequest = Type.Object({
name: Type.String(),
phone: Type.Optional(Type.String()),
address: Type.Optional(Type.String()),
city: Type.String(),
country_code: Type.String(),
latitude: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
longitude: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
place_id: Type.Optional(Type.Union([
Type.String(),
Type.Null()
]))
})

export type UpdateBranchRequest = Static<typeof UpdateBranchRequest>
export const UpdateBranchRequest = Type.Object({
name: Type.Optional(Type.String()),
phone: Type.Optional(Type.String()),
address: Type.Optional(Type.String()),
city: Type.Optional(Type.String()),
country_code: Type.Optional(Type.String()),
latitude: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
longitude: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
place_id: Type.Optional(Type.Union([
Type.String(),
Type.Null()
]))
})

export type ExploreBranchOffersSummary = Static<typeof ExploreBranchOffersSummary>
export const ExploreBranchOffersSummary = Type.Object({
count: Type.Number()
})

export type ExploreBranch = Static<typeof ExploreBranch>
export const ExploreBranch = Type.Object({
branch: BaseBranch,
merchant: BaseMerchant,
offers_summary: ExploreBranchOffersSummary,
distance_km: Type.Union([
Type.Number(),
Type.Null()
])
})

export type CustomerExploreBranchesResponse = Static<typeof CustomerExploreBranchesResponse>
export const CustomerExploreBranchesResponse = Type.Object({
success: Type.Literal(true),
data: Type.Array(ExploreBranch)
})

export type BranchListApiResponse = Static<typeof BranchListApiResponse>
export const BranchListApiResponse = Type.Union([
BranchListResponse,
ApiErrorResponse
])

export type BranchMutationApiResponse = Static<typeof BranchMutationApiResponse>
export const BranchMutationApiResponse = Type.Union([
BranchMutationResponse,
ApiErrorResponse
])

export type CustomerExploreBranchesApiResponse = Static<typeof CustomerExploreBranchesApiResponse>
export const CustomerExploreBranchesApiResponse = Type.Union([
CustomerExploreBranchesResponse,
ApiErrorResponse
])