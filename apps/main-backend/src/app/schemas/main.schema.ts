import { Type, Static } from '@sinclair/typebox'


export type StaffRoleValues = Static<typeof StaffRoleValues>
export const StaffRoleValues = Type.Union([
Type.Literal("manager"),
Type.Literal("cashier")
])

export type CreditTypeValues = Static<typeof CreditTypeValues>
export const CreditTypeValues = Type.Union([
Type.Literal("fixed"),
Type.Literal("percentage")
])

export type CumulativeScopeValues = Static<typeof CumulativeScopeValues>
export const CumulativeScopeValues = Type.Union([
Type.Literal("per_branch"),
Type.Literal("merchant_wide")
])

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
created_at: Type.String(),
latitude: Type.Union([
Type.Number(),
Type.Null()
]),
longitude: Type.Union([
Type.Number(),
Type.Null()
]),
place_id: Type.Union([
Type.String(),
Type.Null()
])
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
surname: Type.Union([
Type.String(),
Type.Null()
]),
other_names: Type.Union([
Type.String(),
Type.Null()
]),
avatar_url: Type.Union([
Type.String(),
Type.Null()
]),
created_at: Type.String(),
deleted_at: Type.Union([
Type.String(),
Type.Null()
]),
latitude: Type.Union([
Type.Number(),
Type.Null()
]),
longitude: Type.Union([
Type.Number(),
Type.Null()
]),
place_id: Type.Union([
Type.String(),
Type.Null()
])
})

export type CustomerAuthUser = Static<typeof CustomerAuthUser>
export const CustomerAuthUser = Type.Object({
id: Type.String(),
phone: Type.Union([
Type.String(),
Type.Null()
]),
customer_id: Type.Number(),
surname: Type.Union([
Type.String(),
Type.Null()
]),
other_names: Type.Union([
Type.String(),
Type.Null()
]),
avatar_url: Type.Union([
Type.String(),
Type.Null()
]),
latitude: Type.Union([
Type.Number(),
Type.Null()
]),
longitude: Type.Union([
Type.Number(),
Type.Null()
]),
place_id: Type.Union([
Type.String(),
Type.Null()
])
})

export type BaseCustomerTransaction = Static<typeof BaseCustomerTransaction>
export const BaseCustomerTransaction = Type.Object({
id: Type.Number(),
customer_id: Type.Number(),
branch_id: Type.Number(),
amount: Type.Number(),
transaction_date: Type.Number(),
transaction_type: TransactionTypeValues,
created_at: Type.String()
})

export type BaseUserProfile = Static<typeof BaseUserProfile>
export const BaseUserProfile = Type.Object({
id: Type.String(),
phone: Type.String(),
last_login_at: Type.Union([
Type.String(),
Type.Null()
]),
created_at: Type.String(),
deleted_at: Type.Union([
Type.String(),
Type.Null()
])
})

export type BaseStaff = Static<typeof BaseStaff>
export const BaseStaff = Type.Object({
id: Type.Number(),
user_id: Type.String(),
branch_id: Type.Number(),
role: Type.Union([
StaffRoleValues,
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
address: Type.Union([
Type.String(),
Type.Null()
]),
notes: Type.Union([
Type.String(),
Type.Null()
]),
created_at: Type.String(),
updated_at: Type.Union([
Type.String(),
Type.Null()
]),
deleted_at: Type.Union([
Type.String(),
Type.Null()
])
})

export type BaseCustomerCredit = Static<typeof BaseCustomerCredit>
export const BaseCustomerCredit = Type.Object({
id: Type.Number(),
customer_id: Type.Number(),
branch_id: Type.Number(),
credit_amount: Type.Number(),
pending_redemption_amount: Type.Union([
Type.Number(),
Type.Null()
]),
approved_redemption_amount: Type.Union([
Type.Number(),
Type.Null()
]),
redemption_approval_staff_id: Type.Union([
Type.Number(),
Type.Null()
]),
expires_at: Type.Union([
Type.Number(),
Type.Null()
]),
revoked_at: Type.Union([
Type.String(),
Type.Null()
]),
revoked_by_user_id: Type.Union([
Type.String(),
Type.Null()
]),
created_at: Type.String(),
updated_at: Type.Union([
Type.String(),
Type.Null()
]),
deleted_at: Type.Union([
Type.String(),
Type.Null()
])
})

export type BaseCustomerCreditRedemption = Static<typeof BaseCustomerCreditRedemption>
export const BaseCustomerCreditRedemption = Type.Object({
id: Type.Number(),
customer_id: Type.Number(),
merchant_id: Type.Union([
Type.Number(),
Type.Null()
]),
amount_redeemed: Type.Number(),
approved_at: Type.Union([
Type.String(),
Type.Null()
]),
approved_by_staff_id: Type.Union([
Type.Number(),
Type.Null()
]),
rejected_at: Type.Union([
Type.String(),
Type.Null()
]),
created_at: Type.String(),
updated_at: Type.Union([
Type.String(),
Type.Null()
]),
deleted_at: Type.Union([
Type.String(),
Type.Null()
]),
branch_id: Type.Number()
})

export type BaseRunningCreditConfig = Static<typeof BaseRunningCreditConfig>
export const BaseRunningCreditConfig = Type.Object({
branch_id: Type.Number(),
config_group_id: Type.String(),
created_at: Type.String(),
credit_type: Type.Union([
CreditTypeValues,
Type.Null()
]),
credit_validity: Type.Union([
Type.Number(),
Type.Null()
]),
cumulative_scope: CumulativeScopeValues,
deleted_at: Type.Union([
Type.String(),
Type.Null()
]),
eligible_window: Type.Union([
Type.Number(),
Type.Null()
]),
fixed_credit_value: Type.Union([
Type.Number(),
Type.Null()
]),
id: Type.Number(),
is_active: Type.Boolean(),
maximum_allowed_credit: Type.Union([
Type.Number(),
Type.Null()
]),
percentage_credit_value: Type.Union([
Type.Number(),
Type.Null()
]),
terms: Type.Union([
Type.String(),
Type.Null()
]),
threshold_amount: Type.Union([
Type.Number(),
Type.Null()
]),
updated_at: Type.Union([
Type.String(),
Type.Null()
]),
images: Type.Union([
Type.Array(Type.String()),
Type.Null()
])
})

export type BaseFixedCreditConfig = Static<typeof BaseFixedCreditConfig>
export const BaseFixedCreditConfig = Type.Object({
branch_id: Type.Number(),
config_group_id: Type.Union([
Type.String(),
Type.Null()
]),
created_at: Type.String(),
deleted_at: Type.Union([
Type.String(),
Type.Null()
]),
description: Type.Union([
Type.String(),
Type.Null()
]),
end_date: Type.Union([
Type.Number(),
Type.Null()
]),
id: Type.Number(),
images: Type.Union([
Type.Array(Type.String()),
Type.Null()
]),
is_active: Type.Boolean(),
start_date: Type.Union([
Type.Number(),
Type.Null()
]),
terms: Type.Union([
Type.String(),
Type.Null()
]),
title: Type.Union([
Type.String(),
Type.Null()
]),
updated_at: Type.Union([
Type.String(),
Type.Null()
])
})