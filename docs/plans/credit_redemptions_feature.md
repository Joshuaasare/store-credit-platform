# Credit Redemptions Feature Plan

Status: **Planning — approved for implementation**
Date: 2026-08-09
Branch: `feature/webapp-redemption-approval-feature`
Scope: `apps/main-webapp` (primary), `apps/main-backend`, `libs/api-services`

## 1. Goal

A merchant-side **Credit Redemptions** page that lists all redemption requests
initiated by customers, with a manager-only approval / rejection workflow.

**Hard rule:** No redemption is ever approved unless it was *initiated by the
customer*. Cashiers and managers cannot create redemption rows. Only the
customer (via a future customer app) can initiate a redemption. This task builds
the merchant-side review/approve surface only; the customer-initiation channel
is out of scope and assumed to arrive later.

## 2. Decisions (from grilling session)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Meaning of "initiated by customer" | **A** — customer-app self-service is the initiation channel (future build); this task is the merchant approval queue only |
| 2 | Source of pending rows in this task | **C** — no producer in this task; pending rows come from the future customer app. Page is read-only + approve/reject actions |
| 3 | Approval actions | **C** — approve + reject, with `rejected_at` as a distinct state (column already to be added) |
| 4 | Filter tabs | **A** — three tabs: Pending / Approved / Rejected |
| 5 | Role gate + amount guard | Manager-only approve (backend-enforced now, frontend permissions left as TODO comment). Approve-time server-side rejection when `amount > current_remaining`. Customer app may allow requesting beyond remaining while a request is pending — so the amount check is at approve time, not request time |
| 6 | Reject role + page visibility | Reject is manager-only. Page visibility is manager-only |
| 7 | Row content | Identity/amounts only; **minimal** column list; **no** `rejected_by_staff_id` column |
| 8 | Reversibility + reject reason | Approve and reject are **final** (no undo). Reject requires **no reason** (one-click) |
| 9 | Nav/route + removal | Route `/redemptions`, nav slot **after Customers**, manager-only, lucide `Ticket` icon. **Full deletion** of the existing cashier-initiated redemption creation flow (frontend + backend) |
| 10 | Backend organization | **A** — new `RedemptionsService` + new `/redemptions` route group |

## 3. Data model

### 3.1 Schema addition (single-file migration)

Per the repo's single-file migration rule, all changes go in
`supabase/migrations/20260724000000_consolidated_schema.sql` (edit in place,
do NOT add a new migration file).

Add to `customer_credit_redemptions`:
- `rejected_at timestamptz` — null = not rejected; non-null = rejected timestamp.
- Index on `(credit_id)` covering rejected-at filtering (analogous to the
  existing approved-at index).

No `rejected_by_staff_id` (decision 7). No `status` enum — the three states are
derived from `approved_at` / `rejected_at`:

| State    | Condition                                         |
|----------|---------------------------------------------------|
| Pending  | `approved_at IS NULL AND rejected_at IS NULL`     |
| Approved | `approved_at IS NOT NULL`                         |
| Rejected | `rejected_at IS NOT NULL` (implies approved null) |

Invariant: `approved_at` and `rejected_at` are mutually exclusive. Enforced in
the service layer (approve rejects if `rejected_at` already set; reject rejects
if `approved_at` already set).

### 3.2 Regenerate types

After editing the migration, regenerate `apps/main-backend/src/app/types/database.types.ts`
so `rejected_at` is inferred natively (per the avoid-any / let-types-infer rule).

## 4. Backend

New domain: `redemptions`. Files (mirror the existing service-per-domain split):

- `apps/main-backend/src/app/services/redemptions.service.ts`
- `apps/main-backend/src/app/schemas/redemptions.schema.ts`
- `apps/main-backend/src/app/types/redemptions.types.ts`
- `apps/main-backend/src/app/routes/redemptions/index.ts` (auto-loaded by the
  existing `AutoLoad` in `app.ts` — no manual registration needed)

### 4.1 `GET /redemptions`

Merchant-scoped list, paginated, filtered by status.

Query params:
- `status`: `"pending" | "approved" | "rejected"` (required — no "all"; the page
  is always in one of the three tabs)
- `branch_id`: optional branch filter
- `limit` (default 20), `offset` (default 0)

Logic:
1. Resolve merchant's branch IDs (`branches.merchant_id = merchantId`). If the
   caller passes `branch_id`, intersect.
2. Query `customer_credit_redemptions` directly — it now has denormalized
   `customer_id` and `branch_id`, so filter with `.in("branch_id", branchIds)`.
3. Status filter:
   - `pending` → `.is("approved_at", null).is("rejected_at", null)`
   - `approved` → `.not("approved_at", "is", null)`
   - `rejected` → `.not("rejected_at", "is", null)`
