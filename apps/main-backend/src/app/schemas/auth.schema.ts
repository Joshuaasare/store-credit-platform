import { Type, Static } from '@sinclair/typebox'
import { StaffRoleValues, CustomerAuthUser } from './main.schema'



export type SendOtpRequest = Static<typeof SendOtpRequest>
export const SendOtpRequest = Type.Object({
phone: Type.String()
})

export type VerifyOtpRequest = Static<typeof VerifyOtpRequest>
export const VerifyOtpRequest = Type.Object({
phone: Type.String(),
otp: Type.String()
})

export type AccessTokenPayload = Static<typeof AccessTokenPayload>
export const AccessTokenPayload = Type.Object({
sub: Type.String(),
phone: Type.Union([
Type.String(),
Type.Null()
]),
role: Type.Union([
StaffRoleValues,
Type.Null()
]),
merchant_id: Type.Union([
Type.Number(),
Type.Null()
]),
branch_id: Type.Union([
Type.Number(),
Type.Null()
]),
staff_id: Type.Union([
Type.Number(),
Type.Null()
]),
customer_id: Type.Union([
Type.Number(),
Type.Null()
]),
iat: Type.Number(),
exp: Type.Number(),
iss: Type.String(),
aud: Type.String(),
jti: Type.String()
})

export type AuthUser = Static<typeof AuthUser>
export const AuthUser = Type.Object({
id: Type.String(),
email: Type.String(),
phone: Type.Union([
Type.String(),
Type.Null()
]),
surname: Type.Union([
Type.String(),
Type.Null()
]),
other_names: Type.Union([
Type.String(),
Type.Null()
]),
access_granted: Type.Boolean(),
role: Type.Union([
StaffRoleValues,
Type.Null()
]),
merchant_id: Type.Union([
Type.Number(),
Type.Null()
]),
branch_id: Type.Union([
Type.Number(),
Type.Null()
]),
staff_id: Type.Union([
Type.Number(),
Type.Null()
])
})

