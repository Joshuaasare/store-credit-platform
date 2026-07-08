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