4. `.is("deleted_at", null)` always.
5. Select with nested joins (composed from `QueryFragments`, per the
   query-fragments and nested-join-shape rules — no `any`/`as`):
   ```
   id, amount_redeemed, approved_at, rejected_at, created_at, credit_id,
   customer:customers(${QueryFragments.BASE_CUSTOMER}, users(${QueryFragments.BASE_USER_PROFILE})),
   branch:branches(${QueryFragments.BASE_BRANCH}),
   credit:customer_credit(id, credit_amount, expires_at, revoked_at)
   ```
6. Order by `created_at desc`, apply `.range(offset, offset + limit - 1)` and
   read `total` from the `Content-Range` / count header (match the pattern used
   elsewhere — confirm during implementation).
7. **Remaining per row** (computed inline, batched — do NOT call
   `getCreditRemaining` per row): for each `credit_id` in the page, sum
   `amount_redeemed` over approved, non-deleted redemptions on that credit, then
   `remaining = credit.credit_amount - sum`. One extra query scoped to the
   page's `credit_id` list. Attach `remaining` to each row. For approved rows,
   `remaining` is still shown (it's the live credit remaining after this and
   other approved redemptions); for rejected rows, remaining is informational.

Response shape (nested join, per the return-nested-join-shape rule):
```
{
  rows: RedemptionRow[],   // nested customer/branch/credit + derived remaining
  total, offset, limit
}
```

### 4.2 `POST /redemptions/:id/approve`

Manager-only. `preHandler: [requireAuth]` + a manager-role check (TODO comment:
frontend will also gate this; backend is the source of truth).

Logic:
1. Load the redemption row joined to `credit:customer_credit(branch:branches(merchant_id))`
   for merchant scoping. 404 if missing/deleted.
2. Verify merchant scope: `credit.branch.merchant_id === caller.merchantId`.
3. Verify state is pending: `approved_at IS NULL AND rejected_at IS NULL`.
   Else 409 ("already approved" / "already rejected").
4. **Amount guard:** compute `current_remaining = credit_amount − SUM(approved,
   non-deleted redemptions on this credit, excluding this row)`. If
   `row.amount_redeemed > current_remaining`, return 400 with a clear message
   ("Request exceeds remaining credit (remaining: GH₵X)"). The manager can then
   reject the now-unfulfillable request. (This preserves the invariant the
   existing `createRedemption` enforced.)
5. Update: `approved_at = now()`, `approved_by_staff_id = caller.staff_id`.
   `rejected_at` stays null.
6. Return the updated row (same nested shape as the list row).

### 4.3 `POST /redemptions/:id/reject`

Manager-only.

Logic:
1. Load + merchant-scope (same as approve).
2. Verify state is pending. Else 409.
3. Update: `rejected_at = now()`. No `rejected_by_staff_id` (decision 7).
4. Return the updated row.

### 4.4 Conventions

- Use `QueryFragments.*` in every `select(...)` over 3 columns.
- No `any` / `as` — let `database.types.ts` infer; use dotted-column syntax for
  nested filters where needed.
- Services return the nested join shape; `is_self`-style derived fields belong
  on the frontend, not the service.

## 5. Backend deletions (decision 9b — full removal)

Remove the cashier/manager-initiated redemption creation flow entirely.

### 5.1 Backend
- Delete route `POST /customers/credits/redeem` in
  `apps/main-backend/src/app/routes/customers/index.ts`.
- Delete `CustomerService.createRedemption` in
  `apps/main-backend/src/app/services/customers.service.ts`.
- Delete `CreateRedemptionRequest` / `CreateRedemptionResponse` /
  `CreateRedemptionApiResponse` from
  `apps/main-backend/src/app/schemas/customers.schema.ts` and
  `apps/main-backend/src/app/types/customers.types.ts`, plus imports.
- **Orphaned-by-deletion cleanup:** `GET /customers/credits/:creditId/remaining`
  is used only by `AddRedemptionDialog` (being deleted) and by
  `createRedemption` (being deleted). `CustomerService.getCreditRemaining` is
  used only by those two. Delete the route, the service method, and the
  `CreditRemainingApiResponse` schema/type **only if** no other caller remains
  after the dialog is gone. (Customer-detail credits endpoint computes
  `redeemed_total`/`remaining` inline and does NOT call `getCreditRemaining`, so
  deletion is safe — verify with a final grep before deleting.)

### 5.2 `libs/api-services`
- Delete `customerService.createRedemption` and `customerService.getCreditRemaining`
  from `libs/api-services/src/services/customerService.ts`.
- Delete `CreateRedemptionRequest` / `CreateRedemptionResponse` /
  `CreateRedemptionApiResponse` / `CreditRemainingResponse` /
  `CreditRemainingApiResponse` from `libs/api-services/src/types/api.types.ts`.
- Add a new `redemptionService` (in `libs/api-services/src/services/redemptionService.ts`)
  exposing `listRedemptions`, `approveRedemption`, `rejectRedemption`. Export
  from `libs/api-services/src/index.ts`.
