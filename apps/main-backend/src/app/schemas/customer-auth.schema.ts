import { Type, Static } from '@sinclair/typebox'
import { CustomerAuthUser } from './main.schema'



export type CustomerOtpVerifyServiceResponse = Static<typeof CustomerOtpVerifyServiceResponse>
export const CustomerOtpVerifyServiceResponse = Type.Union([
Type.Object({
status: Type.Literal("logged_in"),
access_token: Type.String(),
refresh_token: Type.String(),
expires_in: Type.Number(),
expires_at: Type.Number(),
token_type: Type.String(),
user: CustomerAuthUser
}),
Type.Object({
status: Type.Literal("needs_profile"),
pending_token: Type.String()
})
])

export type CustomerRegisterServiceResponse = Static<typeof CustomerRegisterServiceResponse>
export const CustomerRegisterServiceResponse = Type.Object({
access_token: Type.String(),
refresh_token: Type.String(),
expires_in: Type.Number(),
expires_at: Type.Number(),
token_type: Type.String(),
user: CustomerAuthUser
})

export type CustomerRefreshServiceResponse = Static<typeof CustomerRefreshServiceResponse>
export const CustomerRefreshServiceResponse = CustomerRegisterServiceResponse