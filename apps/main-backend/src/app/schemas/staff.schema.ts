import { Type, Static } from '@sinclair/typebox'
import { UserRoleValues, ApiErrorResponse } from './main.schema'



export type StaffRole = Static<typeof StaffRole>
export const StaffRole = UserRoleValues

export type StaffUser = Static<typeof StaffUser>
export const StaffUser = Type.Object({
id: Type.String(),
phone: Type.String(),
surname: Type.String(),
other_names: Type.Union([
Type.String(),
Type.Null()
]),
access_granted: Type.Boolean(),
role: StaffRole,
branch_id: Type.Number(),
branch_name: Type.Union([
Type.String(),
Type.Null()
]),
address: Type.Union([
Type.String(),
Type.Null()
]),
notes: Type.Union([
Type.String(),
Type.Null()
]),
last_login_at: Type.Union([
Type.String(),
Type.Null()
]),
created_at: Type.String(),
is_self: Type.Boolean()
})

export type StaffListFilters = Static<typeof StaffListFilters>
export const StaffListFilters = Type.Object({
search: Type.Optional(Type.Union([
Type.String(),
Type.Null()
])),
branch_id: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
role: Type.Optional(Type.Union([
StaffRole,
Type.Null()
])),
include_disabled: Type.Optional(Type.Union([
Type.Boolean(),
Type.Null()
])),
limit: Type.Optional(Type.Number()),
offset: Type.Optional(Type.Number())
})

export type StaffListPage = Static<typeof StaffListPage>
export const StaffListPage = Type.Object({
rows: Type.Array(StaffUser),
total: Type.Number(),
offset: Type.Number(),
limit: Type.Number()
})

export type StaffListQuerystring = Static<typeof StaffListQuerystring>
export const StaffListQuerystring = StaffListFilters

export type CreateStaffRequest = Static<typeof CreateStaffRequest>
export const CreateStaffRequest = Type.Object({
phone: Type.String(),
surname: Type.String(),
other_names: Type.Optional(Type.Union([
Type.String(),
Type.Null()
])),
role: StaffRole,
branch_id: Type.Number(),
access_granted: Type.Optional(Type.Boolean()),
address: Type.Optional(Type.Union([
Type.String(),
Type.Null()
])),
notes: Type.Optional(Type.Union([
Type.String(),
Type.Null()
]))
})

export type UpdateStaffRequest = Static<typeof UpdateStaffRequest>
export const UpdateStaffRequest = Type.Object({
phone: Type.Optional(Type.String()),
surname: Type.Optional(Type.String()),
other_names: Type.Optional(Type.Union([
Type.String(),
Type.Null()
])),
role: Type.Optional(StaffRole),
branch_id: Type.Optional(Type.Number()),
access_granted: Type.Optional(Type.Boolean()),
address: Type.Optional(Type.Union([
Type.String(),
Type.Null()
])),
notes: Type.Optional(Type.Union([
Type.String(),
Type.Null()
]))
})

export type SetStaffAccessRequest = Static<typeof SetStaffAccessRequest>
export const SetStaffAccessRequest = Type.Object({
access_granted: Type.Boolean()
})

export type StaffListResponse = Static<typeof StaffListResponse>
export const StaffListResponse = Type.Object({
success: Type.Literal(true),
data: StaffListPage
})

export type StaffMutationResponse = Static<typeof StaffMutationResponse>
export const StaffMutationResponse = Type.Object({
success: Type.Literal(true),
data: StaffUser
})

export type StaffDeleteResponse = Static<typeof StaffDeleteResponse>
export const StaffDeleteResponse = Type.Object({
success: Type.Literal(true),
data: Type.Object({
id: Type.String()
})
})

export type StaffListApiResponse = Static<typeof StaffListApiResponse>
export const StaffListApiResponse = Type.Union([
StaffListResponse,
ApiErrorResponse
])

export type StaffMutationApiResponse = Static<typeof StaffMutationApiResponse>
export const StaffMutationApiResponse = Type.Union([
StaffMutationResponse,
ApiErrorResponse
])

export type StaffAccessApiResponse = Static<typeof StaffAccessApiResponse>
export const StaffAccessApiResponse = StaffMutationApiResponse

export type StaffDeleteApiResponse = Static<typeof StaffDeleteApiResponse>
export const StaffDeleteApiResponse = Type.Union([
StaffDeleteResponse,
ApiErrorResponse
])