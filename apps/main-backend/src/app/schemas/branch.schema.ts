import { Type, Static } from '@sinclair/typebox'
import { BranchCategoryValues, BaseMerchant, BaseBranch, ApiErrorResponse, BaseRunningCreditConfig, BaseFixedCreditConfig } from './main.schema'



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
])),
category: Type.Optional(Type.Union([
BranchCategoryValues,
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
])),
category: Type.Optional(Type.Union([
BranchCategoryValues,
Type.Null()
]))
})

export type BranchWithOffers = Static<typeof BranchWithOffers>
export const BranchWithOffers = Type.Intersect([
BaseBranch,
Type.Object({
merchant: Type.Union([
BaseMerchant,
Type.Null()
]),
running_configs: Type.Array(BaseRunningCreditConfig),
fixed_configs: Type.Array(BaseFixedCreditConfig),
distance_km: Type.Union([
Type.Number(),
Type.Null()
])
})
])

export type BranchesByLocationResponse = Static<typeof BranchesByLocationResponse>
export const BranchesByLocationResponse = Type.Object({
success: Type.Literal(true),
data: Type.Array(BranchWithOffers)
})

export type NearbyBranchesQuerystring = Static<typeof NearbyBranchesQuerystring>
export const NearbyBranchesQuerystring = Type.Object({
lat: Type.Number(),
lng: Type.Number()
})

export type SearchBranchesQuerystring = Static<typeof SearchBranchesQuerystring>
export const SearchBranchesQuerystring = Type.Object({
lat: Type.Number(),
lng: Type.Number(),
q: Type.String()
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

export type BranchesByLocationApiResponse = Static<typeof BranchesByLocationApiResponse>
export const BranchesByLocationApiResponse = Type.Union([
BranchesByLocationResponse,
ApiErrorResponse
])