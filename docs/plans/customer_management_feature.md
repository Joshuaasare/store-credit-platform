# Customer Management Feature — Handoff Document

## Context

We're adding a Customer Management feature to the Store Credit Platform (Nx monorepo, Fastify + Supabase backend, React + Vite webapp). The app currently has a MyStore page (modern hero + stats + branches) but no customer-facing management. This feature introduces a `/customers` route with two sub-routes — a **Leaderboard** and a **Transactions** list — both paginated with infinite scroll, plus an "Add a purchase" modal. The data lives in `customer_transactions` (ledger) and `customers` (phone-identified, optionally linked to `users` once the customer logs into the mobile app).

Scope is deliberately narrow: **no credit-issuance engine yet.** The "Add a purchase" modal only logs a `purchase` row. Triggering credit issuance on a purchase is a separate, larger feature to be planned later.

### Key schema facts (from `apps/main-backend/src/app/types/database.types.ts`)
- `customer_transactions`: `id`, `customer_id`, `branch_id`, `recorded_by_user_id`, `amount`, `transaction_date` (**Unix epoch seconds, number**), `transaction_type` enum (`"purchase" | "credit_issue" | "credit_redeem"`), `credit_generated`, `credit_redeemed`, timestamps, `deleted_at`.
- `transaction_type` enum is **`"purchase" | "credit_issue" | "credit_redeem"`** (NOT `credit_adjustment` — the old plan doc is wrong).
- `customers`: `id`, `phone` (nullable, E.164), `unique_id`, timestamps, `deleted_at`. **No name column.**
- The user has added a nullable `customers.user_id` → `users.id` column locally so a customer's name (`users.surname + other_names`) can be shown once they log into the mobile app. ⚠️ **`database.types.ts` has NOT been regenerated to include `customers.user_id`.** First implementation step must regenerate types (`supabase gen types typescript ...`) or hand-add `user_id: string | null` to the `customers` Row/Insert/Update before coding against it.
- `branch_customer` junction (`branch_id`, `customer_id`, `deleted_at` required on insert).
- `branches` has `merchant_id`, `name`.
- `users` has `surname`, `other_names`, `phone`.

