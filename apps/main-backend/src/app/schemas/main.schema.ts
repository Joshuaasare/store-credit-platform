import { Type, Static } from '@sinclair/typebox'


export type UserRoleValues = Static<typeof UserRoleValues>
export const UserRoleValues = Type.Union([
Type.Literal("manager"),
Type.Literal("cashier")
])

export type BaseUserRole = Static<typeof BaseUserRole>
export const BaseUserRole = Type.Object({
created_at: Type.Union([
Type.String(),
Type.Null()
]),
id: Type.Number(),
role: UserRoleValues,
updated_at: Type.Union([
Type.String(),
Type.Null()
]),
user_id: Type.String(),
assigned_by_user_id: Type.String()
})

export type UserWithRoles = Static<typeof UserWithRoles>
export const UserWithRoles = Type.Object({
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

export type SendSMSMessageParams = Static<typeof SendSMSMessageParams>
export const SendSMSMessageParams = Type.Object({
phone: Type.String(),
message: Type.String(),
sender: Type.Optional(Type.String())
})

export type SendSMSMessageResponse = Static<typeof SendSMSMessageResponse>
export const SendSMSMessageResponse = Type.Object({
status: Type.Literal("success")
})

export type SMSMessageErrorReponse = Static<typeof SMSMessageErrorReponse>
export const SMSMessageErrorReponse = Type.Object({
status: Type.Literal("error"),
message: Type.String()
})