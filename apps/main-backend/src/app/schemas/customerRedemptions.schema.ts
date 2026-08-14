import { Type, Static } from '@sinclair/typebox'
import { BaseMerchant, BaseBranch, ApiErrorResponse, BaseCustomerCredit } from './main.schema'



export type CustomerPendingRequestAmountBody = Static<typeof CustomerPendingRequestAmountBody>
export const CustomerPendingRequestAmountBody = Type.Object({
amount: Type.Number()
})

export type CustomerPendingRequestResult = Static<typeof CustomerPendingRequestResult>
export const CustomerPendingRequestResult = Type.Object({
merchant_id: Type.Number(),
requested_amount: Type.Number(),
pending_credit_breakdown: Type.Array(Type.Intersect([
BaseCustomerCredit,
Type.Object({
branch: BaseBranch
})
])),
merchant: BaseMerchant
})

export type CustomerPendingRequestMutationResponse = Static<typeof CustomerPendingRequestMutationResponse>
export const CustomerPendingRequestMutationResponse = Type.Object({
success: Type.Literal(true),
data: CustomerPendingRequestResult
})

export type CustomerPendingRequestMutationApiResponse = Static<typeof CustomerPendingRequestMutationApiResponse>
export const CustomerPendingRequestMutationApiResponse = Type.Union([
CustomerPendingRequestMutationResponse,
ApiErrorResponse
])