import { Type, Static } from '@sinclair/typebox'
import { BaseBranch, ApiErrorResponse } from './main.schema'



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

export type RunningCreditConfigGroup = Static<typeof RunningCreditConfigGroup>
export const RunningCreditConfigGroup = Type.Object({
config_group_id: Type.String(),
branches: Type.Array(BaseBranch),
credit_type: Type.Union([
CreditTypeValues,
Type.Null()
]),
credit_validity: Type.Union([
Type.Number(),
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
percentage_credit_value: Type.Union([
Type.Number(),
Type.Null()
]),
maximum_allowed_credit: Type.Union([
Type.Number(),
Type.Null()
]),
threshold_amount: Type.Union([
Type.Number(),
Type.Null()
]),
terms: Type.Union([
Type.String(),
Type.Null()
]),
cumulative_scope: CumulativeScopeValues,
is_active: Type.Boolean(),
created_at: Type.String(),
updated_at: Type.Union([
Type.String(),
Type.Null()
])
})

export type CreateRunningCreditConfigRequest = Static<typeof CreateRunningCreditConfigRequest>
export const CreateRunningCreditConfigRequest = Type.Object({
branch_ids: Type.Array(Type.Number()),
credit_type: Type.Union([
CreditTypeValues,
Type.Null()
]),
credit_validity: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
eligible_window: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
fixed_credit_value: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
percentage_credit_value: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
maximum_allowed_credit: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
threshold_amount: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
terms: Type.Optional(Type.Union([
Type.String(),
Type.Null()
])),
cumulative_scope: CumulativeScopeValues
})

export type UpdateRunningCreditConfigRequest = Static<typeof UpdateRunningCreditConfigRequest>
export const UpdateRunningCreditConfigRequest = CreateRunningCreditConfigRequest

export type FixedCreditConfigGroup = Static<typeof FixedCreditConfigGroup>
export const FixedCreditConfigGroup = Type.Object({
config_group_id: Type.String(),
branches: Type.Array(BaseBranch),
credit_type: Type.Union([
CreditTypeValues,
Type.Null()
]),
fixed_credit_value: Type.Union([
Type.Number(),
Type.Null()
]),
percentage_credit_value: Type.Union([
Type.Number(),
Type.Null()
]),
maximum_allowed_credit: Type.Union([
Type.Number(),
Type.Null()
]),
start_date: Type.Union([
Type.Number(),
Type.Null()
]),
end_date: Type.Union([
Type.Number(),
Type.Null()
]),
terms: Type.Union([
Type.String(),
Type.Null()
]),
is_active: Type.Boolean(),
created_at: Type.String(),
updated_at: Type.Union([
Type.String(),
Type.Null()
])
})

export type CreateFixedCreditConfigRequest = Static<typeof CreateFixedCreditConfigRequest>
export const CreateFixedCreditConfigRequest = Type.Object({
branch_ids: Type.Array(Type.Number()),
credit_type: Type.Union([
CreditTypeValues,
Type.Null()
]),
fixed_credit_value: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
percentage_credit_value: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
maximum_allowed_credit: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
start_date: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
end_date: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
terms: Type.Optional(Type.Union([
Type.String(),
Type.Null()
]))
})

export type UpdateFixedCreditConfigRequest = Static<typeof UpdateFixedCreditConfigRequest>
export const UpdateFixedCreditConfigRequest = CreateFixedCreditConfigRequest

export type ToggleActiveRequest = Static<typeof ToggleActiveRequest>
export const ToggleActiveRequest = Type.Object({
is_active: Type.Boolean()
})

export type RunningCreditConfigListResponse = Static<typeof RunningCreditConfigListResponse>
export const RunningCreditConfigListResponse = Type.Object({
success: Type.Literal(true),
data: Type.Array(RunningCreditConfigGroup)
})

export type RunningCreditConfigMutationResponse = Static<typeof RunningCreditConfigMutationResponse>
export const RunningCreditConfigMutationResponse = Type.Object({
success: Type.Literal(true),
data: RunningCreditConfigGroup
})

export type RunningCreditConfigListApiResponse = Static<typeof RunningCreditConfigListApiResponse>
export const RunningCreditConfigListApiResponse = Type.Union([
RunningCreditConfigListResponse,
ApiErrorResponse
])

export type RunningCreditConfigMutationApiResponse = Static<typeof RunningCreditConfigMutationApiResponse>
export const RunningCreditConfigMutationApiResponse = Type.Union([
RunningCreditConfigMutationResponse,
ApiErrorResponse
])

export type FixedCreditConfigListResponse = Static<typeof FixedCreditConfigListResponse>
export const FixedCreditConfigListResponse = Type.Object({
success: Type.Literal(true),
data: Type.Array(FixedCreditConfigGroup)
})

export type FixedCreditConfigMutationResponse = Static<typeof FixedCreditConfigMutationResponse>
export const FixedCreditConfigMutationResponse = Type.Object({
success: Type.Literal(true),
data: FixedCreditConfigGroup
})

export type FixedCreditConfigListApiResponse = Static<typeof FixedCreditConfigListApiResponse>
export const FixedCreditConfigListApiResponse = Type.Union([
FixedCreditConfigListResponse,
ApiErrorResponse
])

export type FixedCreditConfigMutationApiResponse = Static<typeof FixedCreditConfigMutationApiResponse>
export const FixedCreditConfigMutationApiResponse = Type.Union([
FixedCreditConfigMutationResponse,
ApiErrorResponse
])

export type CustomerCreditRow = Static<typeof CustomerCreditRow>
export const CustomerCreditRow = Type.Object({
id: Type.Number(),
customer_id: Type.Number(),
branch_id: Type.Number(),
credit_type: CreditTypeValues,
credit_precentage: Type.Union([
Type.Number(),
Type.Null()
]),
max_credit_amount: Type.Union([
Type.Number(),
Type.Null()
]),
expires_at: Type.Union([
Type.Number(),
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