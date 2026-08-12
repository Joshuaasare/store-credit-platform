import { Type, Static } from '@sinclair/typebox'
import { BaseBranch, ApiErrorResponse, BaseCustomer, BaseUserProfile, BaseCustomerCredit, BaseCustomerCreditRedemption } from './main.schema'



export type RedemptionStatus = Static<typeof RedemptionStatus>
export const RedemptionStatus = Type.Union([
Type.Literal("pending"),
Type.Literal("approved"),
Type.Literal("rejected")
])

export type RedemptionCustomer = Static<typeof RedemptionCustomer>
export const RedemptionCustomer = Type.Composite([BaseCustomer, Type.Object({
users: Type.Union([
BaseUserProfile,
Type.Null()
])
})])

export type RedemptionRow = Static<typeof RedemptionRow>
export const RedemptionRow = Type.Composite([BaseCustomerCreditRedemption, Type.Object({
customer: Type.Union([
RedemptionCustomer,
Type.Null()
]),
branch: Type.Union([
BaseBranch,
Type.Null()
]),
credit: Type.Union([
BaseCustomerCredit,
Type.Null()
]),
remaining: Type.Number()
})])

export type RedemptionsFilters = Static<typeof RedemptionsFilters>
export const RedemptionsFilters = Type.Object({
status: RedemptionStatus,
branch_id: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
limit: Type.Optional(Type.Number()),
offset: Type.Optional(Type.Number())
})

export type RedemptionsPage = Static<typeof RedemptionsPage>
export const RedemptionsPage = Type.Object({
rows: Type.Array(RedemptionRow),
total: Type.Number(),
offset: Type.Number(),
limit: Type.Number()
})

export type RedemptionsQuerystring = Static<typeof RedemptionsQuerystring>
export const RedemptionsQuerystring = RedemptionsFilters

export type RedemptionsResponse = Static<typeof RedemptionsResponse>
export const RedemptionsResponse = Type.Object({
success: Type.Literal(true),
data: RedemptionsPage
})

export type RedemptionMutationResponse = Static<typeof RedemptionMutationResponse>
export const RedemptionMutationResponse = Type.Object({
success: Type.Literal(true),
data: RedemptionRow
})

export type RedemptionsApiResponse = Static<typeof RedemptionsApiResponse>
export const RedemptionsApiResponse = Type.Union([
RedemptionsResponse,
ApiErrorResponse
])

export type RedemptionMutationApiResponse = Static<typeof RedemptionMutationApiResponse>
export const RedemptionMutationApiResponse = Type.Union([
RedemptionMutationResponse,
ApiErrorResponse
])