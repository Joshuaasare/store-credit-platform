# Merchant Credit Config Feature — Handoff Document

## Context

The Store Credit Platform needs a "merchant credit config" feature — the core of the product. A merchant can create unlimited credit configurations of two types:

1. **Running credit configs** — automatic cashback issued whenever a customer's cumulative spend crosses a threshold. E.g., "5% cashback as credit whenever a customer's cumulative purchases in the last 30 days exceed 400 GHS". Applied to multiple branches via multi-select. Issues rows into `customer_credit` automatically at purchase time.
2. **Fixed credit configs** — time-bound promotions with start/end dates. Passive informational registry only — the system answers "is this promo active right now?" based on dates and branch. No automatic credit issuance, no `customer_credit` rows. The credit_type/values are descriptive metadata for an out-of-band workflow.

### Why this is being built

- The existing `/credits` page (`apps/main-webapp/src/app/pages/Credits/Credits.tsx`) is a placeholder.
- The `running_credit_config` and `fixed_credit_config` tables already exist in the DB but have no backend service, routes, or UI.
- `createPurchase` in `customers.service.ts` has a comment "No credit-issuance logic — that is a separate future feature." This feature is that logic.

### Key schema facts (from `apps/main-backend/src/app/types/database.types.ts`)

- **`running_credit_config`** (single-branch-per-row): `id`, `branch_id` (FK → branches), `credit_type` (`"fixed" | "percentage"`), `credit_validity` (days, null = lifetime), `eligible_window` (days — lookback), `fixed_credit_value`, `percentage_credit_value`, `maximum_allowed_credit`, `threshold_amount`, `terms`, `is_active`, soft-delete + timestamps.
- **`fixed_credit_config`** (single-branch-per-row): same minus threshold/window/validity/scope, plus `start_date` / `end_date` (epoch seconds, nullable).
- **`customer_credit`** (SINGULAR — note the typo column `credit_precentage` we will NOT fix): `id`, `customer_id`, `branch_id`, `credit_type`, `credit_precentage`, `max_credit_amount`, `expires_at` (epoch seconds, null = lifetime), soft-delete + timestamps.
- **`customer_transactions`**: `transaction_type` enum `"purchase" | "credit_issue" | "credit_redeem"`, `amount`, `transaction_date` (epoch seconds), `branch_id`, `customer_id`. (`credit_generated`/`credit_redeemed` columns are deprecated — ignored.)
- **`merchants`**: `credit_pool_limit`, `credit_pool_used` (default 0). **We will NOT touch `credit_pool_used` in this feature — pool interaction is deferred.**
- **`branches`**: `merchant_id` (FK → merchants), `is_active`, `deleted_at`.

### Decisions confirmed via grilling

1. **Threshold logic** (cumulative, not per-purchase): reward issues when `prior_cumulative + current_purchase > threshold_amount`. The reward applies to the portion of the current purchase that pushed (or kept) them over:
   - If `prior_cumulative >= threshold`: `rewardable = current_purchase` (the whole purchase earns)
   - Else: `rewardable = min(current_purchase, max(0, prior_cumulative + current_purchase - threshold))`
   - Then: `credit = rewardable * percentage_credit_value / 100` (capped at `maximum_allowed_credit`) OR `credit = fixed_credit_value` (for fixed type, `maximum_allowed_credit` equals `fixed_credit_value`).
2. **Cumulative scope**: configurable per-config via new column `cumulative_scope: "per_branch" | "merchant_wide"`, default `'per_branch'`. `per_branch` = sum of purchases at the branch where the new purchase happened. `merchant_wide` = sum of purchases at any branch of the merchant. The config still must APPLY to the purchase's branch (filter `branch_id = branchId`); only the lookback scope changes.
3. **Multi-branch storage**: denormalized — one row per branch in `running_credit_config` / `fixed_credit_config`. A logical config across N branches = N rows with identical config values, different `branch_id`, sharing a new `config_group_id` UUID column (added in migration). Editing the config = update all rows in the group in one call. Removing a branch = hard-delete that one row. Deleting the whole config = hard-delete all rows in the group.
4. **Fixed credit mechanic**: passive informational. The system exposes "is this promo active right now?" (`start_date ≤ now ≤ end_date` AND branch matches AND `is_active = true`). No auto-issuance, no `customer_credit` rows. The credit_type/values are descriptive metadata shown in the promo listing.
5. **Credit pool interaction**: DEFERRED. `merchants.credit_pool_used` is NOT incremented in this feature. Pool integration is a separate future feature.
6. **Multiple matching running configs**: configurable via new `merchants.credit_stacking_policy: "stack" | "best_only"`, default `'stack'`. `stack` = each qualifying config issues its own `customer_credit` row. `best_only` = only the config with the highest absolute credit value (in GHS) issues; others are suppressed.
7. **Delete + active semantics**: hard-delete for single-branch removal AND whole-config delete. `is_active` is a separate pause toggle — toggling inactive = `update is_active = false`, no row deletion.
8. **List shape**: UI groups rows by `config_group_id` into one "config card" per logical config, displaying branch chips inside. Edit/delete act on the whole group. Add a new config = insert N rows (one per selected branch) with identical values and the same `config_group_id`.
9. **Permissions**: manager-only writes (create/edit/delete/toggle). Cashiers read-only. Backend: `preHandler: [requireAuth, requireRoles("manager")]` on writes; `[requireAuth]` on reads. Frontend: gate edit buttons inline with `isManager` (matches `MyStore.tsx` pattern).
10. **Retroactivity**: the cumulative-spend lookback includes purchases made BEFORE the config's `created_at` as long as they fall within `eligible_window` days from now. `created_at` only matters for "is this config active" — not for purchase eligibility.
11. **UI placement**: replace the placeholder `/credits` page. Route already exists in `app.tsx`; only the page content changes.