### Decisions confirmed with the user
1. **"Purchases made"** ranks by `SUM(amount) WHERE transaction_type = 'purchase'`.
2. **Deprecate `credit_generated` and `credit_redeemed` columns.** `amount` is the canonical value per `transaction_type`: `purchase`→cash paid, `credit_issue`→credit issued, `credit_redeem`→credit redeemed. (Columns are not dropped in this feature — just ignored; a later cleanup can drop them.)
3. **"Credits issued"** ranks by `SUM(amount) WHERE transaction_type = 'credit_issue'`.
4. **"Credits redeemed"** ranks by `SUM(amount) WHERE transaction_type = 'credit_redeem'`.
5. **Leaderboard aggregation:** Postgres RPC function (server-side `GROUP BY` + `ORDER BY` + `LIMIT/OFFSET`), called via `supabase.rpc()`. Supabase JS (PostgREST) cannot do `GROUP BY`.
6. **Leaderboard scope:** merchant-wide by default with an optional **branch dropdown** (default "All branches"). Merchant is fixed by the caller's JWT `merchant_id`.
7. **"This year" date filter default** = calendar year (Jan 1 → today). Other options: Custom date range, All data.
8. **Transactions page:** merchant-wide, same branch + date filter UI, ordered by `transaction_date` desc, **offset pagination** via Supabase `.range()`. Join customer (→ users for name) + branch (name) + recorded_by_user (users.surname).
9. **"Add a purchase" modal** (button labelled "Add a purchase"): inserts a `customer_transactions` row, `transaction_type='purchase'`, `amount` = entered amount, `branch_id` = caller's staff branch (from JWT), `recorded_by_user_id` = caller. **Auto-create** the `customers` row (by phone) and `branch_customer` junction row if the phone isn't found. No credit calculation, no pool/pending/SMS.
10. **Customer display:** primary = `users.surname + other_names` when `customer.user_id` is linked; else "Unnamed customer". Phone (E.164) is always shown as a muted secondary line.
11. **react-query provider:** wrap `<App/>` with `<QueryClientProvider>` in `apps/main-webapp/src/index.tsx` (inside `<BrowserRouter>`, outside `<App/>`). Existing Zustand stores stay; react-query is used only for the new paginated customer queries.
12. **Leaderboard composition:** `useInfiniteQuery` → flatten `data.pages` into one array → pass to `DataTable` with `hasPagination={false}` → wrap the table in `InfiniteScroll` whose `next()` checks `hasNextPage && !isFetching` then calls `fetchNextPage()`. A rank column (`#1, #2, …`) is derived from row index.
13. **Routing:** parent `/customers` renders top tabs + `<Outlet/>`. Children: index `/customers` → redirect to `/customers/leaderboard`; `/customers/leaderboard`; `/customers/transactions`. Top tabs use the existing `animated-tabs.tsx` (`libs/web-components`).
14. **Leaderboard page chrome:** hero header strip ("Customers" title + subtitle) + a 3-card stats row (total customers, total purchases GH₵ in window, total credit issued GH₵ in window) + filter bar + DataTable card. Mirrors `MyStore`'s hero+stats+content rhythm.
15. **Transactions page columns:** Date, Customer, Branch, Type (badge), Amount (colored by type), Recorded by (staff surname). Row click opens a detail dialog.
16. **Backend file naming:** follow the existing **active** convention — `schemas/customers.schema.ts` (TypeBox, doubles as types via `Static<>`), `services/customers.service.ts`, `routes/customers/index.ts`. The user mentioned `customers.types.ts` but the existing `*.types.ts` files are stale duplicates; do not create one. Add `BASE_CUSTOMER` + transaction fragments to `constants/queryFragments.ts`.

---

## Files to create / modify

### Backend — `apps/main-backend/src/app/`

**New migration** — `supabase/migrations/<timestamp>_customer_leaderboard_rpc.sql`
- Create a Postgres function `get_customer_leaderboard(p_merchant_id bigint, p_branch_id bigint default null, p_sort text default 'purchases', p_start_epoch bigint default null, p_end_epoch bigint default null, p_limit int default 20, p_offset int default 0)` returning a table:
  `customer_id bigint, phone text, user_id uuid, customer_name text, branch_id bigint, total_purchases numeric, total_credits_issued numeric, total_credits_redeemed numeric, transaction_count bigint`.
- Implementation sketch:
  - CTE `filtered_tx` = `SELECT * FROM customer_transactions t JOIN branches b ON b.id = t.branch_id WHERE b.merchant_id = p_merchant_id AND t.deleted_at IS NULL AND (p_branch_id IS NULL OR t.branch_id = p_branch_id) AND (p_start_epoch IS NULL OR t.transaction_date >= p_start_epoch) AND (p_end_epoch IS NULL OR t.transaction_date <= p_end_epoch)`.
  - CTE `agg` = `SELECT customer_id, SUM(amount) FILTER (WHERE transaction_type='purchase') AS total_purchases, SUM(amount) FILTER (WHERE transaction_type='credit_issue') AS total_credits_issued, SUM(amount) FILTER (WHERE transaction_type='credit_redeem') AS total_credits_redeemed, COUNT(*) AS transaction_count FROM filtered_tx GROUP BY customer_id`.
  - `ORDER BY` the chosen metric desc (`p_sort ∈ {'purchases','credits_issued','credits_redeemed'}`, default purchases), `LIMIT p_limit OFFSET p_offset`.
  - Left-join `customers` (phone, user_id) and `users` (surname, other_names) → `customer_name = COALESCE(surname || ' ' || COALESCE(other_names,''), 'Unnamed customer')`.
  - Add `LANGUAGE sql STABLE`. Grant execute to the `authenticated`/service role.
