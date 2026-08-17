# RPC → TypeScript Orchestration Migration — Holdout

Status: **On hold — reverted from working tree on 2026-08-16**
Branch when work was in progress: `feature/setup-customer-mobile-app`
Related commits (before revert): `b96bfa5` (theming), `c6be19d` (merge develop), `58702fb` (glass transitions)

## 1. Decision

The user reverted the entire migration from SQL RPCs to TypeScript-orchestrated
service calls. The intent was to move as much logic out of SQL helpers as
possible, keeping SQL only where atomicity or DB-side aggregations require it.
This document captures what was done, why it was reverted, and what to revisit
before any future attempt.

## 2. What was done (then reverted)

### 2.1 Customer-side write RPCs — replaced with TS orchestration

**Removed RPCs** (3):
- `redemption_request_create(p_customer_id, p_merchant_id, p_branch_id, p_amount, p_requested_date_ms)`
- `redemption_request_update(p_redemption_id, p_amount, p_branch_id)`
- `redemption_request_cancel(p_redemption_id)`

**Kept SQL helper** (1):
- `redemption_fan_out(p_customer_id, p_merchant_id, p_amount)` — the only
  operation that touches CHECK-constrained `customer_credit.pending_redemption_amount`
  rows. Pure TS via Supabase JS can't span a transaction across the per-row
  UPDATE loop, so the fan-out stays in SQL.

**Refactored**:
- `apps/main-backend/src/app/services/customerRedemptions.service.ts` —
  `createMyRedemptionRequest`, `updateMyRedemptionRequest`, `cancelMyRedemptionRequest`
  now orchestrate in TS:
  1. `assertBranchBelongsToMerchant(branchId, merchantId)` — typed lookup via
     `from("branches").select("id, merchant_id").eq("id", branchId).is("deleted_at", null).maybeSingle()`.
  2. `getMyPendingRequest(customerId, merchantId)` — `is("deleted_at", null).is("approved_at", null).is("rejected_at", null).maybeSingle()`.
  3. `generateUniqueCode(merchantId)` — loops up to 64 times generating
     `Math.floor(Math.random() * 9000) + 1000` with uniqueness check against
     active audit rows at the merchant. Non-CSPRNG but matches the 4-digit
     integer format and bounds the brute-force surface (~9000 codes, code is
     short-lived, rotated on every edit, deleted on cancel).
  4. Insert / update / soft-delete the audit row via typed `supabaseAdmin.from(...)`.
  5. Hand off the fan-out to `redemption_fan_out(...)` for the
     CHECK-constrained arithmetic.

### 2.2 Read RPCs — refactored to typed query helpers + window column

**Folded into single SQL helper**:
- `get_customer_leaderboard` + `get_customer_leaderboard_count` →
  one RPC returning `count(*) over()` on every row. Service reads `total`
  from `rows[0].total`, saving a roundtrip. Kept as SQL because the 3-table
  UNION (purchases � credits ∪ redemptions per customer) plus window count
  is impractical to split into TS round-trips.

**Replaced with typed TS queries**:
- `get_distinct_customer_count(p_merchant_id, p_branch_id)` → typed count
  via `from("customer_purchases").select("customer_id, branches!inner(merchant_id)", { count: "exact", head: true }).eq("branches.merchant_id", merchantId).eq("branch_id", b.id).is("deleted_at", null)`.
  Used in `branch.service.listBranchesForMerchant` and `merchant.service.getMyMerchantWithStats`.
- `get_customers(p_merchant_id, p_branch_id, p_search, p_limit, p_offset)` →
  5-step TS pipeline (~120 lines):
  1. Fetch merchant branches via `from("branches").select("id").eq("merchant_id", merchantId).is("deleted_at", null)`.
  2. `from("customers").select(...).or(search filter)` for search intersect.
  3. `from("customer_purchases").select("customer_id").is("deleted_at", null).in("branch_id", scopedBranchIds)`.
  4. Paginate + read total from length.
  5. For the page, parallel-fetch purchase / credit / redemption rows scoped
     to page customer_ids; JS-aggregate per customer.
  6. One `users` query by `id in (...)` for linked profiles via
     `QueryFragments.BASE_USER_PROFILE`.

### 2.3 Merchant approve/reject — designed but reverted before completion

**Designed**:
- `redemption_apply_audit(p_customer_id, p_merchant_id, p_staff_id, p_redemption_code, p_outcome text)`
  single SQL helper covering both approve and reject. 90% logic shared —
  lock pending row, verify spoken code, snapshot pending total, stamp audit
  row, reconcile per-credit slices. Branches on `p_outcome`:
  - `approve`: stamp `approved_at` + `approved_by_staff_id`, move
    `pending → approved` on every touched credit row, stamp
    `redemption_approval_staff_id` on each credit row.
  - `reject`: stamp `rejected_at`, zero `pending` on every touched credit.
