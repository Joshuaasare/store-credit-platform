import { Type, Static } from '@sinclair/typebox'
import { BaseMerchant, ApiErrorResponse } from './main.schema'



export type MerchantWithStats = Static<typeof MerchantWithStats>
export const MerchantWithStats = Type.Composite([BaseMerchant, Type.Object({
branch_count: Type.Number(),
staff_count: Type.Number(),
customer_count: Type.Number(),
lifetime_credit_issued: Type.Number(),
credit_pool_used: Type.Number(),
credit_pool_limit: Type.Union([
Type.Number(),
Type.Null()
])
})])

export type UpdateMerchantRequest = Static<typeof UpdateMerchantRequest>
export const UpdateMerchantRequest = Type.Object({
name: Type.Optional(Type.String()),
phone: Type.Optional(Type.String()),
country_code: Type.Optional(Type.String()),
slug: Type.Optional(Type.Union([
Type.String(),
Type.Null()
])),
logo_url: Type.Optional(Type.Union([
Type.String(),
Type.Null()
])),
cover_photo_url: Type.Optional(Type.Union([
Type.String(),
Type.Null()
]))
})

export type MerchantMutationResponse = Static<typeof MerchantMutationResponse>
export const MerchantMutationResponse = Type.Object({
success: Type.Literal(true),
data: MerchantWithStats
})

export type MerchantMeResponse = Static<typeof MerchantMeResponse>
export const MerchantMeResponse = Type.Object({
success: Type.Literal(true),
data: Type.Union([
MerchantWithStats,
Type.Null()
])
})

export type MerchantMeApiResponse = Static<typeof MerchantMeApiResponse>
export const MerchantMeApiResponse = Type.Union([
MerchantMeResponse,
ApiErrorResponse
])

export type MerchantMutationApiResponse = Static<typeof MerchantMutationApiResponse>
export const MerchantMutationApiResponse = Type.Union([
MerchantMutationResponse,
ApiErrorResponse
])

export type MerchantSearchResult = Static<typeof MerchantSearchResult>
export const MerchantSearchResult = Type.Object({
id: Type.Number(),
name: Type.String(),
slug: Type.Union([
Type.String(),
Type.Null()
]),
logo_url: Type.Union([
Type.String(),
Type.Null()
])
})

export type CustomerMerchantSearchResponse = Static<typeof CustomerMerchantSearchResponse>
export const CustomerMerchantSearchResponse = Type.Object({
success: Type.Literal(true),
data: Type.Array(MerchantSearchResult)
})

export type CustomerMerchantSearchApiResponse = Static<typeof CustomerMerchantSearchApiResponse>
export const CustomerMerchantSearchApiResponse = Type.Union([
CustomerMerchantSearchResponse,
ApiErrorResponse
])