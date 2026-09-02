import { Type, Static } from '@sinclair/typebox'
import {
  ApiErrorResponse,
  BaseBranch,
  BaseFixedCreditConfig,
  BaseRunningCreditConfig,
} from './main.schema'
import { BranchWithOffers } from './branch.schema'

export type OfferMerchantSummary = Static<typeof OfferMerchantSummary>
export const OfferMerchantSummary = Type.Object({
id: Type.Number(),
name: Type.Union([
Type.String(),
Type.Null()
]),
logo_url: Type.Union([
Type.String(),
Type.Null()
])
})

export type OfferConfig = Static<typeof OfferConfig>
export const OfferConfig = Type.Union([
Type.Intersect([
BaseRunningCreditConfig,
Type.Object({
favorite_count: Type.Number()
})
]),
Type.Intersect([
BaseFixedCreditConfig,
Type.Object({
favorite_count: Type.Number()
})
])
])

export type NearbyOfferRow = Static<typeof NearbyOfferRow>
export const NearbyOfferRow = Type.Union([
Type.Object({
config_type: Type.Literal("running"),
config: Type.Intersect([
BaseRunningCreditConfig,
Type.Object({
favorite_count: Type.Number()
})
]),
merchant: Type.Union([
OfferMerchantSummary,
Type.Null()
]),
branch: BaseBranch,
distance_km: Type.Union([
Type.Number(),
Type.Null()
])
}),
Type.Object({
config_type: Type.Literal("fixed"),
config: Type.Intersect([
BaseFixedCreditConfig,
Type.Object({
favorite_count: Type.Number()
})
]),
merchant: Type.Union([
OfferMerchantSummary,
Type.Null()
]),
branch: BaseBranch,
distance_km: Type.Union([
Type.Number(),
Type.Null()
])
})
])

export type NearbyOffersQuerystring = Static<typeof NearbyOffersQuerystring>
export const NearbyOffersQuerystring = Type.Object({
lat: Type.Optional(Type.Number()),
lng: Type.Optional(Type.Number()),
limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 50 })),
offset: Type.Optional(Type.Integer({ minimum: 0 }))
})

export type NearbyOffersPage = Static<typeof NearbyOffersPage>
export const NearbyOffersPage = Type.Object({
rows: Type.Array(NearbyOfferRow),
total: Type.Number(),
offset: Type.Number(),
limit: Type.Number()
})

export type NearbyOffersResponse = Static<typeof NearbyOffersResponse>
export const NearbyOffersResponse = Type.Object({
success: Type.Literal(true),
data: NearbyOffersPage
})

export type OfferBranchesParams = Static<typeof OfferBranchesParams>
export const OfferBranchesParams = Type.Object({
configType: Type.Union([
Type.Literal("running"),
Type.Literal("fixed")
]),
configId: Type.String()
})

export type OfferBranchesQuerystring = Static<typeof OfferBranchesQuerystring>
export const OfferBranchesQuerystring = Type.Object({
lat: Type.Optional(Type.Number()),
lng: Type.Optional(Type.Number())
})

export type OfferBranchesResponse = Static<typeof OfferBranchesResponse>
export const OfferBranchesResponse = Type.Object({
success: Type.Literal(true),
data: Type.Object({
config: OfferConfig,
branches: Type.Array(BranchWithOffers)
})
})

export type NearbyOffersApiResponse = Static<typeof NearbyOffersApiResponse>
export const NearbyOffersApiResponse = Type.Union([
NearbyOffersResponse,
ApiErrorResponse
])

export type OfferBranchesApiResponse = Static<typeof OfferBranchesApiResponse>
export const OfferBranchesApiResponse = Type.Union([
OfferBranchesResponse,
ApiErrorResponse
])