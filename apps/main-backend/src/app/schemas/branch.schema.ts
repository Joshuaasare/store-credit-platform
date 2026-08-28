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

export type BranchesNearbyFilters = Static<typeof BranchesNearbyFilters>
export const BranchesNearbyFilters = Type.Object({
lat: Type.Union([
Type.Number(),
Type.Null()
]),
lng: Type.Union([
Type.Number(),
Type.Null()
]),
category: Type.Optional(Type.Union([
Type.Array(BranchCategoryValues),
Type.Null()
])),
limit: Type.Optional(Type.Number()),
offset: Type.Optional(Type.Number())
})

export type BranchesNearbyPage = Static<typeof BranchesNearbyPage>
export const BranchesNearbyPage = Type.Object({
rows: Type.Array(BranchWithOffers),
total: Type.Number(),
offset: Type.Number(),
limit: Type.Number()
})

export type BranchSearchFilters = Static<typeof BranchSearchFilters>
export const BranchSearchFilters = Type.Object({
lat: Type.Union([
Type.Number(),
Type.Null()
]),
lng: Type.Union([
Type.Number(),
Type.Null()
]),
query: Type.String(),
limit: Type.Optional(Type.Number()),
offset: Type.Optional(Type.Number())
})

export type BranchSearchPage = Static<typeof BranchSearchPage>
export const BranchSearchPage = BranchesNearbyPage

export type BranchesNearbyQuerystring = Static<typeof BranchesNearbyQuerystring>
export const BranchesNearbyQuerystring = Type.Object({
lat: Type.Optional(Type.Number()),
lng: Type.Optional(Type.Number()),
category: Type.Optional(Type.Union([
Type.Array(BranchCategoryValues),
BranchCategoryValues
])),
limit: Type.Optional(Type.Number()),
offset: Type.Optional(Type.Number())
})

export type BranchSearchQuerystring = Static<typeof BranchSearchQuerystring>
export const BranchSearchQuerystring = Type.Object({
lat: Type.Optional(Type.Number()),
lng: Type.Optional(Type.Number()),
q: Type.Optional(Type.String()),
limit: Type.Optional(Type.Number()),
offset: Type.Optional(Type.Number())
})

export type BranchesNearbyResponse = Static<typeof BranchesNearbyResponse>
export const BranchesNearbyResponse = Type.Object({
success: Type.Literal(true),
data: BranchesNearbyPage
})

export type BranchSearchResponse = Static<typeof BranchSearchResponse>
export const BranchSearchResponse = Type.Object({
success: Type.Literal(true),
data: BranchSearchPage
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

export type BranchesNearbyApiResponse = Static<typeof BranchesNearbyApiResponse>
export const BranchesNearbyApiResponse = Type.Union([
BranchesNearbyResponse,
ApiErrorResponse
])

export type BranchSearchApiResponse = Static<typeof BranchSearchApiResponse>
export const BranchSearchApiResponse = Type.Union([
BranchSearchResponse,
ApiErrorResponse
])