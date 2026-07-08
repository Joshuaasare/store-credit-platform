import { Type, Static } from '@sinclair/typebox'
import { BaseUserRole } from './main.schema'



export type UserData = Static<typeof UserData>
export const UserData = Type.Object({
id: Type.String(),
email: Type.String(),
phone: Type.Union([
Type.String(),
Type.Null()
]),
is_access_granted: Type.Boolean(),
user_roles: Type.Array(BaseUserRole)
})

export type VerifyOTPRequest = Static<typeof VerifyOTPRequest>
export const VerifyOTPRequest = Type.Object({
phone: Type.String(),
otp: Type.String()
})

export type SendOTPRequest = Static<typeof SendOTPRequest>
export const SendOTPRequest = Type.Object({
phone: Type.String()
})

export type VerifyOTPResponse = Static<typeof VerifyOTPResponse>
export const VerifyOTPResponse = Type.Object({
success: Type.Literal(true),
message: Type.String()
})

export type AuthErrorResponse = Static<typeof AuthErrorResponse>
export const AuthErrorResponse = Type.Object({
success: Type.Literal(false),
error: Type.String(),
details: Type.Optional(Type.Array(Type.Any()))
})

export type GetCurrentUserResponse = Static<typeof GetCurrentUserResponse>
export const GetCurrentUserResponse = Type.Object({
success: Type.Literal(true),
data: UserData
})

export type GetCurrentUserApiResponse = Static<typeof GetCurrentUserApiResponse>
export const GetCurrentUserApiResponse = Type.Union([
GetCurrentUserResponse,
AuthErrorResponse
])