- Also add a companion `get_customer_leaderboard_count(...)` (same filters, `SELECT COUNT(DISTINCT customer_id)`) for `hasNextPage`, OR return total count as an out-param / second column — pick the simplest: a second RPC call returning the total count.

**`schemas/customers.schema.ts`** (TypeBox — types + Fastify validators)
- `LeaderboardSort = Type.Union([Type.Literal("purchases"), Type.Literal("credits_issued"), Type.Literal("credits_redeemed")])`.
- `LeaderboardQuerystring = Type.Object({ sort: Type.Optional(LeaderboardSort), branch_id: Type.Optional(Type.Number()), start: Type.Optional(Type.Number()), end: Type.Optional(Type.Number()), limit: Type.Optional(Type.Number()), offset: Type.Optional(Type.Number()) })`.
- `LeaderboardRow`, `LeaderboardResponse = Type.Object({ success: Type.Boolean(), data: Type.Object({ rows: Type.Array(LeaderboardRow), total: Type.Number() }) })`.
- `TransactionsQuerystring` (branch_id?, start?, end?, limit?, offset?).
- `TransactionRow` (joined shape: id, transaction_date, amount, transaction_type, customer_id, customer_name, customer_phone, branch_id, branch_name, recorded_by_user_id, recorded_by_name).
- `TransactionsResponse`, `CreatePurchaseRequest = Type.Object({ phone: Type.String(), amount: Type.Number({ minimum: 0.01 }) })`, `CreatePurchaseResponse`.
- Export `Static<>` types for the service and frontend.

**`services/customers.service.ts`**
- Class `CustomerService` with:
  - `getLeaderboard(merchantId, { sort, branchId, start, end, limit, offset })` → `supabaseAdmin.rpc("get_customer_leaderboard", { p_merchant_id, p_branch_id, p_sort, p_start_epoch, p_end_epoch, p_limit, p_offset })` + a `get_customer_leaderboard_count` call for total. Default `limit=20`, `offset=0`, `sort='purchases'`.
  - `getTransactions(merchantId, { branchId, start, end, limit, offset })` → `supabaseAdmin.from("customer_transactions").select("*, customer:customers(*), branch:branches(*), recorded_by_user:users(*)").eq(...)`. Merchant scope via filtering `branch_id IN (select id from branches where merchant_id = ...)`. Since PostgREST can't filter by a parent column directly, either (a) fetch the merchant's branch IDs first then `.in("branch_id", branchIds)`, or (b) use an RPC. Recommended: fetch branch IDs once per call (small array) and use `.in()`. Apply date filters as `transaction_date >= start`/`<= end` (epoch seconds). Order by `transaction_date` desc. Use `.range(offset, offset + limit - 1)`. Get total via a parallel `count: "exact", head: true` query with the same filters.
  - `createPurchase(user, { phone, amount })`:
    1. Resolve caller's `branch_id` from `staff` (via `user.sub`) — reuse `branchService`/`staffService` lookup pattern; fall back to JWT `branch_id` if present.
    2. Lookup `customers` by `phone` (and `deleted_at IS NULL`). If missing, insert new `customers { phone }`. Upsert `branch_customer { branch_id, customer_id, deleted_at: null }` if not already linked.
    3. Insert `customer_transactions { customer_id, branch_id, amount, transaction_type: "purchase", transaction_date: <now epoch seconds>, recorded_by_user_id: user.sub }`.
    4. Return the inserted row (with joined customer + branch).
- Export singleton `export const customerService = new CustomerService()`.