- Add `RedemptionRow`, `RedemptionStatus`, `RedemptionsPage`,
  `RedemptionsFilters` types to `api.types.ts`.

## 6. Frontend (`apps/main-webapp`)

### 6.1 New page

`apps/main-webapp/src/app/pages/Redemptions/Redemptions.tsx` with:
- Three-tab filter (Pending / Approved / Rejected) — reuse the `FilterBar` /
  tab pattern already used in Transactions.
- `DataTable` (existing component) with minimal columns:
  1. Customer — name + phone (from nested `customer`).
  2. Branch — name.
  3. Credit amount — `credit.credit_amount`.
  4. Remaining — derived `remaining` (from the list response).
  5. Requested amount — `amount_redeemed`.
  6. Requested at — `created_at` (formatted).
  7. Status — badge (Pending / Approved / Rejected), semantic colors per
     existing `ui.utils.ts` mapping convention.
  8. Actions — Approve / Reject buttons, shown **only on the Pending tab**.
     Disabled while a mutation is in flight for that row. On Pending rows only.
- Pagination matching the Transactions list pattern (offset/limit).
- React Query keys: `["redemptions", { status, branchId, offset, limit }]`.
  Invalidate on approve/reject success; the affected row moves tabs, so also
  invalidate the adjacent tabs.

### 6.2 Route + nav

- `src/app/App.tsx`: add `<Route path="/redemptions" element={<Redemptions />} />`
  inside the protected layout.
- `src/app/pages/MainLayout/MainLayout.tsx`:
  - Add `REDEMPTIONS: "/redemptions"` to `routes`.
  - Add nav item `{ title: "Redemptions", url: routes.REDEMPTIONS, icon: Ticket,
    permissions: ["manager"] }` **after** the Customers item.
  - Import `Ticket` from lucide-react.

### 6.3 Frontend deletions
- Delete `apps/main-webapp/src/app/pages/Transactions/components/AddRedemptionDialog.tsx`.
- Remove its import + usage from
  `apps/main-webapp/src/app/pages/Transactions/components/TransactionDetailDialog.tsx`
  (the `<AddRedemptionDialog>` block around line 156 and the import at line 26).
  If `TransactionDetailDialog` no longer makes sense for `credit_issue` rows
  without a redeem action, simplify it — but do not remove the detail dialog
  itself; it still shows purchase / credit-issue / credit-redeem details.

### 6.4 Frontend permissions TODO
- The Redemptions nav item is already gated by `permissions: ["manager"]` via
  the existing `navItems` mechanism. The Approve / Reject buttons are rendered
  only on the Pending tab. A finer-grained frontend permission check (e.g.
  hiding buttons for non-managers who somehow reach the page) is **left as a
  TODO comment** per decision 5 — the backend is the source of truth for now.

## 7. Conventions checklist (from memory)

- Single-file migration: edit `20260724000000_consolidated_schema.sql` in place.
- Reuse `QueryFragments.*` in `select(...)` strings over 3 columns.
- No `any` / `as`; use dotted-column syntax for nested filters so
  `database.types.ts` infers.
- Services return the nested join shape; derived fields stay on the frontend.
- Brand voltage: teal (`primary`) is the single accent; semantic badges stay
  literal colors; Inter font. Status badges: Pending = neutral, Approved =
  teal/primary, Rejected = destructive — confirm against `ui.utils.ts` mapping
  during implementation.

## 8. Out of scope

- The customer-facing redemption initiation app/channel.
- Customer-side enforcement of "may request beyond remaining while a request is
  pending" — that's a customer-app concern.
- Undo of approve/reject.
- Reject reason / `rejected_by_staff_id` / rejected-by attribution.
- A fourth "all" filter tab.

## 9. Implementation order

1. **Migration + types:** add `rejected_at` + index to the consolidated
   migration; regenerate `database.types.ts`.
2. **Backend service + schemas + types:** `redemptions.service.ts`,
   `redemptions.schema.ts`, `redemptions.types.ts`.
3. **Backend routes:** `routes/redemptions/index.ts` with list/approve/reject.
4. **Backend deletions:** remove `POST /customers/credits/redeem`,
   `createRedemption`, and orphaned `getCreditRemaining` + its route.
5. **api-services:** add `redemptionService` + types; delete
   `createRedemption` / `getCreditRemaining` + their types.
6. **Frontend deletions:** delete `AddRedemptionDialog.tsx` + clean
   `TransactionDetailDialog.tsx`.
7. **Frontend page:** `Redemptions.tsx` + DataTable + tabs.
8. **Nav + route:** `MainLayout.tsx` + `App.tsx`.
9. **Manual verification:** start the webapp, exercise the three tabs, confirm
   empty pending state is acceptable, verify approve/reject flow against
   seeded rows (insert a pending row via SQL to demo).
10. **Typecheck + lint + affected tests** (`/test-affected`).