---

## A. Backend

### A.1 Migrations

One new file: `supabase/migrations/20260720000000_credit_config_augmentations.sql`.

Idempotent, follows the `do $$ ... end$$` enum pattern from `20260713000000_my_store_augmentations.sql`.

1. **Enum types**
   - `create type public.cumulative_scope_type as enum ('per_branch', 'merchant_wide');`
   - `create type public.credit_stacking_policy_type as enum ('stack', 'best_only');`
2. **`running_credit_config` augmentations**
   - `alter table public.running_credit_config add column if not exists config_group_id uuid not null default gen_random_uuid();`
   - `alter table public.running_credit_config add column if not exists cumulative_scope public.cumulative_scope_type not null default 'per_branch';`
   - `create index if not exists idx_running_credit_config_branch on public.running_credit_config (branch_id) where deleted_at is null;`
   - `create index if not exists idx_running_credit_config_group on public.running_credit_config (config_group_id) where deleted_at is null;`
3. **`fixed_credit_config` augmentations**
   - `alter table public.fixed_credit_config add column if not exists config_group_id uuid not null default gen_random_uuid();`
   - `create index if not exists idx_fixed_credit_config_branch on public.fixed_credit_config (branch_id) where deleted_at is null;`
   - `create index if not exists idx_fixed_credit_config_group on public.fixed_credit_config (config_group_id) where deleted_at is null;`
4. **`merchants` augmentation**
   - `alter table public.merchants add column if not exists credit_stacking_policy public.credit_stacking_policy_type not null default 'stack';`
5. **`customer_transactions` performance index** (hot path for cumulative-spend lookback)
   - `create index if not exists idx_customer_transactions_cumulative on public.customer_transactions (branch_id, transaction_date, transaction_type) where deleted_at is null;`

The `gen_random_uuid()` default handles new inserts; existing rows automatically got distinct UUIDs at ADD COLUMN time. No backfill needed.

### A.2 TypeBox schemas

**New file** `apps/main-backend/src/app/schemas/creditConfig.schema.ts`. Mirror the style of `merchant.schema.ts` / `customers.schema.ts` — top-of-file `import { Type, Static } from '@sinclair/typebox'`, reuse `BaseBranch`, `ApiErrorResponse` from `./main.schema`.

Key shapes:

```ts
export const CreditTypeValues = Type.Union([Type.Literal("fixed"), Type.Literal("percentage")]);
export const CumulativeScopeValues = Type.Union([Type.Literal("per_branch"), Type.Literal("merchant_wide")]);

// Grouped response shape (one logical config across N branches)
export const RunningCreditConfigGroup = Type.Object({
  config_group_id: Type.String(),
  branches: Type.Array(BaseBranch),
  credit_type: Type.Union([CreditTypeValues, Type.Null()]),
  credit_validity: Type.Union([Type.Number(), Type.Null()]),
  eligible_window: Type.Union([Type.Number(), Type.Null()]),
  fixed_credit_value: Type.Union([Type.Number(), Type.Null()]),
  percentage_credit_value: Type.Union([Type.Number(), Type.Null()]),
  maximum_allowed_credit: Type.Union([Type.Number(), Type.Null()]),
  threshold_amount: Type.Union([Type.Number(), Type.Null()]),
  terms: Type.Union([Type.String(), Type.Null()]),
  cumulative_scope: CumulativeScopeValues,
  is_active: Type.Boolean(),
  created_at: Type.String(),
  updated_at: Type.Union([Type.String(), Type.Null()]),
});

// Create/update payload — branch_ids drives row count
export const CreateRunningCreditConfigRequest = Type.Object({
  branch_ids: Type.Array(Type.Number(), { minItems: 1 }),
  credit_type: Type.Union([CreditTypeValues, Type.Null()]),
  credit_validity: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  eligible_window: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  fixed_credit_value: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  percentage_credit_value: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  maximum_allowed_credit: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  threshold_amount: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  terms: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  cumulative_scope: CumulativeScopeValues,
});

export const UpdateRunningCreditConfigRequest = CreateRunningCreditConfigRequest; // full-replace

export const ToggleActiveRequest = Type.Object({ is_active: Type.Boolean() });

// Response envelopes (match the existing success/error union pattern)
export const RunningCreditConfigListResponse = Type.Object({ success: Type.Literal(true), data: Type.Array(RunningCreditConfigGroup) });
export const RunningCreditConfigMutationResponse = Type.Object({ success: Type.Literal(true), data: RunningCreditConfigGroup });
export const RunningCreditConfigListApiResponse = Type.Union([RunningCreditConfigListResponse, ApiErrorResponse]);
export const RunningCreditConfigMutationApiResponse = Type.Union([RunningCreditConfigMutationResponse, ApiErrorResponse]);

// Same set for fixed: BaseFixedCreditConfigRow, FixedCreditConfigGroup, CreateFixedCreditConfigRequest,
// UpdateFixedCreditConfigRequest, ToggleActiveRequest (shared), *Response, *ApiResponse.
```