**`routes/customers/index.ts`** (auto-mounted at `/customers` via `@fastify/autoload`)
- `GET /leaderboard` — `preHandler: [requireAuth]`. Read `request.user.merchant_id`. Parse querystring (TypeBox schema). Call `customerService.getLeaderboard`. Return `LeaderboardResponse`.
- `GET /transactions` — `preHandler: [requireAuth]`. Same merchant scoping. Parse querystring. Call `customerService.getTransactions`. Return `TransactionsResponse`.
- `POST /transactions/purchase` — `preHandler: [requireAuth]`. Body = `CreatePurchaseRequest`. Call `customerService.createPurchase(request.user, body)`. Return created row.
- All responses wrap in `{ success: true, data }` or `ApiErrorResponse` (the repo convention).
- Merchant scoping: resolve `merchantId` from `request.user.merchant_id` (fallback to `merchantService.getMerchantIdForUser(user.sub)`) — copy the pattern from `routes/branches/index.ts`.

**`constants/queryFragments.ts`** — add `BASE_CUSTOMER = "id, phone, unique_id, user_id, created_at"` and a `CUSTOMER_TRANSACTION_WITH_JOINS` fragment (the nested select string for the transactions list).

**`types/database.types.ts`** — regenerate via `npx supabase gen types typescript --project-id <id> --schema public > apps/main-backend/src/app/types/database.types.ts` (or hand-add `user_id: string | null` to `customers` Row/Insert/Update). Also regenerate the frontend copy at `apps/main-webapp/src/app/shared/types/` if one exists there.

### Frontend — `apps/main-webapp/src/`

**`index.tsx`** — add `QueryClient`:
```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } } });
// ...
<StrictMode>
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </BrowserRouter>
</StrictMode>
```

**`app/app.tsx`** — add nested `/customers` routes inside `<MainLayout>`:
```tsx
import Customers from "./pages/Customers/Customers";
import CustomersLeaderboard from "./pages/Customers/CustomersLeaderboard";
import CustomersTransactions from "./pages/Customers/CustomersTransactions";
// inside <Route element={<MainLayout />}>:
<Route path="customers" element={<Customers />}>
  <Route index element={<Navigate to="leaderboard" replace />} />
  <Route path="leaderboard" element={<CustomersLeaderboard />} />
  <Route path="transactions" element={<CustomersTransactions />} />
</Route>
```

**`pages/MainLayout/MainLayout.tsx`** — add a `CUSTOMERS` entry to `routes` + `navItems` (icon: `Users`), path `/customers`.

**`pages/Customers/Customers.tsx`** (parent) — renders the page shell (gradient header strip "Customers" + subtitle), the `animated-tabs` top tabs (Leaderboard / Transactions) wired to navigate to the two sub-routes via `useNavigate`/`useLocation` for active state, and `<Outlet/>` below. Mirror `MyStore.tsx`'s shell classes (`min-h-screen bg-background px-4 py-6 md:px-8 md:py-10`, `mx-auto max-w-7xl space-y-8`).

**`pages/Customers/CustomersLeaderboard.tsx`** — renders:
- 3-card stats row (reuse the card primitive; data from a separate `useQuery` hitting `/customers/leaderboard-stats` OR derive from the first leaderboard page — simplest: a small `useQuery` for totals). If stats endpoint is out of scope, compute stats client-side from the first page's totals and label as "top-N preview". **Recommendation:** add a lightweight `GET /customers/leaderboard-stats` (merchant-scoped, same date/branch filter) returning `{ total_customers, total_purchases, total_credits_issued }`. Keeps the stats row accurate regardless of scroll position.
- Filter bar: sort `Select` (Purchases made / Credits issued / Credits redeemed — default Purchases), branch `Select` (All branches + list from existing branch store/service), date filter (three-way segmented control: This year / Custom / All — Custom reveals two date inputs using the shadcn date picker / popover).
- `useInfiniteQuery({ queryKey: ["customers","leaderboard", { sort, branchId, start, end }], queryFn: ({ pageParam = 0 }) => customerService.getLeaderboard({ sort, branchId, start, end, offset: pageParam, limit: 20 }), getNextPageParam: (last) => last.offset + 20 < last.total ? last.offset + 20 : undefined, initialPageParam: 0 })`.
- Flatten `data.pages.flatMap(p => p.rows)` → `<DataTable columns={leaderboardColumns} data={flattened} hasPagination={false} />`.
- Wrap the DataTable in `<InfiniteScroll next={async (onComplete) => { if (hasNextPage && !isFetching) await fetchNextPage(); onComplete(); }} loader={<Skeleton/>}>`.
- `leaderboardColumns`: rank (`#` from `row.index+1`), customer (name primary + phone muted secondary), branch (if not branch-filtered; hide when a specific branch is selected), purchases (GH₵), credits issued (GH₵), credits redeemed (GH₵). Use `Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" })`.
- Date-filter state: "This year" default → `start = Math.floor(new Date(new Date().getFullYear(), 0, 1).getTime()/1000)`, `end = now`. "All" → both null. "Custom" → two dates → epoch seconds.
- Sort/branch/date changes → `queryKey` changes → `useInfiniteQuery` refetches from offset 0.

