# Plan: "My Store" Page (full-stack, v1)

## Context

We are building the first real page of the Store Credit Platform web app: **My Store**. It replaces the throwaway Dashboard and becomes the post-login landing page at `/`. The page shows the authenticated user's merchant (shop) details and lists its branches, with role-adaptive content: managers see the full merchant + all branches + edit/add actions; cashiers see a filtered view limited to their assigned branch with all write actions hidden.

The backend currently exposes **only auth endpoints** — there are no merchant/branch/staff routes, services, or schemas. The DB tables (`merchants`, `branches`, `staff`, `branch_credit_config`, `customer_transactions`, `branch_customer`) already exist per `apps/main-backend/src/app/types/database.types.ts`. The JWT today carries `sub`, `phone`, `roles` — **no `merchant_id`/`branch_id`** — so we must enrich the token at login to resolve "my merchant" cheaply.

This is the foundational page that everything else (POS, customers, analytics) hangs off, so getting the data layer and role-adaptive patterns right here pays forward.

Source-of-truth doc: `docs/plans/Initial_plan_v1.md`.

## Decisions (locked)

1. **Full-stack scope** — backend endpoints + frontend page in one feature.
2. **Role-adaptive single page** — managers: full view; cashiers: filtered to their branch, pool hidden, no edit/add.
3. **MVP sections:** (1) store hero header, (2) quick-stats row [# branches, # staff, # customers, lifetime credit issued], (3) credit pool status card (progress bar, >90% warning), (4) branches list as responsive card grid. Deferred: staff overview, store settings summary, mini analytics, recent activity feed.
4. **Branch card fields:** name, city, address, phone, country flag, status badge, staff count, customer count, credit issued this month, last activity date, avatar/icon.
5. **Actions v1:** add branch (dialog), edit branch (dialog), edit merchant profile (dialog), view-branch (detail dialog). Deferred: toggle active, branch detail route, add staff.
6. **API shape (hybrid):** `GET /api/merchants/me` → merchant + stats + pool; `GET /api/merchants/me/branches` → branches with per-branch aggregates; `POST /api/branches`; `PATCH /api/branches/:id`; `PATCH /api/merchants/me`.
7. **JWT enrichment:** add `merchant_id` + primary `branch_id` to the access token at login (`verifyOtp`) and to `AuthUser`/`getCurrentUser`.
8. **Routing:** "My Store" at `/` replaces Dashboard; delete `pages/Dashboard/`; move logout into the profile/user area.
9. **Layout:** card-grid dashboard — full-width hero, 4-up stats row, 2/3 branches + 1/3 pool. Linear/Vercel style; `bg-card`, `rounded-2xl`, subtle borders.
10. **Motion L2:** shimmer skeletons, staggered fade-in-up (CSS keyframes, `prefers-reduced-motion` guard), hover lift, optimistic UI on branch mutations with rollback. No new deps.
11. **No-merchant state:** plain "We couldn't find your store. Contact your admin to be assigned." No CTA.
12. **Forms:** branch = name(req 2-80), phone(E.164), address, city(req 1-60), country(default GH). merchant = name(req), phone(req E.164), country(req), slug(optional, auto from name, unique). No `is_active` toggle. TypeBox validation.
13. **Tests:** backend only — service unit tests (mocked Supabase) + route integration tests with mocked auth. UI verified manually by running the app.

## Data shapes

### `MerchantWithStats` (response of `GET /api/merchants/me`)
```
{
  id, name, phone, country_code, slug, is_active, created_at,
  branch_count: number,
  staff_count: number,
  customer_count: number,           // unique customers across merchant
  lifetime_credit_issued: number,   // sum(credit_generated) across merchant's transactions
  credit_pool_used: number | null,
  credit_pool_limit: number | null
}
```

### `BranchWithAggregates` (item in `GET /api/merchants/me/branches` response)
```
{
  id, merchant_id, name, phone, address, city, country_code, created_at, is_active,
  staff_count: number,
  customer_count: number,
  credit_issued_this_month: number,
  last_activity_date: string | null
}
```

### `CreateBranchRequest` / `UpdateBranchRequest`
```
{ name: string (2-80), phone?: string (E.164), address?: string, city: string (1-60), country_code: string (default GH) }
```

### `UpdateMerchantRequest`
```
{ name?: string, phone?: string (E.164), country_code?: string, slug?: string }
```

## Implementation plan

### Step 1 — Backend: JWT enrichment

- `apps/main-backend/src/app/services/auth.service.ts` — in `verifyOtp`, after user lookup, query `staff` → `branches` to resolve `merchant_id` and primary `branch_id`; pass into `TokenService.signAccessToken`. In `getCurrentUser`, return `merchant_id`/`branch_id` on `AuthUser`.
- `apps/main-backend/src/app/services/token.service.ts` — extend `signAccessToken(userId, phone, roles, merchantId?, branchId?)` to include `merchant_id`/`branch_id`; extend `verifyAccessToken`/`AccessTokenPayload`.
- `apps/main-backend/src/app/schemas/auth.schema.ts` — add `merchant_id`, `branch_id` (both `number | null`) to `AccessTokenPayload` and `AuthUser`.
- `apps/main-backend/src/app/constants/queryFragments.ts` — add `STAFF_MERCHANT_LOOKUP` fragment (staff join branches join merchants, filtered by `user_id`, `deleted_at is null`).

If a user has no staff row, `merchant_id`/`branch_id` are `null` — the frontend shows the no-merchant state.

### Step 2 — Backend: schemas (TypeBox)

New file `apps/main-backend/src/app/schemas/merchant.schema.ts` defining all shapes above plus response unions (`MerchantMeApiResponse`, `BranchListApiResponse`, `BranchMutationApiResponse`, `MerchantMutationApiResponse`). Reuse `Type` from `@sinclair/typebox` and the registered `TypeBoxTypeProvider`.

### Step 3 — Backend: services

New files in `apps/main-backend/src/app/services/`:
- `merchant.service.ts` — `getMyMerchant(userId)` (resolve via staff→branches→merchants; return null if none), `getMyMerchantWithStats(merchantId)` (merchant row + 4 stats + pool via the service-role Supabase client), `updateMyMerchant(merchantId, payload)`.
- `branch.service.ts` — `listBranchesForMerchant(merchantId)` with per-branch aggregates (staff count via `staff`; customer count via `branch_customer`; credit issued this month via `customer_transactions` sum `credit_generated` where `branch_id` and current month; last activity via `max(transaction_date)`), `createBranch(merchantId, payload)`, `updateBranch(branchId, merchantId, payload)` (verify branch belongs to merchant).

Use the service-role Supabase client from `apps/main-backend/src/app/utils/supabase.client.ts`. Enforce resource-level ownership: every branch read/write verifies `branches.merchant_id = request.user.merchant_id`.

### Step 4 — Backend: routes

New files in `apps/main-backend/src/app/routes/` (auto-loaded by `@fastify/autoload`):
- `merchants/index.ts` — `GET /api/merchants/me` (`requireAuth`), `PATCH /api/merchants/me` (`requireAuth` + `requireRoles("manager")`).
- `branches/index.ts` — `GET /api/branches` (list for current merchant, `requireAuth`), `POST /api/branches` (`requireRoles("manager")`), `PATCH /api/branches/:id` (`requireRoles("manager")`).

Wire schemas as response schemas via the TypeBox provider.

### Step 5 — Type generation

Run the project's type-gen (`yarn generate:types`) so the new `Merchant*`/`Branch*` types flow into `libs/api-services/src/types/api.types.ts` and `apps/main-webapp/src/app/shared/types/api.types.ts`. If the generator is manual, add the types by hand in both spots.

### Step 6 — Frontend: API service

New file `libs/api-services/src/services/storeService.ts` — `createStoreService()` factory (mirrors `createAuthService`) returning: `getMyStore()` → GET `/merchants/me`, `getMyBranches()` → GET `/branches`, `createBranch(payload)`, `updateBranch(id, payload)`, `updateMyMerchant(payload)`. All via `apiRequest` (authed). Re-export from `libs/api-services/src/index.ts`.

### Step 7 — Frontend: store (Zustand)

New file `apps/main-webapp/src/app/shared/stores/storeStore.ts`:
- State: `merchant: MerchantWithStats | null`, `branches: BranchWithAggregates[]`, `loading: boolean`, `error: string | null`.
- Actions: `fetchStore()` (parallel `getMyStore` + `getMyBranches` via `Promise.all`), `refreshBranches()` (only `getMyBranches`, used after add/edit), `createBranch`/`updateBranch`/`updateMerchant` (optimistic: update local state immediately, rollback on error, refetch on success).
- Follow the `authStore` pattern (no persist — fetched data).

### Step 8 — Frontend: page + components

New files under `apps/main-webapp/src/app/pages/MyStore/`:
- `MyStore.tsx` — page container. On mount, `useStoreStore.fetchStore()`. Renders skeleton while loading, error card with retry on error, no-merchant message if `merchant == null`. Otherwise renders `<StoreHero/>`, `<StoreStatsRow/>`, `<div grid 2/3 + 1/3>` with `<BranchesList/>` and `<PoolStatusCard/>`. Role-adaptive: read `useAuthStore.user.roles` to hide pool, edit buttons, and filter branches to the user's `branch_id` for cashiers.
- `components/StoreHero.tsx` — merchant name, avatar (initials in a rounded tile), country flag (from `shared/utils/countries.ts`), active badge, "since {year}" from `created_at`. "Edit profile" button (manager only) opens `<MerchantEditDialog/>`.
- `components/StoreStatsRow.tsx` — 4 stat cards (branches, staff, customers, lifetime credit issued). shadcn `Card` + lucide icons. Staggered fade-in-up via CSS `animation-delay`.
- `components/PoolStatusCard.tsx` — progress bar (`credit_pool_used / credit_pool_limit`), numeric label, warning (amber) >90%, danger (red) >100%. Hidden for cashiers.
- `components/BranchesList.tsx` — responsive card grid (1/2/3 cols). Header with "Add branch" button (manager only). Each card renders `<BranchCard/>`. Empty state: "No branches yet. Add your first branch." (manager) / "No branch assigned." (cashier).
- `components/BranchCard.tsx` — avatar/icon, name, city+address, phone, status badge, staff count, customer count, credit issued this month (currency-formatted), last activity date (relative). Hover lift. Click opens `<BranchDetailDialog/>`. "Edit" menu item (manager) opens `<BranchEditDialog/>`.
- `components/BranchDetailDialog.tsx` — read-only detail of a branch (all fields + aggregates).
- `components/BranchEditDialog.tsx` — react-hook-form + Zod form: name, phone (reuse `PhoneInput`), address, city, country (reuse `Combobox` from `countries.ts`). Used for both add and edit (prefilled). Submit calls `createBranch`/`updateBranch`; optimistic + sonner toast.
- `components/MerchantEditDialog.tsx` — form: name, phone, country, slug (optional, auto-suggest from name). Submit calls `updateMerchant`.

Add CSS keyframe `fade-in-up` to `apps/main-webapp/tailwind.config.js` (alongside existing `fade-left`); guard all entrance animations with `motion-reduce:animate-none`.

### Step 9 — Frontend: routing & nav

- `apps/main-webapp/src/app/app.tsx` — change the protected `index` route from `<Dashboard/>` to `<MyStore/>` (path `/`). Remove the `NavigateToDashboard` redirect; `/` renders `<MyStore/>`. Delete the `/dashboard` route (or redirect to `/`).
- `apps/main-webapp/src/app/pages/MainLayout/MainLayout.tsx` — update `navItems`: replace "Dashboard" with "My Store" (`/`, icon `Store` from lucide). Remove dead "Users"/"Settings" entries. Ensure the floating nav highlights `/` correctly.
- Delete `apps/main-webapp/src/app/pages/Dashboard/`.
- Move the Logout button out of the old Dashboard into `pages/Profile/Profile.tsx` (or a new user menu in MainLayout).

### Step 10 — Backend tests

- `apps/main-backend/src/app/services/merchant.service.spec.ts` — mocked Supabase; test `getMyMerchant` (with and without staff row), `getMyMerchantWithStats` (aggregate correctness), `updateMyMerchant` (payload + ownership).
- `apps/main-backend/src/app/services/branch.service.spec.ts` — test `listBranchesForMerchant` aggregate query shape, `createBranch`, `updateBranch` (ownership rejection when branch belongs to another merchant).
- `apps/main-backend/src/app/routes/merchants.spec.ts` + `branches.spec.ts` — route integration with mocked auth + mocked services; assert 200/401/403 for manager vs cashier vs unauthenticated.

Mock the Supabase client at the module boundary (`utils/supabase.client.ts` is the seam).

## Critical files

**Backend (modify):**
- `apps/main-backend/src/app/services/auth.service.ts`
- `apps/main-backend/src/app/services/token.service.ts`
- `apps/main-backend/src/app/schemas/auth.schema.ts`
- `apps/main-backend/src/app/constants/queryFragments.ts`

**Backend (new):**
- `apps/main-backend/src/app/schemas/merchant.schema.ts`
- `apps/main-backend/src/app/services/merchant.service.ts`
- `apps/main-backend/src/app/services/branch.service.ts`
- `apps/main-backend/src/app/routes/merchants/index.ts`
- `apps/main-backend/src/app/routes/branches/index.ts`
- `*.spec.ts` test files above

**Frontend (modify):**
- `apps/main-webapp/src/app/app.tsx`
- `apps/main-webapp/src/app/pages/MainLayout/MainLayout.tsx`
- `apps/main-webapp/tailwind.config.js`
- `apps/main-webapp/src/app/pages/Profile/Profile.tsx`

**Frontend (new):**
- `libs/api-services/src/services/storeService.ts`
- `apps/main-webapp/src/app/shared/stores/storeStore.ts`
- `apps/main-webapp/src/app/pages/MyStore/MyStore.tsx` + `components/*` (8 components)

**Delete:**
- `apps/main-webapp/src/app/pages/Dashboard/`

**Reuse (do not duplicate):**
- `apps/main-webapp/src/app/components/PhoneInput/PhoneInput.tsx` — branch/merchant phone field.
- `apps/main-webapp/src/app/shared/utils/countries.ts` — country picker + flag.
- `libs/web-components/src/ui/*` — Card, Button, Input, Badge, Dialog, Combobox, Skeleton, Sonner, DropdownMenu (no new shadcn components needed).
- `libs/api-services/src/services/apiService.ts` `apiRequest` — authed fetch + 401 retry.
- `apps/main-webapp/src/app/shared/stores/authStore.ts` — roles + user id for role-adaptive gating.

## Verification

1. **Backend unit tests:** `yarn test main-backend` — all new service + route specs pass.
2. **Backend manual smoke:** start `main-backend`, log in via `/auth/otp/verify` (DEV bypass `0549270550`/`123456`), call `GET /api/merchants/me` and `GET /api/branches` with the bearer token; confirm JSON shape and that a user with no staff row returns a merchant-me response indicating no merchant.
3. **Frontend dev run:** `yarn start main-webapp`, log in, confirm `/` renders the My Store page: hero, stats, pool card (manager), branches list. Verify:
   - Manager: add branch → dialog submits → card appears (optimistic) → refetch reconciles. Edit branch → changes persist. Edit merchant → hero updates.
   - Cashier (mock a cashier user): pool card hidden, only their branch shown, no add/edit buttons.
   - No-merchant user (mock): "contact your admin" message renders.
   - Loading: shimmer skeletons. Error: kill backend → error card with retry appears.
   - Motion: cards stagger in on first render; `prefers-reduced-motion` disables it.
   - Mobile: floating bottom nav shows "My Store"; layout collapses to 1 column.
4. **Type safety:** `yarn tsc` across affected packages — no new type errors.
5. **Logout:** confirm logout still works from its new home.