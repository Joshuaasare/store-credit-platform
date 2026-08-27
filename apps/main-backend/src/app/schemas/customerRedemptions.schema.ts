import { Type, Static } from '@sinclair/typebox'
import { BaseBranch, ApiErrorResponse } from './main.schema'



export type CustomerMerchantBranchesResponse = Static<typeof CustomerMerchantBranchesResponse>
export const CustomerMerchantBranchesResponse = Type.Object({
success: Type.Literal(true),
data: Type.Array(BaseBranch)
})

export type CustomerMerchantBranchesApiResponse = Static<typeof CustomerMerchantBranchesApiResponse>
export const CustomerMerchantBranchesApiResponse = Type.Union([
CustomerMerchantBranchesResponse,
ApiErrorResponse
])

export type CustomerPendingRedemption = Static<typeof CustomerPendingRedemption>
export const CustomerPendingRedemption = Type.Object({
id: Type.Number(),
branch_id: Type.Number(),
amount_redeemed: Type.Number(),
created_at: Type.String(),
branch: Type.Union([
Type.Object({
id: Type.Number(),
name: Type.Union([
Type.String(),
Type.Null()
])
}),
Type.Null()
]),
redemption_code: Type.Number(),
requested_date: Type.Number()
})

export type CustomerPendingRedemptionResponse = Static<typeof CustomerPendingRedemptionResponse>
export const CustomerPendingRedemptionResponse = Type.Object({
success: Type.Literal(true),
data: Type.Union([
CustomerPendingRedemption,
Type.Null()
])
})

export type CustomerPendingRedemptionApiResponse = Static<typeof CustomerPendingRedemptionApiResponse>
export const CustomerPendingRedemptionApiResponse = Type.Union([
CustomerPendingRedemptionResponse,
ApiErrorResponse
])

export type CustomerRedemptionRequestBody = Static<typeof CustomerRedemptionRequestBody>
export const CustomerRedemptionRequestBody = Type.Object({
amount: Type.Number(),
branchId: Type.Number()
})

export type CustomerRedemptionRequestResult = Static<typeof CustomerRedemptionRequestResult>
export const CustomerRedemptionRequestResult = Type.Object({
audit_id: Type.Number(),
redemption_code: Type.Number(),
requested_date: Type.Number(),
branch_id: Type.Number(),
amount_redeemed: Type.Number(),
requested_at: Type.String()
})

export type CustomerRedemptionRequestMutationResponse = Static<typeof CustomerRedemptionRequestMutationResponse>
export const CustomerRedemptionRequestMutationResponse = Type.Object({
success: Type.Literal(true),
data: CustomerRedemptionRequestResult
})

export type CustomerRedemptionRequestMutationApiResponse = Static<typeof CustomerRedemptionRequestMutationApiResponse>
export const CustomerRedemptionRequestMutationApiResponse = Type.Union([
CustomerRedemptionRequestMutationResponse,
ApiErrorResponse
])

export type CustomerRedemptionCancelResult = Static<typeof CustomerRedemptionCancelResult>
export const CustomerRedemptionCancelResult = Type.Object({
cancelled: Type.Boolean()
})

export type CustomerRedemptionCancelResponse = Static<typeof CustomerRedemptionCancelResponse>
export const CustomerRedemptionCancelResponse = Type.Object({
success: Type.Literal(true),
data: CustomerRedemptionCancelResult
})

export type CustomerRedemptionCancelApiResponse = Static<typeof CustomerRedemptionCancelApiResponse>
export const CustomerRedemptionCancelApiResponse = Type.Union([
CustomerRedemptionCancelResponse,
ApiErrorResponse
])

export type CustomerApprovedRedemption = Static<typeof CustomerApprovedRedemption>
export const CustomerApprovedRedemption = Type.Object({
id: Type.Number(),
branch_id: Type.Number(),
amount_redeemed: Type.Number(),
branch: Type.Union([
Type.Object({
id: Type.Number(),
name: Type.Union([
Type.String(),
Type.Null()
])
}),
Type.Null()
]),
approved_at: Type.Number()
})

export type CustomerApprovedRedemptionPage = Static<typeof CustomerApprovedRedemptionPage>
export const CustomerApprovedRedemptionPage = Type.Object({
items: Type.Array(CustomerApprovedRedemption),
nextCursor: Type.Union([
Type.Number(),
Type.Null()
])
})

export type CustomerApprovedRedemptionResponse = Static<typeof CustomerApprovedRedemptionResponse>
export const CustomerApprovedRedemptionResponse = Type.Object({
success: Type.Literal(true),
data: CustomerApprovedRedemptionPage
})

export type CustomerApprovedRedemptionApiResponse = Static<typeof CustomerApprovedRedemptionApiResponse>
export const CustomerApprovedRedemptionApiResponse = Type.Union([
CustomerApprovedRedemptionResponse,
ApiErrorResponse
])

export type CustomerApprovedRedemptionQuerystring = Static<typeof CustomerApprovedRedemptionQuerystring>
export const CustomerApprovedRedemptionQuerystring = Type.Object({
cursor: Type.Optional(Type.Union([
Type.String(),
Type.Number()
])),
limit: Type.Optional(Type.Number())
})