export type AuthSession = Static<typeof AuthSession>
export const AuthSession = Type.Object({
access_token: Type.String(),
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

export type RefreshTokenResponse = Static<typeof RefreshTokenResponse>
export const RefreshTokenResponse = Type.Object({
success: Type.Literal(true),
message: Type.String(),
data: AuthSession
})

export type LogoutResponse = Static<typeof LogoutResponse>
export const LogoutResponse = Type.Object({
success: Type.Literal(true),
message: Type.String()
})

export type SessionListItem = Static<typeof SessionListItem>
export const SessionListItem = Type.Object({
id: Type.String(),
device_fingerprint: Type.Union([
Type.String(),
Type.Null()
]),
created_at: Type.String(),
expires_at: Type.String(),
revoked_at: Type.Union([
Type.String(),
Type.Null()
]),
is_current: Type.Boolean()
})

export type SessionListResponse = Static<typeof SessionListResponse>
export const SessionListResponse = Type.Object({
success: Type.Literal(true),
data: Type.Array(SessionListItem)
})

export type SessionRevokeResponse = Static<typeof SessionRevokeResponse>
export const SessionRevokeResponse = Type.Object({
success: Type.Literal(true),
message: Type.String()
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
details: Type.Optional(Type.Array(Type.Unknown()))
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

export type RefreshTokenApiResponse = Static<typeof RefreshTokenApiResponse>
export const RefreshTokenApiResponse = Type.Union([
RefreshTokenResponse,
AuthErrorResponse
])

export type LogoutApiResponse = Static<typeof LogoutApiResponse>
export const LogoutApiResponse = Type.Union([
LogoutResponse,
AuthErrorResponse
])

export type SessionListApiResponse = Static<typeof SessionListApiResponse>
export const SessionListApiResponse = Type.Union([
SessionListResponse,
AuthErrorResponse
])

export type SessionRevokeApiResponse = Static<typeof SessionRevokeApiResponse>
export const SessionRevokeApiResponse = Type.Union([
SessionRevokeResponse,
AuthErrorResponse
])

export type GetCurrentUserApiResponse = Static<typeof GetCurrentUserApiResponse>
export const GetCurrentUserApiResponse = Type.Union([
GetCurrentUserResponse,
AuthErrorResponse
])

export type CustomerOtpSendRequest = Static<typeof CustomerOtpSendRequest>
export const CustomerOtpSendRequest = Type.Object({
phone: Type.String()
})

export type CustomerOtpVerifyRequest = Static<typeof CustomerOtpVerifyRequest>
export const CustomerOtpVerifyRequest = Type.Object({
phone: Type.String(),
otp: Type.String()
})

export type CustomerRegisterRequest = Static<typeof CustomerRegisterRequest>
export const CustomerRegisterRequest = Type.Object({
pending_token: Type.String(),
surname: Type.String(),
other_names: Type.String(),
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
])),
place_label: Type.Optional(Type.Union([
Type.String(),
Type.Null()
]))
})

export type CustomerRefreshRequest = Static<typeof CustomerRefreshRequest>
export const CustomerRefreshRequest = Type.Object({
refresh_token: Type.String()
})

export type CustomerSession = Static<typeof CustomerSession>
export const CustomerSession = Type.Object({
access_token: Type.String(),
refresh_token: Type.String(),
expires_in: Type.Number(),
expires_at: Type.Number(),
token_type: Type.String(),
user: CustomerAuthUser
})

export type CustomerOtpSendResponse = Static<typeof CustomerOtpSendResponse>
export const CustomerOtpSendResponse = Type.Object({
success: Type.Literal(true),
message: Type.String()
})

export type CustomerLoggedInResponse = Static<typeof CustomerLoggedInResponse>
export const CustomerLoggedInResponse = Type.Object({
success: Type.Literal(true),
message: Type.String(),
data: Type.Object({
status: Type.Literal("logged_in"),
access_token: Type.String(),
refresh_token: Type.String(),
expires_in: Type.Number(),
expires_at: Type.Number(),
token_type: Type.String(),
user: CustomerAuthUser
})
})

export type CustomerNeedsProfileResponse = Static<typeof CustomerNeedsProfileResponse>
export const CustomerNeedsProfileResponse = Type.Object({
success: Type.Literal(true),
message: Type.String(),
data: Type.Object({
status: Type.Literal("needs_profile"),
pending_token: Type.String()
})
})

export type CustomerOtpVerifyResponse = Static<typeof CustomerOtpVerifyResponse>
export const CustomerOtpVerifyResponse = Type.Union([
CustomerLoggedInResponse,
CustomerNeedsProfileResponse
])

export type CustomerRegisterResponse = Static<typeof CustomerRegisterResponse>
export const CustomerRegisterResponse = Type.Object({
success: Type.Literal(true),
message: Type.String(),
data: CustomerSession
})

export type CustomerRefreshResponse = Static<typeof CustomerRefreshResponse>
export const CustomerRefreshResponse = Type.Object({
success: Type.Literal(true),
message: Type.String(),
data: CustomerSession
})

export type CustomerLogoutResponse = Static<typeof CustomerLogoutResponse>
export const CustomerLogoutResponse = Type.Object({
success: Type.Literal(true),
message: Type.String()
})

export type CustomerGetCurrentUserResponse = Static<typeof CustomerGetCurrentUserResponse>
export const CustomerGetCurrentUserResponse = Type.Object({
success: Type.Literal(true),
data: CustomerAuthUser
})

export type CustomerOtpSendApiResponse = Static<typeof CustomerOtpSendApiResponse>
export const CustomerOtpSendApiResponse = Type.Union([
CustomerOtpSendResponse,
AuthErrorResponse
])

export type CustomerOtpVerifyApiResponse = Static<typeof CustomerOtpVerifyApiResponse>
export const CustomerOtpVerifyApiResponse = Type.Union([
CustomerOtpVerifyResponse,
AuthErrorResponse
])

export type CustomerRegisterApiResponse = Static<typeof CustomerRegisterApiResponse>
export const CustomerRegisterApiResponse = Type.Union([
CustomerRegisterResponse,
AuthErrorResponse
])

export type CustomerRefreshApiResponse = Static<typeof CustomerRefreshApiResponse>
export const CustomerRefreshApiResponse = Type.Union([
CustomerRefreshResponse,
AuthErrorResponse
])

export type CustomerLogoutApiResponse = Static<typeof CustomerLogoutApiResponse>
export const CustomerLogoutApiResponse = Type.Union([
CustomerLogoutResponse,
AuthErrorResponse
])

export type CustomerGetCurrentUserApiResponse = Static<typeof CustomerGetCurrentUserApiResponse>
export const CustomerGetCurrentUserApiResponse = Type.Union([
CustomerGetCurrentUserResponse,
AuthErrorResponse
])