Validation rules enforced in the **service layer** (not in schema — schema is structural only, matching existing files): if `credit_type === "percentage"` then `percentage_credit_value` must be set and `>= 0`; if `credit_type === "fixed"` then `fixed_credit_value` must be set and `>= 0`, and the service sets `maximum_allowed_credit = fixed_credit_value` if not supplied (decision 1 — "If its not a percent the amount is the same as the maximum amount").

### A.3 Services

**New file** `apps/main-backend/src/app/services/creditConfig.service.ts`:

```ts
import { supabaseAdmin } from "../utils/supabase.client";
import { randomUUID } from "crypto";

export class CreditConfigService {
  // ── Running ────────────────────────────────────────────
  async listRunningConfigs(merchantId: number): Promise<RunningCreditConfigGroup[]>;
  async createRunningConfig(merchantId: number, payload: CreateRunningCreditConfigRequest): Promise<RunningCreditConfigGroup>;
  async updateRunningConfig(merchantId: number, groupId: string, payload: UpdateRunningCreditConfigRequest): Promise<RunningCreditConfigGroup>;
  async deleteRunningConfig(merchantId: number, groupId: string): Promise<void>;
  async toggleRunningConfigActive(merchantId: number, groupId: string, isActive: boolean): Promise<void>;
  // ── Fixed (same five methods) ──────────────────────────
  async listFixedConfigs(merchantId: number): Promise<FixedCreditConfigGroup[]>;
  async createFixedConfig(merchantId: number, payload: CreateFixedCreditConfigRequest): Promise<FixedCreditConfigGroup>;
  async updateFixedConfig(merchantId: number, groupId: string, payload: UpdateFixedCreditConfigRequest): Promise<FixedCreditConfigGroup>;
  async deleteFixedConfig(merchantId: number, groupId: string): Promise<void>;
  async toggleFixedConfigActive(merchantId: number, groupId: string, isActive: boolean): Promise<void>;
}
export const creditConfigService = new CreditConfigService();
```

**Grouping on read** (`listRunningConfigs`):
1. `select` from `running_credit_config` joined to `branches` (`branch:branches(*)`), filter `branch.merchant_id = merchantId`, `running_credit_config.deleted_at is null`, `branches.deleted_at is null`.
2. Group rows in JS by `config_group_id`. Within a group, all columns except `id`/`branch_id`/`created_at`/`updated_at` are identical (enforced on write), so pick the first row's values and collect all `branch` objects into `branches: BaseBranch[]`.
3. Return groups ordered by `created_at desc`.

**Create** (`createRunningConfig`):
1. Validate all `payload.branch_ids` belong to `merchantId` — single `select id from branches where id in (...) and merchant_id = ? and deleted_at is null`; if returned count ≠ payload count, throw `403 "Some branches do not belong to your merchant"`.
2. If `credit_type === "fixed"` and `maximum_allowed_credit` not supplied, set `maximum_allowed_credit = fixed_credit_value` (decision 1).
3. `const groupId = randomUUID();`
4. Build N insert rows with identical config values + same `config_group_id = groupId`; each row's `branch_id` is one of `payload.branch_ids`.
5. `supabaseAdmin.from("running_credit_config").insert(rows)` — single insert. Then `select` back the group by `config_group_id = groupId` and return the grouped shape.

**Update** (`updateRunningConfig`):
1. Verify the group belongs to merchant (`select config_group_id from running_credit_config where config_group_id = ? and branch_id in (select id from branches where merchant_id = ?) limit 1`).
2. Diff: existing branch_ids in the group vs `payload.branch_ids`.
3. Three sequential Supabase calls (Supabase JS has no transaction primitive — see atomicity note below):
   - `.in("branch_id", removedBranchIds).eq("config_group_id", groupId).delete()` (hard-delete — decision 7)
   - `.in("branch_id", keptBranchIds).eq("config_group_id", groupId).update({ ...newConfigValues })`
   - `.insert(addedRows)` for the added set, each with `config_group_id = groupId`
4. Re-fetch the group and return it.

**Atomicity note**: Supabase JS does not support multi-statement transactions without an RPC. If atomicity is required, ship a thin Postgres RPC `merge_running_config_group(p_merchant_id, p_group_id uuid, p_branch_ids int[], p_values jsonb)` in the migration that does the diff inside a `BEGIN … COMMIT` block, and call it via `supabaseAdmin.rpc(...)`. For v1, the three-call approach with idempotent operations is acceptable (delete is a no-op if rows already gone; update is a no-op if no rows match; insert with `onConflict("config_group_id,branch_id")` makes partial retries safe). Recommend the three-call approach for v1 to avoid an extra RPC; revisit if partial-failure bugs appear.

