import { Type, Static } from '@sinclair/typebox'
import { BaseMerchant, BaseBranch, ApiErrorResponse, BaseCustomerCredit, BaseCustomerCreditRedemption } from './main.schema'



export type CustomerRedemptionStatus = Static<typeof CustomerRedemptionStatus>
export const CustomerRedemptionStatus = Type.Union([
Type.Literal("pending"),
Type.Literal("approved"),
Type.Literal("rejected")
])

export type CustomerRedemptionStatusFilter = Static<typeof CustomerRedemptionStatusFilter>
export const CustomerRedemptionStatusFilter = Type.Union([
CustomerRedemptionStatus,
Type.Literal("all")
])

export type CustomerRedemptionRow = Static<typeof CustomerRedemptionRow>
export const CustomerRedemptionRow = Type.Intersect([
BaseCustomerCreditRedemption,
Type.Object({
branch: Type.Intersect([
BaseBranch,
Type.Object({
merchant: BaseMerchant
})
]),
credit: BaseCustomerCredit
})
])

export type CustomerRedemptionsResponse = Static<typeof CustomerRedemptionsResponse>
export const CustomerRedemptionsResponse = Type.Object({
success: Type.Literal(true),
data: Type.Array(CustomerRedemptionRow)
})

export type CustomerRedemptionCancelResponse = Static<typeof CustomerRedemptionCancelResponse>
export const CustomerRedemptionCancelResponse = Type.Object({
success: Type.Literal(true),
data: Type.Null()
})

export type CustomerRedemptionsApiResponse = Static<typeof CustomerRedemptionsApiResponse>
export const CustomerRedemptionsApiResponse = Type.Union([
CustomerRedemptionsResponse,
ApiErrorResponse
])