- `redemption_approve` / `redemption_reject` thin `language sql` wrappers
  around `redemption_apply_audit('approve')` / `('reject')`. Public RPC arg
  shapes unchanged (4-arg / 3-arg) so the TS service calls the same RPC
  names — only the SQL internals get unified.
- Drop `trg_customer_credit_auto_shrink` trigger. No app code path
  currently sets `revoked_at` or `deleted_at` on a `customer_credit` row
  with non-zero `pending_redemption_amount`, and the audit-reconciliation
  paths zero the slice in the same SQL transaction as the audit stamp —
  the pending slice can never outlive the audit row.

**Not done** (because the migration was reverted before completing):
- Service code (`apps/main-backend/src/app/services/redemptions.service.ts`)
  was left calling the existing `redemption_approve` / `redemption_reject`
  RPC names. After deploy + types regen, the service can switch to calling
  `redemption_apply_audit` directly to remove the wrapper indirection.
- No revoke path built. If a future feature needs to soft-delete or
  revoke a `customer_credit` row with pending outstanding, the design
  pointed at an explicit `redemption_apply_revoke` helper, but it was
  never written.

### 2.4 Documentation / type cleanup (incidental)

**Updated**:
- `apps/main-backend/src/app/types/customerRedemptions.types.ts` — doc
  comment changed from "Mutations go through SQL RPCs" to "Mutations are
  orchestrated from TypeScript in `CustomerRedemptionsService`".
- `apps/main-backend/src/app/types/customers.types.ts` — `LeaderboardRow`
  declared `total?: number` to match the `count(*) over()` column added
  in the leaderboard helper.
- `apps/main-backend/src/app/types/customers.types.ts` — `CustomerListRow`
  doc comment changed from "Row shape returned by the get_customers RPC"
  to "Row shape returned by `CustomerService.listCustomers`".
- `apps/main-backend/src/app/utils/redemptionCode.service.ts` — doc comment
  pointed at `CustomerRedemptionsService.generateUniqueCode` (with
  `Math.random()` note) instead of the removed SQL RPCs.
- `apps/main-backend/src/app/routes/customers/index.ts` — doc comments on
  POST/PATCH/DELETE `/me/merchants/:merchantId/redemptions` referenced the
  service layer + `redemption_fan_out` instead of the removed RPCs.

## 3. Why it was reverted

The user opted to "hold out on this whole migration for now" without further
explanation. Two plausible reasons (not confirmed):
- The migration touched many call sites at once, making rollback hard once
  applied. Keeping the RPC-based version gives a known-working baseline.
- The `redemption_approve` / `redemption_reject` indirection (where the
  service still calls the old RPC names while the bodies delegate to the
  new helper) is awkward — the unified pattern was half-applied. Reverting
  before finishing is cleaner than leaving an in-between state.

## 4. Lessons / things to revisit

1. **Indirection cost.** The `redemption_approve` / `redemption_reject`
   wrapper pattern preserved typed args shape but added two-layer
   indirection. Future migrations should call the unified helper directly
   after deploy + types regen, not keep wrappers around "for typed args".

2. **Trigger dependency check is mandatory before drop.** Before dropping
   `trg_customer_credit_auto_shrink`, grep for any app code path that mutates
   `customer_credit.revoked_at` / `deleted_at` on rows with non-zero pending.
   The current repo has none, but a future feature that adds a revoke path
   needs an explicit `redemption_apply_revoke` helper in its place —
   restoring the trigger is harder to reason about than a service-callable
   helper.

3. **Cached `database.types.ts` lags behind SQL changes.** Adding
   `count(*) over()` to `get_customer_leaderboard` required widening the
   local `LeaderboardRow.total?: number` field until the next types regen
   picked it up. The TS-side `as unknown as LeaderboardRow[]` cast is a
   one-time acknowledgement of that lag, not a permanent pattern.

4. **Atomicity is the only thing SQL still earns.** Future candidates for
   TS orchestration should only stay in SQL if they need to:
   - span a transaction across multiple `.from()` calls (impossible in
     Supabase JS without an RPC).
   - do DB-side aggregation that would require multiple round-trips in TS
     (e.g. the leaderboard's 3-table UNION).
   - enforce a CHECK constraint inside the mutation (e.g.
     `pending_redemption_amount + approved_redemption_amount <= credit_amount`).

## 5. What to do if we revisit

- Start with task #319 (merchant approve/reject + trigger drop) — the
  designed approach is sound and the trigger-safety grep should be done
  early to confirm no surprises.
- Then task #320 (write tests for the customer-side orchestration) — the
  Jest runner has a pre-existing TS config error
  (`Option 'bundler' can only be used when 'module' is set to 'preserve' or
  to 'es2015' or later`); that needs fixing first or tests are unrunnable.
- Re-regenerate `database.types.ts` AFTER each migration apply, not
  before, so the cached types track reality.
