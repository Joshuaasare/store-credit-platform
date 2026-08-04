import { Type, Static } from '@sinclair/typebox'
import { BaseBranch, ApiErrorResponse, BaseCustomer, BaseCustomerTransaction, BaseUserProfile } from './main.schema'



export type CustomerWithUser = Static<typeof CustomerWithUser>
export const CustomerWithUser = Type.Composite([BaseCustomer, Type.Object({
users: Type.Union([
BaseUserProfile,
Type.Null()
])
})])

export type CustomerTransactions = Static<typeof CustomerTransactions>
export const CustomerTransactions = Type.Composite([BaseCustomerTransaction, Type.Object({
customer: CustomerWithUser,
branch: BaseBranch,
recorded_by_user: Type.Union([
BaseUserProfile,
Type.Null()
])
})])

export type TransactionTypeFilter = Static<typeof TransactionTypeFilter>
export const TransactionTypeFilter = Type.Union([
Type.Literal("all"),
Type.Literal("purchase"),
Type.Literal("credit_issue"),
Type.Literal("credit_redeem")
])

export type TransactionsFilters = Static<typeof TransactionsFilters>
export const TransactionsFilters = Type.Object({
type: Type.Optional(TransactionTypeFilter),
branch_id: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
start: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
end: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
])),
limit: Type.Optional(Type.Number()),
offset: Type.Optional(Type.Number())
})

export type TransactionsPage = Static<typeof TransactionsPage>
export const TransactionsPage = Type.Object({
rows: Type.Array(CustomerTransactions),
total: Type.Number(),
offset: Type.Number(),
limit: Type.Number()
})

export type CreatePurchaseRequest = Static<typeof CreatePurchaseRequest>
export const CreatePurchaseRequest = Type.Object({
phone: Type.String(),
amount: Type.Number(),
branch_id: Type.Optional(Type.Union([
Type.Number(),
Type.Null()
]))
})

export type TransactionsQuerystring = Static<typeof TransactionsQuerystring>
export const TransactionsQuerystring = TransactionsFilters

export type TransactionsResponse = Static<typeof TransactionsResponse>
export const TransactionsResponse = Type.Object({
success: Type.Literal(true),
data: TransactionsPage
})

export type CreatePurchaseResponse = Static<typeof CreatePurchaseResponse>
export const CreatePurchaseResponse = Type.Object({
success: Type.Literal(true),
data: CustomerTransactions
})

export type TransactionsApiResponse = Static<typeof TransactionsApiResponse>
export const TransactionsApiResponse = Type.Union([
TransactionsResponse,
ApiErrorResponse
])

export type CreatePurchaseApiResponse = Static<typeof CreatePurchaseApiResponse>
export const CreatePurchaseApiResponse = Type.Union([
CreatePurchaseResponse,
ApiErrorResponse
])