import { Type, Static } from '@sinclair/typebox'
import { CreditTypeValues, CumulativeScopeValues, BaseBranch, ApiErrorResponse, BaseCustomerCredit, BaseRunningCreditConfig, BaseFixedCreditConfig } from './main.schema'



export type RunningCreditConfig = Static<typeof RunningCreditConfig>
export const RunningCreditConfig = Type.Intersect([
BaseRunningCreditConfig,
Type.Object({
branches: Type.Array(BaseBranch),
favorite_count: Type.Number()
})
])

export type FixedCreditConfig = Static<typeof FixedCreditConfig>
export const FixedCreditConfig = Type.Intersect([
BaseFixedCreditConfig,
Type.Object({
branches: Type.Array(BaseBranch),
favorite_count: Type.Number()
})
])

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
url: Type.Optional(Type.Union([
Type.String(),
Type.Null()
])),
cumulative_scope: CumulativeScopeValues,
images: Type.Optional(Type.Union([
Type.Array(Type.String()),
Type.Null()
]))
})

export type UpdateRunningCreditConfigRequest = Static<typeof UpdateRunningCreditConfigRequest>
export const UpdateRunningCreditConfigRequest = CreateRunningCreditConfigRequest

export type RunningCreditConfigUpdate = Static<typeof RunningCreditConfigUpdate>
export const RunningCreditConfigUpdate = Type.Object({
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
url: Type.Union([
Type.String(),
Type.Null()
]),
cumulative_scope: CumulativeScopeValues,
images: Type.Optional(Type.Array(Type.String()))
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
])),
url: Type.Optional(Type.Union([
Type.String(),
Type.Null()
]))
})

export type UpdateFixedCreditConfigRequest = Static<typeof UpdateFixedCreditConfigRequest>
export const UpdateFixedCreditConfigRequest = CreateFixedCreditConfigRequest

export type FixedCreditConfigUpdate = Static<typeof FixedCreditConfigUpdate>
export const FixedCreditConfigUpdate = Type.Object({
title: Type.Union([
Type.String(),
Type.Null()
]),
description: Type.Union([
Type.String(),
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
url: Type.Union([
Type.String(),
Type.Null()
]),
images: Type.Optional(Type.Array(Type.String()))
})

export type ToggleActiveRequest = Static<typeof ToggleActiveRequest>
export const ToggleActiveRequest = Type.Object({
is_active: Type.Boolean()
})

export type FavoritedRunningCreditConfig = Static<typeof FavoritedRunningCreditConfig>
export const FavoritedRunningCreditConfig = Type.Intersect([
RunningCreditConfig,
Type.Object({
favorited_at: Type.String()
})
])

export type FavoritedFixedCreditConfig = Static<typeof FavoritedFixedCreditConfig>
export const FavoritedFixedCreditConfig = Type.Intersect([
FixedCreditConfig,
Type.Object({
favorited_at: Type.String()
})
])

export type CustomerFavoritesListResponse = Static<typeof CustomerFavoritesListResponse>
export const CustomerFavoritesListResponse = Type.Object({
success: Type.Literal(true),
data: Type.Object({
running: Type.Array(FavoritedRunningCreditConfig),
fixed: Type.Array(FavoritedFixedCreditConfig)
})
})

export type FavoritedMerchantSummary = Static<typeof FavoritedMerchantSummary>
export const FavoritedMerchantSummary = Type.Object({
id: Type.Number(),
name: Type.Union([
Type.String(),
Type.Null()
]),
logo_url: Type.Union([
Type.String(),
Type.Null()
])
})

export type FavoritedConfig = Static<typeof FavoritedConfig>
export const FavoritedConfig = Type.Union([
Type.Object({
config_type: Type.Literal("running"),
config: FavoritedRunningCreditConfig,
merchant: Type.Union([
FavoritedMerchantSummary,
Type.Null()
])
}),
Type.Object({
config_type: Type.Literal("fixed"),
config: FavoritedFixedCreditConfig,
merchant: Type.Union([
FavoritedMerchantSummary,
Type.Null()
])
})
])

export type CustomerFavoritesPage = Static<typeof CustomerFavoritesPage>
export const CustomerFavoritesPage = Type.Object({
rows: Type.Array(FavoritedConfig),
total: Type.Number(),
offset: Type.Number(),
limit: Type.Number()
})

export type CustomerFavoritesPageResponse = Static<typeof CustomerFavoritesPageResponse>
export const CustomerFavoritesPageResponse = Type.Object({
success: Type.Literal(true),
data: CustomerFavoritesPage
})

export type FavoriteMutationResponse = Static<typeof FavoriteMutationResponse>
export const FavoriteMutationResponse = Type.Object({
success: Type.Literal(true)
})

export type CustomerFavoritesListApiResponse = Static<typeof CustomerFavoritesListApiResponse>
export const CustomerFavoritesListApiResponse = Type.Union([
CustomerFavoritesListResponse,
ApiErrorResponse
])

export type CustomerFavoritesPageApiResponse = Static<typeof CustomerFavoritesPageApiResponse>
export const CustomerFavoritesPageApiResponse = Type.Union([
CustomerFavoritesPageResponse,
ApiErrorResponse
])

export type FavoriteMutationApiResponse = Static<typeof FavoriteMutationApiResponse>
export const FavoriteMutationApiResponse = Type.Union([
FavoriteMutationResponse,
ApiErrorResponse
])

export type ClickMutationResponse = Static<typeof ClickMutationResponse>
export const ClickMutationResponse = Type.Object({
success: Type.Literal(true)
})

export type ClickMutationApiResponse = Static<typeof ClickMutationApiResponse>
export const ClickMutationApiResponse = Type.Union([
ClickMutationResponse,
ApiErrorResponse
])

export type RunningCreditConfigListResponse = Static<typeof RunningCreditConfigListResponse>
export const RunningCreditConfigListResponse = Type.Object({
success: Type.Literal(true),
data: Type.Array(RunningCreditConfig)
})

export type RunningCreditConfigMutationResponse = Static<typeof RunningCreditConfigMutationResponse>
export const RunningCreditConfigMutationResponse = Type.Object({
success: Type.Literal(true),
data: RunningCreditConfig
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
data: Type.Array(FixedCreditConfig)
})

export type FixedCreditConfigMutationResponse = Static<typeof FixedCreditConfigMutationResponse>
export const FixedCreditConfigMutationResponse = Type.Object({
success: Type.Literal(true),
data: FixedCreditConfig
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