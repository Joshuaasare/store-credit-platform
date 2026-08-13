import { Type, Static } from '@sinclair/typebox'
import { BaseMerchant, BaseBranch, ApiErrorResponse } from './main.schema'



export type CustomerActivityKind = Static<typeof CustomerActivityKind>
export const CustomerActivityKind = Type.Union([
Type.Literal("credit_issued"),
Type.Literal("credit_redeemed")
])

export type CustomerActivityIssued = Static<typeof CustomerActivityIssued>
export const CustomerActivityIssued = Type.Object({
kind: Type.Literal("credit_issued"),
id: Type.Number(),
amount: Type.Number(),
merchant: BaseMerchant,
branch: BaseBranch,
created_at: Type.String(),
credit_id: Type.Number()
})

export type CustomerActivityRedeemed = Static<typeof CustomerActivityRedeemed>
export const CustomerActivityRedeemed = Type.Object({
kind: Type.Literal("credit_redeemed"),
id: Type.Number(),
amount: Type.Number(),
merchant: BaseMerchant,
branch: BaseBranch,
created_at: Type.String(),
credit_id: Type.Number(),
purchase_id: Type.Union([
Type.Number(),
Type.Null()
])
})

export type CustomerActivity = Static<typeof CustomerActivity>
export const CustomerActivity = Type.Union([
CustomerActivityIssued,
CustomerActivityRedeemed
])

export type CustomerActivitiesPage = Static<typeof CustomerActivitiesPage>
export const CustomerActivitiesPage = Type.Object({
items: Type.Array(CustomerActivity),
nextCursor: Type.Union([
Type.Number(),
Type.Null()
])
})

export type CustomerActivitiesResponse = Static<typeof CustomerActivitiesResponse>
export const CustomerActivitiesResponse = Type.Object({
success: Type.Literal(true),
data: CustomerActivitiesPage
})

export type CustomerActivitiesApiResponse = Static<typeof CustomerActivitiesApiResponse>
export const CustomerActivitiesApiResponse = Type.Union([
CustomerActivitiesResponse,
ApiErrorResponse
])