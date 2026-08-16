import { Type, Static, TSchema } from '@sinclair/typebox'
import { BaseMerchant, BaseBranch, ApiErrorResponse, BaseCustomer, BaseUserProfile, BaseStaff, BaseCustomerCreditRedemption } from './main.schema'



export type MerchantPendingRequest = Static<typeof MerchantPendingRequest>
export const MerchantPendingRequest = Type.Object({
redemption_id: Type.Number(),
customer_id: Type.Number(),
branch_id: Type.Number(),
branch_name: Type.Union([
Type.String(),
Type.Null()
]),
amount_redeemed: Type.Number(),
requested_date: Type.Number(),
requested_at: Type.String(),
customer: Type.Intersect([
BaseCustomer,
Type.Object({
users: Type.Union([
BaseUserProfile,
Type.Null()
])
})
]),
merchant: BaseMerchant
})

export type MerchantPendingRequestsPage = Static<typeof MerchantPendingRequestsPage>
export const MerchantPendingRequestsPage = Type.Object({
rows: Type.Array(MerchantPendingRequest),
total: Type.Number(),
offset: Type.Number(),
limit: Type.Number()
})

export type MerchantApprovedRedemption = Static<typeof MerchantApprovedRedemption>
export const MerchantApprovedRedemption = Type.Composite([BaseCustomerCreditRedemption, Type.Object({
customer: Type.Intersect([
BaseCustomer,
Type.Object({
users: Type.Union([
BaseUserProfile,
Type.Null()
])
})
]),
merchant: BaseMerchant,
approved_by_staff: Type.Union([
BaseStaff,
Type.Null()
]),
branch: Type.Union([
BaseBranch,
Type.Null()
])
})])

export type MerchantRejectedRedemption = Static<typeof MerchantRejectedRedemption>
export const MerchantRejectedRedemption = Type.Composite([BaseCustomerCreditRedemption, Type.Object({
customer: Type.Intersect([
BaseCustomer,
Type.Object({
users: Type.Union([
BaseUserProfile,
Type.Null()
])
})
]),
merchant: BaseMerchant,
branch: Type.Union([
BaseBranch,
Type.Null()
])
})])

export type MerchantRedemptionActionBody = Static<typeof MerchantRedemptionActionBody>
export const MerchantRedemptionActionBody = Type.Object({
redemption_code: Type.Number(),
redemption_id: Type.Number()
})

export type MerchantPendingRequestFilters = Static<typeof MerchantPendingRequestFilters>
export const MerchantPendingRequestFilters = Type.Object({
branch_id: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
limit: Type.Optional(Type.Number()),
offset: Type.Optional(Type.Number())
})

export type MerchantAuditFeedFilters = Static<typeof MerchantAuditFeedFilters>
export const MerchantAuditFeedFilters = Type.Object({
branch_id: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
limit: Type.Optional(Type.Number()),
offset: Type.Optional(Type.Number())
})

export type MerchantAuditFeedPage<T extends TSchema> = Static<ReturnType<typeof MerchantAuditFeedPage<T>>>
export const MerchantAuditFeedPage = <T extends TSchema>(T: T) => Type.Object({
rows: Type.Array(T),
total: Type.Number(),
offset: Type.Number(),
limit: Type.Number()
})

export type MerchantPendingRequestsQuerystring = Static<typeof MerchantPendingRequestsQuerystring>
export const MerchantPendingRequestsQuerystring = MerchantPendingRequestFilters

export type MerchantApprovedRedemptionsQuerystring = Static<typeof MerchantApprovedRedemptionsQuerystring>
export const MerchantApprovedRedemptionsQuerystring = MerchantAuditFeedFilters

export type MerchantRejectedRedemptionsQuerystring = Static<typeof MerchantRejectedRedemptionsQuerystring>
export const MerchantRejectedRedemptionsQuerystring = MerchantAuditFeedFilters

export type MerchantPendingRequestsResponse = Static<typeof MerchantPendingRequestsResponse>
export const MerchantPendingRequestsResponse = Type.Object({
success: Type.Literal(true),
data: MerchantPendingRequestsPage
})

export type MerchantApprovedRedemptionsResponse = Static<typeof MerchantApprovedRedemptionsResponse>
export const MerchantApprovedRedemptionsResponse = Type.Object({
success: Type.Literal(true),
data: MerchantAuditFeedPage(MerchantApprovedRedemption)
})

export type MerchantRejectedRedemptionsResponse = Static<typeof MerchantRejectedRedemptionsResponse>
export const MerchantRejectedRedemptionsResponse = Type.Object({
success: Type.Literal(true),
data: MerchantAuditFeedPage(MerchantRejectedRedemption)
})

export type MerchantRedemptionMutationResponse = Static<typeof MerchantRedemptionMutationResponse>
export const MerchantRedemptionMutationResponse = Type.Object({
success: Type.Literal(true),
data: Type.Object({
audit_id: Type.Number(),
amount_redeemed: Type.Number()
})
})

export type MerchantPendingRequestsApiResponse = Static<typeof MerchantPendingRequestsApiResponse>
export const MerchantPendingRequestsApiResponse = Type.Union([
MerchantPendingRequestsResponse,
ApiErrorResponse
])

export type MerchantApprovedRedemptionsApiResponse = Static<typeof MerchantApprovedRedemptionsApiResponse>
export const MerchantApprovedRedemptionsApiResponse = Type.Union([
MerchantApprovedRedemptionsResponse,
ApiErrorResponse
])

export type MerchantRejectedRedemptionsApiResponse = Static<typeof MerchantRejectedRedemptionsApiResponse>
export const MerchantRejectedRedemptionsApiResponse = Type.Union([
MerchantRejectedRedemptionsResponse,
ApiErrorResponse
])

export type MerchantRedemptionMutationApiResponse = Static<typeof MerchantRedemptionMutationApiResponse>
export const MerchantRedemptionMutationApiResponse = Type.Union([
MerchantRedemptionMutationResponse,
ApiErrorResponse
])