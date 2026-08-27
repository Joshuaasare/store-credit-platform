import { Type, Static } from '@sinclair/typebox'
import { ApiErrorResponse } from './main.schema'



export type ExploreBranch = Static<typeof ExploreBranch>
export const ExploreBranch = Type.Object({
id: Type.Number(),
name: Type.Union([
Type.String(),
Type.Null()
]),
city: Type.String(),
latitude: Type.Union([
Type.Number(),
Type.Null()
]),
longitude: Type.Union([
Type.Number(),
Type.Null()
])
})

export type ExploreOffer = Static<typeof ExploreOffer>
export const ExploreOffer = Type.Object({
kind: Type.Union([
Type.Literal("fixed"),
Type.Literal("running")
]),
config_group_id: Type.String(),
merchant_name: Type.String(),
merchant_slug: Type.Union([
Type.String(),
Type.Null()
]),
branch: ExploreBranch,
branch_count: Type.Number(),
distance_km: Type.Union([
Type.Number(),
Type.Null()
]),
image_url: Type.Union([
Type.String(),
Type.Null()
]),
headline: Type.String(),
subtext: Type.Union([
Type.String(),
Type.Null()
]),
start_date: Type.Union([
Type.Number(),
Type.Null()
]),
end_date: Type.Union([
Type.Number(),
Type.Null()
])
})

export type CustomerExploreOffersResponse = Static<typeof CustomerExploreOffersResponse>
export const CustomerExploreOffersResponse = Type.Object({
success: Type.Literal(true),
data: Type.Array(ExploreOffer)
})

export type CustomerExploreOffersApiResponse = Static<typeof CustomerExploreOffersApiResponse>
export const CustomerExploreOffersApiResponse = Type.Union([
CustomerExploreOffersResponse,
ApiErrorResponse
])