**Delete** (`deleteRunningConfig`): verify ownership, then `.eq("config_group_id", groupId).in("branch_id", merchantBranchIds).delete()` (hard-delete). The merchant-ownership filter on the delete query itself is the security boundary.

**Toggle active**: `.eq("config_group_id", groupId).in("branch_id", merchantBranchIds).update({ is_active: isActive })`.

Fixed configs follow the same pattern with `start_date`/`end_date` and no `threshold_amount`/`eligible_window`/`credit_validity`/`cumulative_scope`.

### A.4 Auto-issuance: `issueRunningCreditsForPurchase`

**New exported function** in `apps/main-backend/src/app/services/creditConfig.service.ts`:

```ts
export async function issueRunningCreditsForPurchase(
  supabase: SupabaseClient<Database>,
  merchantId: number,
  customerId: number,
  branchId: number,
  purchaseAmount: number,
  transactionDateEpoch: number,
): Promise<CustomerCreditRow[]> {
  if (!(purchaseAmount > 0)) return [];

  // 1. Merchant stacking policy
  const { data: merchant } = await supabase
    .from("merchants").select("credit_stacking_policy").eq("id", merchantId).maybeSingle();
  const policy: "stack" | "best_only" = merchant?.credit_stacking_policy ?? "stack";

  // 2. Active configs applying to this branch (config must APPLY to the purchase's branch)
  const { data: configs } = await supabase
    .from("running_credit_config")
    .select(`id, config_group_id, branch_id, credit_type, credit_validity, eligible_window,
             fixed_credit_value, percentage_credit_value, maximum_allowed_credit,
             threshold_amount, cumulative_scope,
             branch:branches(id, deleted_at)`)
    .eq("branch_id", branchId)
    .eq("is_active", true)
    .is("deleted_at", null);
  if (!configs || configs.length === 0) return [];

  // 3. Merchant branch IDs (for merchant_wide scope)
  const { data: merchantBranchRows } = await supabase
    .from("branches").select("id").eq("merchant_id", merchantId).is("deleted_at", null);
  const merchantBranchIds = (merchantBranchRows ?? []).map(b => b.id);

  // 4. For each config compute (config, credit_value)
  const plans: { config: any; creditValue: number }[] = [];
  for (const row of configs) {
    if (row.branch?.deleted_at) continue;

    const threshold = row.threshold_amount ?? 0;       // null ⇒ 0 (every purchase qualifies)
    const windowDays = row.eligible_window;             // null ⇒ no lookback (prior = 0)
    const maxCap     = row.maximum_allowed_credit;      // null ⇒ no cap

    // 4a. Prior cumulative spend (excluding current purchase, includes pre-config purchases — decision 10)
    let priorCumulative = 0;
    if (windowDays != null) {
      const lowerBound = transactionDateEpoch - (windowDays * 86400);
      let q = supabase
        .from("customer_transactions")
        .select("amount")
        .eq("customer_id", customerId)
        .eq("transaction_type", "purchase")
        .is("deleted_at", null)
        .lt("transaction_date", transactionDateEpoch)
        .gte("transaction_date", lowerBound);
      if (row.cumulative_scope === "per_branch") q = q.eq("branch_id", branchId);
      else q = q.in("branch_id", merchantBranchIds);
      const { data: txs } = await q;
      priorCumulative = (txs ?? []).reduce((s, t) => s + Number(t.amount), 0);
    }

    // 4b. Rewardable portion (decision 1)
    let rewardable: number;
    if (priorCumulative >= threshold) {
      rewardable = purchaseAmount;
    } else {
      const overshoot = priorCumulative + purchaseAmount - threshold;
      rewardable = Math.max(0, Math.min(purchaseAmount, overshoot));
    }
    if (!(rewardable > 0)) continue;

    // 4c. Credit value
    let creditValue: number;
    if (row.credit_type === "percentage") {
      const pct = row.percentage_credit_value ?? 0;
      creditValue = (rewardable * pct) / 100;
    } else {
      creditValue = row.fixed_credit_value ?? 0; // flat reward once threshold reached
    }
    if (maxCap != null && creditValue > maxCap) creditValue = maxCap;
    if (!(creditValue > 0)) continue;

    plans.push({ config: row, creditValue });
  }
  if (plans.length === 0) return [];

  // 5. Stacking policy (decision 6)
  let issued = plans;
  if (policy === "best_only") {
    issued = [plans.reduce((a, b) => (b.creditValue > a.creditValue ? b : a))];
  }

  // 6. Insert customer_credit rows (decision 4: NOT for fixed configs)
  const inserts = issued.map(({ config }) => ({
    customer_id: customerId,
    branch_id: branchId,
    credit_type: config.credit_type,
    credit_precentage: config.credit_type === "percentage" ? config.percentage_credit_value : null,
    max_credit_amount: config.maximum_allowed_credit,
    expires_at: config.credit_validity == null ? null : transactionDateEpoch + (config.credit_validity * 86400),
  }));
  const { data: inserted, error } = await supabase.from("customer_credit").insert(inserts).select("*");
  if (error) throw new Error(`credit insert failed: ${error.message}`);
  return inserted ?? [];
}
```