**`pages/Customers/CustomersTransactions.tsx`** — renders:
- Filter bar: branch `Select` + date filter (same three-way component, default This year). Reuse the same filter component as the leaderboard (extract a `CustomersFilters` shared component to avoid duplication).
- `useInfiniteQuery({ queryKey: ["customers","transactions", { branchId, start, end }], queryFn: ({ pageParam = 0 }) => customerService.getTransactions({ branchId, start, end, offset: pageParam, limit: 20 }), getNextPageParam, initialPageParam: 0 })`.
- Flatten → `<DataTable columns={transactionColumns} data={flattened} hasPagination={false} onRowClick={(row) => setDetailRow(row.original)} />` wrapped in `<InfiniteScroll>` (same pattern).
- `transactionColumns`: Date (formatted from `transaction_date`), Customer (name + phone), Branch (name), Type (badge — `purchase`=blue, `credit_issue`=green, `credit_redeem`=amber), Amount (currency, colored), Recorded by (surname).
- "Add a purchase" `<Button>` (top-right of the filter bar) opens `<AddPurchaseDialog>`.
- `<TransactionDetailDialog row={detailRow} />` on row click — read-only detail view mirroring `BranchDetailDialog.tsx`.

**`pages/Customers/components/AddPurchaseDialog.tsx`** — mirror `BranchEditDialog.tsx`:
- `react-hook-form` + `zod` (`@hookform/resolvers/zod`), fields: `phone` (required, E.164 validation), `amount` (required, positive number).
- Controlled `open`/`onOpenChange`, `useEffect` reset on open, `sonner` toast on success/error.
- Submit → `customerService.createPurchase({ phone, amount })` (via a `useMutation`), on success: `toast.success`, close dialog, and `queryClient.invalidateQueries({ queryKey: ["customers"] })` so both leaderboard and transactions refresh.

**`pages/Customers/components/CustomersFilters.tsx`** — shared filter bar (sort only used by leaderboard; branch + date used by both). Three-way date segmented control + custom date popover + branch select. Accepts current values + `onChange`.

**`pages/Customers/components/TransactionDetailDialog.tsx`** — read-only dialog mirroring `BranchDetailDialog.tsx`.

**`libs/api-services/src/services/customerService.ts`** — factory `createCustomerService()` returning typed methods calling `apiRequest<T>`:
- `getLeaderboard({ sort, branchId, start, end, offset, limit })` → `GET /customers/leaderboard?...`.
- `getLeaderboardStats({ branchId, start, end })` → `GET /customers/leaderboard-stats?...`.
- `getTransactions({ branchId, start, end, offset, limit })` → `GET /customers/transactions?...`.
- `createPurchase({ phone, amount })` → `POST /customers/transactions/purchase`.
- Export a singleton instance (mirror `storeService.ts`).
- Types: import `Static<>` types from a shared types file or define matching interfaces in `libs/api-services/src/types/`.

