import { Type, Static } from '@sinclair/typebox'
import { ApiErrorResponse, CustomerAuthUser } from './main.schema'



export type CustomerPhoneChangeSendOtpRequest = Static<typeof CustomerPhoneChangeSendOtpRequest>
export const CustomerPhoneChangeSendOtpRequest = Type.Object({
newPhone: Type.String()
})

export type CustomerPhoneChangeSendOtpResponse = Static<typeof CustomerPhoneChangeSendOtpResponse>
export const CustomerPhoneChangeSendOtpResponse = Type.Object({
success: Type.Literal(true),
data: Type.Object({
message: Type.String()
})
})

export type CustomerPhoneChangeSendOtpApiResponse = Static<typeof CustomerPhoneChangeSendOtpApiResponse>
export const CustomerPhoneChangeSendOtpApiResponse = Type.Union([
CustomerPhoneChangeSendOtpResponse,
ApiErrorResponse
])

export type CustomerPhoneChangeVerifyRequest = Static<typeof CustomerPhoneChangeVerifyRequest>
export const CustomerPhoneChangeVerifyRequest = Type.Object({
newPhone: Type.String(),
otp: Type.String()
})

export type CustomerPhoneChangeVerifyResult = Static<typeof CustomerPhoneChangeVerifyResult>
export const CustomerPhoneChangeVerifyResult = Type.Object({
phoneVerifiedToken: Type.String()
})

export type CustomerPhoneChangeVerifyResponse = Static<typeof CustomerPhoneChangeVerifyResponse>
export const CustomerPhoneChangeVerifyResponse = Type.Object({
success: Type.Literal(true),
data: CustomerPhoneChangeVerifyResult
})

export type CustomerPhoneChangeVerifyApiResponse = Static<typeof CustomerPhoneChangeVerifyApiResponse>
export const CustomerPhoneChangeVerifyApiResponse = Type.Union([
CustomerPhoneChangeVerifyResponse,
ApiErrorResponse
])

export type CustomerProfileUpdateRequest = Static<typeof CustomerProfileUpdateRequest>
export const CustomerProfileUpdateRequest = Type.Object({
surname: Type.Optional(Type.String()),
other_names: Type.Optional(Type.String()),
avatar_url: Type.Optional(Type.Union([
Type.String(),
Type.Null()
])),
newPhone: Type.Optional(Type.String()),
phoneVerifiedToken: Type.Optional(Type.String()),
latitude: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
longitude: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
place_id: Type.Optional(Type.Union([
Type.String(),
Type.Null()
]))
})

export type CustomerProfileUpdateResponse = Static<typeof CustomerProfileUpdateResponse>
export const CustomerProfileUpdateResponse = Type.Object({
success: Type.Literal(true),
data: Type.Object({
user: CustomerAuthUser
})
})

export type CustomerProfileUpdateApiResponse = Static<typeof CustomerProfileUpdateApiResponse>
export const CustomerProfileUpdateApiResponse = Type.Union([
CustomerProfileUpdateResponse,
ApiErrorResponse
])