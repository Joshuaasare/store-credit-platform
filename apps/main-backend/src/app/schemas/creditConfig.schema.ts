import { Type, Static } from '@sinclair/typebox'
import { CreditTypeValues, CumulativeScopeValues, BaseBranch, ApiErrorResponse, BaseCustomerCredit, BaseRunningCreditConfig, BaseFixedCreditConfig } from './main.schema'



export type RunningCreditConfig = Static<typeof RunningCreditConfig>
export const RunningCreditConfig = Type.Intersect([
BaseRunningCreditConfig,
Type.Object({
branch: BaseBranch
})
])

export type FixedCreditConfig = Static<typeof FixedCreditConfig>
export const FixedCreditConfig = Type.Intersect([
BaseFixedCreditConfig,
Type.Object({
branch: BaseBranch
})
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
images: Type.Union([
Type.Array(Type.String()),
Type.Null()
]),
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
images: Type.Optional(Type.Union([
Type.Array(Type.String()),
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
title: Type.Union([
Type.String(),
Type.Null()
]),
description: Type.Union([
Type.String(),
Type.Null()
]),
images: Type.Union([
Type.Array(Type.String()),
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
title: Type.Optional(Type.Union([
Type.String(),
Type.Null()
])),
description: Type.Optional(Type.Union([
Type.String(),
Type.Null()
])),
images: Type.Optional(Type.Union([
Type.Array(Type.String()),
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

export type RunningCreditConfigDeleteResponse = Static<typeof RunningCreditConfigDeleteResponse>
export const RunningCreditConfigDeleteResponse = Type.Object({
success: Type.Literal(true),
data: Type.Null()
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

export type RunningCreditConfigDeleteApiResponse = Static<typeof RunningCreditConfigDeleteApiResponse>
export const RunningCreditConfigDeleteApiResponse = Type.Union([
RunningCreditConfigDeleteResponse,
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

export type FixedCreditConfigDeleteResponse = Static<typeof FixedCreditConfigDeleteResponse>
export const FixedCreditConfigDeleteResponse = Type.Object({
success: Type.Literal(true),
data: Type.Null()
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

export type FixedCreditConfigDeleteApiResponse = Static<typeof FixedCreditConfigDeleteApiResponse>
export const FixedCreditConfigDeleteApiResponse = Type.Union([
FixedCreditConfigDeleteResponse,
ApiErrorResponse
])

export type CustomerCreditWithRemaining = Static<typeof CustomerCreditWithRemaining>
export const CustomerCreditWithRemaining = Type.Composite([BaseCustomerCredit, Type.Object({
remaining: Type.Number(),
redeemed_total: Type.Number()
})])