### Existing components to reuse (do NOT recreate)
- `apps/main-webapp/src/app/components/DataTable/DataTable.tsx` — pass `hasPagination={false}`, `columns`, `data`, optional `onRowClick`, `emptyStateComponent`.
- `apps/main-webapp/src/app/components/InfiniteScroll/InfiniteScroll.tsx` — `next` callback + `loader` prop; guard with `hasNextPage && !isFetching`.
- `libs/web-components/src/ui/*` — dialog, button, input, select, badge, card, skeleton, table primitives.
- `libs/web-components` `animated-tabs.tsx` for the top tabs.
- `pages/MyStore/components/BranchEditDialog.tsx` — form-in-dialog pattern.
- `pages/MyStore/components/BranchDetailDialog.tsx` — read-only detail pattern.
- `apps/main-webapp/src/app/shared/stores/authStore.ts` — for caller's merchant_id / branch_id context if needed client-side (not required; backend resolves from JWT).
- Existing branch service/store — for populating the branch dropdown options.

---

## Verification

1. **Backend unit/manual:**
   - `pnpm --filter main-backend dev` (or the repo's dev script). With a seeded merchant + branches + a few customers with mixed `purchase`/`credit_issue`/`credit_redeem` transactions:
     - `GET /customers/leaderboard?sort=purchases` returns customers sorted by total purchase `amount` desc; default (no sort) = purchases; `?sort=credits_issued` and `?sort=credits_redeemed` reorder correctly.
     - `?branch_id=<id>` restricts to that branch; `?start=<epoch>&end=<epoch>` filters by `transaction_date`.
     - `?limit=20&offset=0` returns first 20; `offset=20` returns next 20; `total` is the distinct customer count.
     - `GET /customers/transactions` returns rows with joined `customer_name`, `branch_name`, `recorded_by_name`; ordered by `transaction_date` desc; paginated.
     - `POST /customers/transactions/purchase { phone: "+233...", amount: 50 }` with a brand-new phone → creates `customers` row, `branch_customer` row, and a `purchase` `customer_transactions` row tied to the caller's branch; returns the row. Repeat with same phone → no duplicate customer.
   - Verify unknown phone → auto-created customer appears on the leaderboard after a refetch.

2. **Frontend manual (run the webapp, `pnpm --filter main-webapp dev`):**
   - Navigate to `/customers` → redirects to `/customers/leaderboard`. Top tabs switch between Leaderboard and Transactions; URL updates.
   - Leaderboard: sort dropdown changes ordering; branch dropdown filters; date filter This year/Custom/All changes the rows; scrolling loads more pages (InfiniteScroll triggers `fetchNextPage`); rank column increments; customer name shows for linked users, "Unnamed customer" otherwise with phone muted.
   - Transactions: filter bar works; "Add a purchase" opens the modal; submitting with a new phone creates the customer + transaction and the list refreshes (invalidate); row click opens the detail dialog.
   - Verify no regressions on MyStore, Credits, Profile pages.

3. **Type safety:** `pnpm -w typecheck` (or the repo's typecheck script) passes after regenerating `database.types.ts`.

4. **Edge cases to spot-check:**
   - Empty leaderboard (merchant with no transactions in window) → DataTable renders `emptyStateComponent`.
   - "All data" date filter (start/end null) → no date predicate in RPC.
   - Custom date range where end < start → frontend should disable submit or swap; backend should tolerate (returns empty).

---

## Out of scope (explicitly deferred)
- Credit issuance on purchase (pool limit, 24h pending maturation, SMS) — separate future feature.
- Customer detail page (`/customers/:id`) with per-branch credit balances — future.
- Dropping `credit_generated` / `credit_redeemed` columns — deferred; just ignored for now.
- Editing/deleting transactions — not in this feature.
- CSV export of leaderboard/transactions — future.