import { Type, Static } from '@sinclair/typebox'


export type MerchantBase = Static<typeof MerchantBase>
export const MerchantBase = Type.Object({
id: Type.Number(),
name: Type.String(),
phone: Type.String(),
country_code: Type.String(),
slug: Type.Union([
Type.String(),
Type.Null()
]),
is_active: Type.Boolean(),
created_at: Type.String()
})

export type MerchantWithStats = Static<typeof MerchantWithStats>
export const MerchantWithStats = Type.Composite([MerchantBase, Type.Object({
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

export type BranchBase = Static<typeof BranchBase>
export const BranchBase = Type.Object({
id: Type.Number(),
merchant_id: Type.Number(),
name: Type.Union([
Type.String(),
Type.Null()
]),
phone: Type.Union([
Type.String(),
Type.Null()
]),
address: Type.Union([
Type.String(),
Type.Null()
]),
city: Type.String(),
country_code: Type.String(),
is_active: Type.Boolean(),
created_at: Type.String()
})

export type BranchWithAggregates = Static<typeof BranchWithAggregates>
export const BranchWithAggregates = Type.Composite([BranchBase, Type.Object({
staff_count: Type.Number(),
customer_count: Type.Number(),
credit_issued_this_month: Type.Number(),
last_activity_date: Type.Union([
Type.String(),
Type.Null()
])
})])

export type CreateBranchRequest = Static<typeof CreateBranchRequest>
export const CreateBranchRequest = Type.Object({
name: Type.String(),
phone: Type.Optional(Type.String()),
address: Type.Optional(Type.String()),
city: Type.String(),
country_code: Type.String()
})

export type UpdateBranchRequest = Static<typeof UpdateBranchRequest>
export const UpdateBranchRequest = Type.Object({
name: Type.Optional(Type.String()),
phone: Type.Optional(Type.String()),
address: Type.Optional(Type.String()),
city: Type.Optional(Type.String()),
country_code: Type.Optional(Type.String())
})

export type UpdateMerchantRequest = Static<typeof UpdateMerchantRequest>
export const UpdateMerchantRequest = Type.Object({
name: Type.Optional(Type.String()),
phone: Type.Optional(Type.String()),
country_code: Type.Optional(Type.String()),
slug: Type.Optional(Type.Union([
Type.String(),
Type.Null()
]))
})

export type MerchantMeResponse = Static<typeof MerchantMeResponse>
export const MerchantMeResponse = Type.Object({
success: Type.Literal(true),
data: Type.Union([
MerchantWithStats,
Type.Null()
])
})

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

export type MerchantMutationResponse = Static<typeof MerchantMutationResponse>
export const MerchantMutationResponse = Type.Object({
success: Type.Literal(true),
data: MerchantWithStats
})

export type ApiErrorResponse = Static<typeof ApiErrorResponse>
export const ApiErrorResponse = Type.Object({
success: Type.Literal(false),
error: Type.String(),
details: Type.Optional(Type.Array(Type.Unknown()))
})

export type MerchantMeApiResponse = Static<typeof MerchantMeApiResponse>
export const MerchantMeApiResponse = Type.Union([
MerchantMeResponse,
ApiErrorResponse
])

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

export type MerchantMutationApiResponse = Static<typeof MerchantMutationApiResponse>
export const MerchantMutationApiResponse = Type.Union([
MerchantMutationResponse,
ApiErrorResponse
])