**Edge cases addressed**:
- `eligible_window = null` ⇒ no lookback; `prior_cumulative = 0`; threshold gate becomes "this purchase alone ≥ threshold".
- `threshold_amount = null` ⇒ threshold = 0; every purchase qualifies.
- `credit_validity = null` ⇒ `expires_at = null` (lifetime).
- `maximum_allowed_credit = null` (percentage) ⇒ no cap. For fixed type, service forces `maximum_allowed_credit = fixed_credit_value` on create.
- `is_active = false` ⇒ filtered out by the query.
- Soft-deleted branch ⇒ row skipped via `branch.deleted_at` check.
- `purchaseAmount <= 0` ⇒ early return.
- `merchant_wide` scope still requires `branch_id = branchId` (config must APPLY to purchase's branch); only the cumulative lookback expands.
- `best_only` ⇒ keep single plan with max absolute `creditValue` (GHS). Ties broken by first-seen (deterministic given query order by `id`).
- **Non-fatal**: errors inside `issueRunningCreditsForPurchase` are logged and swallowed by `createPurchase` — the purchase row is the source of truth and must survive.
- **Retroactivity** (decision 10): no `created_at` filter in the cumulative query.

### A.5 Modify `apps/main-backend/src/app/services/customers.service.ts`

In `createPurchase`, after the `customer_transactions.insert` succeeds (and we have `customerId`, `branchId`, `payload.amount`, `nowEpoch`, and the resolved `merchantId`):

```ts
// Auto-issue running credits (decisions 1, 6, 10). Errors here are logged
// but do NOT fail the purchase — the purchase row is the source of truth.
try {
  const merchantId = (await merchantService.getMerchantIdForUser(user.sub))?.merchant_id ?? user.merchant_id!;
  await issueRunningCreditsForPurchase(supabaseAdmin, merchantId, customerId, branchId, payload.amount, nowEpoch);
} catch (err) {
  request.log.error(err, "issueRunningCreditsForPurchase failed (non-fatal)");
}
```

### A.6 Routes

**New file** `apps/main-backend/src/app/routes/credit-configs/index.ts`. AutoLoad picks it up automatically (it scans `routes/`). Use a `resolveMerchantId` helper identical to the one in `customers/index.ts` (consider extracting to `middleware/merchant.middleware.ts` later — out of scope here).

Routes (all prefixed `/merchants/me/credit-configs`):

| Method | Path                                  | Auth                            | Purpose                          |
|--------|---------------------------------------|---------------------------------|----------------------------------|
| GET    | `/running`                            | `requireAuth`                   | List grouped running configs     |
| POST   | `/running`                            | `requireAuth, requireRoles("manager")` | Create new config (N rows)   |
| PATCH  | `/running/:configGroupId`             | `requireAuth, requireRoles("manager")` | Update (diff branches)      |
| DELETE | `/running/:configGroupId`             | `requireAuth, requireRoles("manager")` | Hard-delete whole group      |
| PATCH  | `/running/:configGroupId/active`      | `requireAuth, requireRoles("manager")` | Toggle is_active             |
| GET    | `/fixed`                              | `requireAuth`                   | List grouped fixed configs       |
| POST   | `/fixed`                              | `requireAuth, requireRoles("manager")` | Create                      |
| PATCH  | `/fixed/:configGroupId`               | `requireAuth, requireRoles("manager")` | Update                      |
| DELETE | `/fixed/:configGroupId`               | `requireAuth, requireRoles("manager")` | Hard-delete                 |
| PATCH  | `/fixed/:configGroupId/active`        | `requireAuth, requireRoles("manager")` | Toggle is_active             |

Each handler follows the `merchants/index.ts` shape: resolve merchantId, 403 if null, call service, try/catch with `request.log.error`, return `{ success: true, data }` or 400/404 with `{ success: false, error }`.

No changes to `routes/root.ts` (autoload handles the new folder).

### A.7 Type regeneration

Run `yarn generate:types` (root script → `apps/main-backend/scripts/type-first-workflow.js`). Regenerates:
- `apps/main-backend/src/app/types/database.types.ts` (from the DB — picks up new columns + enums)
- `apps/main-webapp/src/app/shared/types/api.types.ts` (from the TypeBox schemas — picks up the new request/response types)

Never hand-edit either generated file.

---

## B. Frontend

### B.1 `BranchMultiSelect` wrapper

There IS a generic `MultiSelect` in `libs/web-components/src/ui/multi-select.tsx` (Command-based, with badge chips) — reuse it. Wrap in a thin app-specific component:

**New file** `apps/main-webapp/src/app/pages/Credits/components/BranchMultiSelect.tsx`:

```tsx
interface Props {
  value: number[];
  onChange: (ids: number[]) => void;
  branches: { id: number; name: string | null; city: string }[];
  disabled?: boolean;
}
export function BranchMultiSelect({ value, onChange, branches, disabled }: Props) {
  const options = branches.map(b => ({ value: String(b.id), label: `${b.name?.trim() || "Unnamed branch"} · ${b.city}` }));
  return (
    <MultiSelect
      options={options}
      selectedValues={value.map(String)}
      onSelectedValuesChange={(vals: string[]) => onChange(vals.map(Number))}
      placeholder="Select branches"
      disabled={disabled}
    />
  );
}
```

(Confirm the exact prop names by reading `libs/web-components/src/ui/multi-select.tsx` before implementing — the wrapper isolates the prop-shape mismatch from the rest of the codebase.)

### B.2 Credits page

Replace `apps/main-webapp/src/app/pages/Credits/Credits.tsx` with a layout mirroring `Customers.tsx`:

- Hero header card (h1 "Credit configs", subtitle, `Sparkles` or `Wallet` icon from lucide-react) matching the MyStore/Customers pattern.
- `Tabs` with two triggers: "Running configs" | "Fixed configs" (reuse the existing `Tabs` from web-components; can reuse the sliding-pill pattern from `Customers.tsx` if desired).
- Tab content rendered inline via `useState` (no nested routes — simpler than the Customers nested-route pattern, sufficient here since there's no URL persistence requirement).

```tsx
const TABS = [{ value: "running", label: "Running configs" }, { value: "fixed", label: "Fixed configs" }] as const;
const isManager = (user?.roles ?? []).some(r => r.role === "manager");
const [tab, setTab] = useState<"running" | "fixed">("running");
// Body: tab === "running" ? <RunningConfigsTab isManager={isManager} /> : <FixedConfigsTab isManager={isManager} />
```

### B.3 Config cards

**New files**:
- `apps/main-webapp/src/app/pages/Credits/components/RunningConfigCard.tsx`
- `apps/main-webapp/src/app/pages/Credits/components/FixedConfigCard.tsx`

`RunningConfigCard` renders a `Card` with:
- Header row: reward type chip (`X%` or `GH₵Y flat`) + threshold/window summary + active/inactive `Badge`.
- Config values: `threshold_amount`, `eligible_window` ("Last N days" or "No lookback"), `credit_type` → "X% / GH₵Y flat", `maximum_allowed_credit`, `credit_validity` ("Lifetime" if null, "N days" otherwise), `cumulative_scope` ("Per-branch" / "Merchant-wide"), `terms`.
- Row of branch `Badge` chips for the multi-branch scope.
- Footer: Edit + Delete + Active-toggle trio (manager-gated by `isManager`).
- Brand voltage: white card, ink type, ONE teal accent on the active badge and on the percentage chip. Don't teal the whole card.

`FixedConfigCard`: same shape but shows `start_date`–`end_date` (formatted via `formatEpochDate`) and a "Active right now" computed client-side from `start_date ≤ now ≤ end_date` AND `is_active`. No auto-issuance language; copy makes clear it's a passive registry entry.

### B.4 Create/Edit dialogs

**New files**:
- `apps/main-webapp/src/app/pages/Credits/components/RunningConfigDialog.tsx`
- `apps/main-webapp/src/app/pages/Credits/components/FixedConfigDialog.tsx`

`RunningConfigDialog` uses `react-hook-form` + `zod` via `zodResolver`:

```ts
const schema = z.object({
  branch_ids: z.array(z.number()).min(1, "Select at least one branch"),
  credit_type: z.enum(["percentage", "fixed"]),
  percentage_credit_value: z.number().nullable(),
  fixed_credit_value: z.number().nullable(),
  maximum_allowed_credit: z.number().nullable(),
  threshold_amount: z.number().nullable(),
  eligible_window: z.number().nullable(),
  credit_validity: z.number().nullable(),
  cumulative_scope: z.enum(["per_branch", "merchant_wide"]),
  terms: z.string().nullable(),
});
```

- Use `ToggleGroup` (type="single") for `credit_type` and `cumulative_scope` — exported from web-components.
- Numeric `Input` fields with `setValueAs: v => v === "" || v == null ? null : Number(v)` for the optional numeric fields.
- `terms` is a `Textarea`.
- `BranchMultiSelect` via `Controller`.
- Submit: `mutation.mutate(values)` → on success `toast.success`, `queryClient.invalidateQueries({ queryKey: ["credit-configs"] })`, `onOpenChange(false)`. On error `toast.error(..., errorToastProperties)`.

`FixedConfigDialog`: same but fields are `branch_ids, credit_type, percentage/fixed_credit_value, maximum_allowed_credit, start_date, end_date, terms`. Date pickers use `react-day-picker` `Calendar` with `mode="single"` ×2 (one for start, one for end). Value is epoch seconds via `toEpochSeconds`/`fromEpochSeconds` from `@shared/utils/date.utils`. Each calendar wrapped in a `Popover` (existing pattern from `CustomersFilters.tsx`).

### B.5 API service

**New file** `libs/api-services/src/services/creditConfigService.ts` mirroring `customerService.ts`:

```ts
import { createApiClient } from "./apiService.js";

export function createCreditConfigService() {
  const { apiRequest } = createApiClient();
  return {
    listRunningConfigs: () => apiRequest<RunningCreditConfigListApiResponse>("/merchants/me/credit-configs/running", { method: "GET" }),
    createRunningConfig: (p: CreateRunningCreditConfigRequest) => apiRequest<RunningCreditConfigMutationApiResponse>("/merchants/me/credit-configs/running", { method: "POST", body: p }),
    updateRunningConfig: (gid: string, p: UpdateRunningCreditConfigRequest) => apiRequest<RunningCreditConfigMutationApiResponse>(`/merchants/me/credit-configs/running/${gid}`, { method: "PATCH", body: p }),
    deleteRunningConfig: (gid: string) => apiRequest<RunningCreditConfigMutationApiResponse>(`/merchants/me/credit-configs/running/${gid}`, { method: "DELETE" }),
    toggleRunningConfigActive: (gid: string, isActive: boolean) => apiRequest<RunningCreditConfigMutationApiResponse>(`/merchants/me/credit-configs/running/${gid}/active`, { method: "PATCH", body: { is_active: isActive } }),
    // same five for fixed
  };
}
export const creditConfigService = createCreditConfigService();
```

Add `export * from "./services/creditConfigService.js";` to `libs/api-services/src/index.ts`.

### B.6 TanStack Query hooks

Match the existing pattern (inline mutations in dialog components, `useQuery` for lists in tab components):

```ts
useQuery({ queryKey: ["credit-configs", "running"], queryFn: () => creditConfigService.listRunningConfigs() });
useQuery({ queryKey: ["credit-configs", "fixed"],  queryFn: () => creditConfigService.listFixedConfigs() });
```

Mutations inline in `RunningConfigDialog` / `FixedConfigDialog` with `onSuccess: () => queryClient.invalidateQueries({ queryKey: ["credit-configs"] })`. Delete + toggle-active mutations live inline in the card components.

### B.7 Route registration

No change to `apps/main-webapp/src/app/app.tsx` — `/credits` already routes to `Credits.tsx`. Just replace the file content.

### B.8 Type regeneration

After backend schemas and `yarn generate:types`, the frontend imports `RunningCreditConfigGroup`, `CreateRunningCreditConfigRequest`, etc. from `@shared/types/api.types`. No manual edits.

---

## C. Files to be created or modified

**Migrations (created)**
- `supabase/migrations/20260720000000_credit_config_augmentations.sql`

**Backend (created)**
- `apps/main-backend/src/app/schemas/creditConfig.schema.ts`
- `apps/main-backend/src/app/services/creditConfig.service.ts`
- `apps/main-backend/src/app/routes/credit-configs/index.ts`

**Backend (modified)**
- `apps/main-backend/src/app/services/customers.service.ts` — add `issueRunningCreditsForPurchase` call at end of `createPurchase` (non-fatal).

**Backend (auto-regenerated — do not hand-edit)**
- `apps/main-backend/src/app/types/database.types.ts`

**Frontend (created)**
- `apps/main-webapp/src/app/pages/Credits/components/BranchMultiSelect.tsx`
- `apps/main-webapp/src/app/pages/Credits/components/RunningConfigsTab.tsx`
- `apps/main-webapp/src/app/pages/Credits/components/FixedConfigsTab.tsx`
- `apps/main-webapp/src/app/pages/Credits/components/RunningConfigCard.tsx`
- `apps/main-webapp/src/app/pages/Credits/components/FixedConfigCard.tsx`
- `apps/main-webapp/src/app/pages/Credits/components/RunningConfigDialog.tsx`
- `apps/main-webapp/src/app/pages/Credits/components/FixedConfigDialog.tsx`

**Frontend (modified)**
- `apps/main-webapp/src/app/pages/Credits/Credits.tsx` — replace placeholder with the real page.

**Frontend (auto-regenerated — do not hand-edit)**
- `apps/main-webapp/src/app/shared/types/api.types.ts`

**Shared library (created/modified)**
- `libs/api-services/src/services/creditConfigService.ts` (created)
- `libs/api-services/src/index.ts` (add `export * from "./services/creditConfigService.js";`)

**No changes to** `apps/main-webapp/src/app/app.tsx` (`/credits` route already wired). **No changes to** `routes/root.ts` (autoload handles the new `routes/credit-configs/` folder).

---

## D. Reuse (no duplication)

- `supabaseAdmin` singleton — `apps/main-backend/src/app/utils/supabase.client.ts`.
- `requireAuth` + `requireRoles` — `apps/main-backend/src/app/middleware/auth.middleware.ts`.
- `merchantService.getMerchantIdForUser(userId)` — `apps/main-backend/src/app/services/merchant.service.ts`.
- TypeBox schema pattern (`Type.Object`, `Static<>`, `BaseBranch`, `ApiErrorResponse`) — `apps/main-backend/src/app/schemas/main.schema.ts`.
- API response envelope `Type.Union([SuccessResponse, ApiErrorResponse])` with `Type.Literal(true)` — `merchant.schema.ts:40, 47`.
- Fastify route plugin pattern — `routes/merchants/index.ts`, `routes/customers/index.ts`.
- Frontend API service factory pattern — `libs/api-services/src/services/customerService.ts`.
- TanStack Query `useQuery` queryKey shape `["ns", "name", { filters }]` — `CustomersLeaderboard.tsx:40-50`.
- Form pattern: `react-hook-form` + `zod` + `zodResolver` — `BranchEditDialog.tsx`, `MerchantEditDialog.tsx`, `AddPurchaseDialog.tsx`.
- Date picker pattern: `react-day-picker` `Calendar` ×2 in `Popover` — `CustomersFilters.tsx:99-135, 276-315`. Value shape: epoch seconds. Helpers `toEpochSeconds`/`fromEpochSeconds`/`startOfYearEpoch` in `@shared/utils/date.utils`.
- Toast pattern: `toast.success` / `toast.error` from `sonner` using `successToastProperties` / `errorToastProperties` from `@shared/utils/misc.utils`.
- `MultiSelect` primitive — `libs/web-components/src/ui/multi-select.tsx`.
- `cn` helper — `libs/web-components/src/lib/utils.ts`.
- `Checkbox`, `ToggleGroup`, `Popover`, `Dialog`, `Card`, `Badge`, `Input`, `Textarea`, `Label`, `Button`, `Skeleton`, `DropdownMenu` — all exported from `@store-credit-platform/web-components`.
- `isManager` pattern — `MyStore.tsx:19`: `(user?.roles ?? []).some((r) => r.role === "manager")`.
- `formatGHS`, `formatGHSCompact`, `formatEpochDate`, `formatEpochDateTime` — `@shared/utils/format`.

## E. Brand voltage constraints

- ~90% white + ink + muted, 1-2 teal moments per surface.
- Active/positive indicators on config cards use the `primary` token (teal #0d9488). Don't teal the whole card.
- Transaction-type badges stay literal Tailwind colors (blue/emerald/amber) as semantic markers.
- Decorative blobs use `primary` token.

---

## F. Verification

### F.1 Backend (manual, with seeded data)

1. Apply migration to dev Supabase: `yarn supabase db reset` (or `supabase migration up`).
2. `yarn generate:types` — confirm `database.types.ts` now includes `config_group_id`, `cumulative_scope`, `credit_stacking_policy`, and the two new enums.
3. Start backend: `npx nx serve main-backend`.
4. With a manager JWT:
   - `POST /merchants/me/credit-configs/running` with `branch_ids: [1, 2]`, `threshold_amount: 100`, `eligible_window: 30`, `credit_type: "percentage"`, `percentage_credit_value: 5`, `cumulative_scope: "per_branch"`. Expect one group with 2 branches returned.
   - `GET /merchants/me/credit-configs/running` — expect the group.
   - `PATCH /merchants/me/credit-configs/running/:groupId` removing one branch — expect group now has 1 branch.
   - `PATCH .../active` with `{ is_active: false }` then `DELETE .../groupId`.
5. Repeat for fixed configs.
6. Auto-issuance smoke test:
   - `POST /customers/transactions/purchase` with a phone whose prior cumulative spend crosses the threshold; verify a `customer_credit` row was inserted (query the table).
   - Hit with a sub-threshold purchase; verify no row.
   - Toggle `credit_stacking_policy` to `best_only`, create two matching configs, hit a qualifying purchase, verify exactly one `customer_credit` row inserted (the higher-value one).
   - Create a fixed config with `start_date/end_date` straddling today; verify no `customer_credit` row is ever inserted from a purchase (decision 4).
7. Permissions smoke test: hit `POST /merchants/me/credit-configs/running` with a cashier JWT — expect 403.

### F.2 Frontend (manual)

1. `npx nx serve main-webapp`. Log in as a manager, navigate to `/credits`.
2. Running tab: create a multi-branch running config, edit it (add/remove branches), toggle active, delete. Verify branch chips render and the active badge toggles.
3. Fixed tab: create a fixed config with a start/end date inside today, verify "Active right now" badge; create one outside today, verify inactive badge.
4. Switch to a cashier account: verify the Create/Edit/Delete buttons are hidden, lists still load.
5. Use the existing `AddPurchaseDialog` from the Customers page to record a purchase that should trigger issuance; verify the new `customer_credit` row appears in the DB (no UI surface yet for credits — that's a later feature). Confirm no `customer_credit` row is created for fixed configs.

### F.3 Type check

- `npx nx typecheck main-backend` and `npx nx typecheck main-webapp` — both must pass after types regenerate. Pre-existing errors unrelated to this feature (Auth/auth casing TS1261, jest mocks TS2708, tsconfig.spec.json TS5069) are OK; no NEW errors.

---

## G. Out of scope (deferred)

- **Credit pool interaction** — `merchants.credit_pool_used` is NOT touched in this feature. Pool integration (including over-limit handling) is a separate future feature.
- **Fixing the `credit_precentage` typo** in `customer_credit` — separate refactor; we work with the existing column name.
- **Customer credit redemption UI** — viewing/redeeming issued credits is a separate feature (the `/credits` page may eventually surface this, but not in v1).
- **Atomicity RPC for update** — three-call approach is acceptable for v1; revisit if partial-failure bugs appear.
- **Index on `customer_transactions (customer_id, transaction_date)` for the cumulative lookback** — the `(branch_id, transaction_date, transaction_type)` index covers the per-branch hot path; the merchant_wide path does a wider scan but is bounded by the merchant's transaction volume. Add a `(customer_id, transaction_date)` index later if merchant_wide scope shows slow queries.
- **Bulk import of credit configs** — manual creation only in v1.
- **Config templates / duplication** — no "duplicate config" button in v1.
- **Audit log for config changes** — not in v1.