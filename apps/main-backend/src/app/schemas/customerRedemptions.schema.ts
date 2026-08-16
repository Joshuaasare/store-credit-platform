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
redemption_code: Type.Number(),
redemption_id: Type.Number(),
branch_id: Type.Number(),
branch_name: Type.Union([
Type.String(),
Type.Null()
]),
amount_redeemed: Type.Number(),
requested_date: Type.Number(),
requested_at: Type.String()
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