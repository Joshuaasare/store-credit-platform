import { Type, Static } from '@sinclair/typebox'
import { BaseMerchant, BaseBranch, ApiErrorResponse, BaseCustomerCredit } from './main.schema'



export type CustomerCreditStatus = Static<typeof CustomerCreditStatus>
export const CustomerCreditStatus = Type.Union([
Type.Literal("live"),
Type.Literal("expired"),
Type.Literal("revoked")
])

export type CustomerCreditType = Static<typeof CustomerCreditType>
export const CustomerCreditType = Type.Union([
Type.Literal("running"),
Type.Literal("fixed"),
Type.Null()
])

export type CustomerCreditWithBranch = Static<typeof CustomerCreditWithBranch>
export const CustomerCreditWithBranch = Type.Composite([BaseCustomerCredit, Type.Object({
branch: Type.Intersect([
BaseBranch,
Type.Object({
merchant: BaseMerchant
})
]),
redeemed_total: Type.Number(),
pending_total: Type.Number(),
remaining: Type.Number(),
status: CustomerCreditStatus,
credit_type: CustomerCreditType
})])

export type CustomerCredits = Static<typeof CustomerCredits>
export const CustomerCredits = Type.Object({
live: Type.Array(CustomerCreditWithBranch),
expired: Type.Array(CustomerCreditWithBranch)
})

export type CustomerCreditsResponse = Static<typeof CustomerCreditsResponse>
export const CustomerCreditsResponse = Type.Object({
success: Type.Literal(true),
data: CustomerCredits
})

export type CustomerCreditsApiResponse = Static<typeof CustomerCreditsApiResponse>
export const CustomerCreditsApiResponse = Type.Union([
CustomerCreditsResponse,
ApiErrorResponse
])