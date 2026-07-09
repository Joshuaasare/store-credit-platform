import { Type, Static } from '@sinclair/typebox'
import { BaseUserRole } from './main.schema'



export type SendOtpRequest = Static<typeof SendOtpRequest>
export const SendOtpRequest = Type.Object({
phone: Type.String()
})

export type VerifyOtpRequest = Static<typeof VerifyOtpRequest>
export const VerifyOtpRequest = Type.Object({
phone: Type.String(),
otp: Type.String()
})

export type AuthUser = Static<typeof AuthUser>
export const AuthUser = Type.Object({
id: Type.String(),
email: Type.String(),
phone: Type.Union([
Type.String(),
Type.Null()
]),
surname: Type.String(),
other_names: Type.Union([
Type.String(),
Type.Null()
]),
access_granted: Type.Boolean(),
roles: Type.Array(BaseUserRole)
})

export type AuthSession = Static<typeof AuthSession>
export const AuthSession = Type.Object({
access_token: Type.String(),
refresh_token: Type.String(),
expires_in: Type.Number(),
expires_at: Type.Number(),
token_type: Type.String(),
user: AuthUser
})

export type SendOtpResponse = Static<typeof SendOtpResponse>
export const SendOtpResponse = Type.Object({
success: Type.Literal(true),
message: Type.String()
})

export type VerifyOtpResponse = Static<typeof VerifyOtpResponse>
export const VerifyOtpResponse = Type.Object({
success: Type.Literal(true),
message: Type.String(),
data: AuthSession
})

export type GetCurrentUserResponse = Static<typeof GetCurrentUserResponse>
export const GetCurrentUserResponse = Type.Object({
success: Type.Literal(true),
data: AuthUser
})

export type AuthErrorResponse = Static<typeof AuthErrorResponse>
export const AuthErrorResponse = Type.Object({
success: Type.Literal(false),
error: Type.String(),
details: Type.Optional(Type.Array(Type.Any()))
})

export type SendOtpApiResponse = Static<typeof SendOtpApiResponse>
export const SendOtpApiResponse = Type.Union([
SendOtpResponse,
AuthErrorResponse
])

export type VerifyOtpApiResponse = Static<typeof VerifyOtpApiResponse>
export const VerifyOtpApiResponse = Type.Union([
VerifyOtpResponse,
AuthErrorResponse
])

export type GetCurrentUserApiResponse = Static<typeof GetCurrentUserApiResponse>
export const GetCurrentUserApiResponse = Type.Union([
GetCurrentUserResponse,
AuthErrorResponse
])