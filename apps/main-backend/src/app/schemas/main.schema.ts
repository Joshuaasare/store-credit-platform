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

export type BaseMerchant = Static<typeof BaseMerchant>
export const BaseMerchant = Type.Object({
id: Type.Number(),
name: Type.String(),
phone: Type.String(),
country_code: Type.String(),
slug: Type.Union([
Type.String(),
Type.Null()
]),
logo_url: Type.Union([
Type.String(),
Type.Null()
]),
cover_photo_url: Type.Union([
Type.String(),
Type.Null()
]),
is_active: Type.Boolean(),
created_at: Type.String()
})

export type BaseBranch = Static<typeof BaseBranch>
export const BaseBranch = Type.Object({
id: Type.Number(),
merchant_id: Type.Number(),
name: Type.Union([
Type.String(),
Type.Null()
]),
phone: Type.Union([
Type.String(),
Type.Null()
]),
address: Type.Union([
Type.String(),
Type.Null()
]),
city: Type.String(),
country_code: Type.String(),
is_active: Type.Boolean(),
created_at: Type.String()
})

export type ApiErrorResponse = Static<typeof ApiErrorResponse>
export const ApiErrorResponse = Type.Object({
success: Type.Literal(false),
error: Type.String(),
details: Type.Optional(Type.Array(Type.Unknown()))
})

export type TransactionTypeValues = Static<typeof TransactionTypeValues>
export const TransactionTypeValues = Type.Union([
Type.Literal("purchase"),
Type.Literal("credit_issue"),
Type.Literal("credit_redeem")
])

export type BaseCustomer = Static<typeof BaseCustomer>
export const BaseCustomer = Type.Object({
id: Type.Number(),
phone: Type.Union([
Type.String(),
Type.Null()
]),
unique_id: Type.Union([
Type.String(),
Type.Null()
]),
user_id: Type.Union([
Type.String(),
Type.Null()
]),
created_at: Type.String(),
deleted_at: Type.Union([
Type.String(),
Type.Null()
])
})

export type BaseCustomerTransaction = Static<typeof BaseCustomerTransaction>
export const BaseCustomerTransaction = Type.Object({
id: Type.Number(),
customer_id: Type.Number(),
branch_id: Type.Number(),
recorded_by_user_id: Type.Union([
Type.String(),
Type.Null()
]),
amount: Type.Number(),
transaction_date: Type.Number(),
transaction_type: TransactionTypeValues,
created_at: Type.String(),
credit_id: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
]))
})

export type BaseUserProfile = Static<typeof BaseUserProfile>
export const BaseUserProfile = Type.Object({
id: Type.String(),
surname: Type.String(),
other_names: Type.Union([
Type.String(),
Type.Null()
]),
phone: Type.String()
})