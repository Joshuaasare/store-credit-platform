-- Consolidated schema augmentations (single source of truth)
--
-- This file consolidates the augmentations that were previously spread across
-- 20260713 / 20260714 / 20260715 / 20260718 / 20260720 / 20260723 into ONE file.
-- It is idempotent — safe to re-apply on an existing DB. The base tables
-- (merchants, branches, customers, users, customer_credit, running_credit_config,
-- fixed_credit_config, customer_purchases, customer_credit_redemptions) come from
-- the Supabase project's initial schema, not from this file.
--
-- When the schema changes, EDIT THIS FILE in place — do not add new migration
-- files. Use `add column if not exists`, `create index if not exists`,
-- `create or replace function`, and `do $$ ... end$$` enum guards so the file
-- can be re-applied cleanly on any DB state.
--
-- Tables that no longer exist (and are intentionally NOT referenced here):
--   - customer_transactions      (dropped — purchases moved to customer_purchases)
--   - branch_customer junction    (dropped — distinct customer count now derived
--                                  from customer_purchases via the
--                                  get_distinct_customer_count RPC)

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Storage bucket for merchant logos + cover images
-- ──────────────────────────────────────────────────────────────────────────
-- Public bucket: objects are readable via their public URL without auth.
-- Writes happen through the backend with the service-role key (bypasses RLS),
-- so no public-write policy is needed.
insert into storage.buckets (id, name, public)
values ('store-assets', 'store-assets', true)
on conflict (id) do nothing;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. Enum types
-- ──────────────────────────────────────────────────────────────────────────
-- `transaction_type` is kept for backward compatibility with older deployments
-- that still have it; no table references it after customer_transactions was
-- dropped. Safe to leave in place — dropping an enum is destructive and out of
-- scope for this consolidation.
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'transaction_type' and n.nspname = 'public'
  ) then
    create type public.transaction_type as enum
      ('purchase', 'credit_redeem', 'credit_adjustment');
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'cumulative_scope_type' and n.nspname = 'public'
  ) then
    create type public.cumulative_scope_type as enum ('per_branch', 'merchant_wide');
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'credit_stacking_policy_type' and n.nspname = 'public'
  ) then
    create type public.credit_stacking_policy_type as enum ('stack', 'best_only');
  end if;
end$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 3. merchants columns
-- ──────────────────────────────────────────────────────────────────────────
alter table public.merchants
  add column if not exists credit_pool_limit numeric,
  add column if not exists credit_pool_used  numeric not null default 0,
  add column if not exists credit_stacking_policy public.credit_stacking_policy_type not null default 'stack';

-- ──────────────────────────────────────────────────────────────────────────
-- 4. branches columns
-- ──────────────────────────────────────────────────────────────────────────
alter table public.branches
  add column if not exists is_active boolean not null default true;

-- ──────────────────────────────────────────────────────────────────────────
-- 5. running_credit_config augmentations
-- ──────────────────────────────────────────────────────────────────────────
-- Multi-branch configs are denormalized: one row per branch sharing a
-- config_group_id. Editing a config = update all rows in the group.
alter table public.running_credit_config
  add column if not exists config_group_id uuid not null default gen_random_uuid(),
  add column if not exists cumulative_scope public.cumulative_scope_type not null default 'per_branch';

create index if not exists idx_running_credit_config_branch
  on public.running_credit_config (branch_id)
  where deleted_at is null;

create index if not exists idx_running_credit_config_group
  on public.running_credit_config (config_group_id)
  where deleted_at is null;

-- ──────────────────────────────────────────────────────────────────────────
-- 6. fixed_credit_config augmentations
-- ──────────────────────────────────────────────────────────────────────────
alter table public.fixed_credit_config
  add column if not exists config_group_id uuid not null default gen_random_uuid();

create index if not exists idx_fixed_credit_config_branch
  on public.fixed_credit_config (branch_id)
  where deleted_at is null;

create index if not exists idx_fixed_credit_config_group
  on public.fixed_credit_config (config_group_id)
  where deleted_at is null;

-- ──────────────────────────────────────────────────────────────────────────
-- 7. customer_credit: redemption-amount columns (collapse redemption state
--    onto the credit row itself)
-- ──────────────────────────────────────────────────────────────────────────
-- The legacy `customer_credit_redemptions` table is repurposed as a thin
-- append-only audit log; the per-credit redemption state now lives on the
-- `customer_credit` row directly. `pending_redemption_amount` reserves a
-- pending request's slice of each credit; `approved_redemption_amount`
-- tracks what has already been deducted. A row's `remaining` is derived:
--   remaining = credit_amount − approved_redemption_amount − pending_redemption_amount
-- The CHECK constraint enforces `pending + approved <= credit_amount` so an
-- over-redemption cannot land in the database even on a buggy fan-out.
alter table public.customer_credit
  add column if not exists expires_at bigint null,
  add column if not exists pending_redemption_amount numeric(12,2) not null default 0
    check (pending_redemption_amount >= 0),
  add column if not exists approved_redemption_amount numeric(12,2) not null default 0
    check (approved_redemption_amount >= 0),
  add column if not exists redemption_approval_staff_id bigint null
    references public.staff(id) on delete set null;

-- Composite bound on a single credit row — a request can never reserve
-- more than the credit's principal + already-approved slice.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'customer_credit_pending_approved_within_credit_amount_chk'
  ) then
    alter table public.customer_credit
      add constraint customer_credit_pending_approved_within_credit_amount_chk
      check (pending_redemption_amount + approved_redemption_amount <= credit_amount);
  end if;
end$$;

-- Hot path: "show me every pending request at this merchant" — the merchant
-- approval queue scans customer_credit rows WHERE pending_redemption_amount > 0
-- AND branch.merchant_id = $1.
create index if not exists idx_customer_credit_pending
  on public.customer_credit (customer_id, branch_id)
  where pending_redemption_amount > 0 and deleted_at is null;

-- ──────────────────────────────────────────────────────────────────────────
-- 7a. customer_credit_redemptions: drop credit_id + branch_id + recorded_by_staff_id
-- ──────────────────────────────────────────────────────────────────────────
-- After the row-level collapse (see section 7), the audit log no longer
-- needs to point at a specific credit row — one redemption row covers the
-- whole (customer, merchant) fan-out. branch_id is reached via merchant
-- scoping in the service layer; recorded_by_staff_id is dropped because
-- the legacy cashier-initiated flow is being removed (the customer app is
-- the only creator of redemption requests).
drop index if exists idx_customer_credit_redemptions_credit_approved;
drop index if exists idx_customer_credit_redemptions_credit_rejected;

-- Drop the FK constraints on the soon-to-be-removed columns BEFORE the
-- column drops — Postgres won't let us drop a column while a constraint
-- depends on it. Each constraint name is the standard Postgres auto-name
-- for the FK declared when the column was originally added. `if exists`
-- keeps the migration idempotent whether the constraint is still present
-- (legacy schema) or already gone (a partial-run of this script).
alter table public.customer_credit_redemptions
  drop constraint if exists customer_credit_redemptions_credit_id_fkey;
alter table public.customer_credit_redemptions
  drop constraint if exists customer_credit_redemptions_branch_id_fkey;

alter table public.customer_credit_redemptions
  drop column if exists credit_id,
  drop column if exists branch_id;

-- Recorded_by_staff_id (and its FK + legacy rename block) lived in the
-- section below; the column is removed here so we don't carry forward a
-- cashier-initiated audit field that nothing writes to anymore.
alter table public.customer_credit_redemptions
  drop constraint if exists customer_credit_redemptions_recorded_by_staff_id_fkey;
alter table public.customer_credit_redemptions
  drop column if exists recorded_by_staff_id;

-- Approved-redemption audit feed (powers the merchant "Approved" tab and
-- the customer Home activity feed): sorted by approved_at DESC for the
-- feed ordering.
create index if not exists idx_customer_credit_redemptions_customer_approved
  on public.customer_credit_redemptions (customer_id, approved_at desc)
  where approved_at is not null and deleted_at is null;

-- 7a.1 customer_credit_redemptions: merchant_id
--
-- Add `merchant_id` to the audit row so the customer-app Home activity
-- feed and the merchant Approved / Rejected tabs can join directly to
-- merchants (audit → merchants). Previously the activity feed derived
-- merchant by walking back through the customer's customer_credit rows
-- to a branch, which broke when the customer had no active credits AND
-- picked a random merchant for multi-merchant customers.
--
-- Nullable (not backfilled — see the note at the end of this section).
-- Legacy audit rows from before this migration have `merchant_id = null`
-- and are silently dropped from the customer activity feed (the join
-- skips null). No backfill migration ships with this change; see the
-- data-quality decision noted below.
--
-- ON DELETE SET NULL: if the merchant is hard-deleted, the audit row
-- stays (it is a financial record — we don't cascade-delete audit data)
-- but the merchant reference clears so the row falls off the feed.
alter table public.customer_credit_redemptions
  add column if not exists merchant_id bigint null references public.merchants(id) on delete set null;

-- Partial index that speeds up the webapp Approved tab listing
-- (audit row by merchant, newest approved first). The partial WHERE
-- excludes rejected / pending rows so the index stays tight.
create index if not exists idx_customer_credit_redemptions_merchant_approved
  on public.customer_credit_redemptions (merchant_id, approved_at desc)
  where approved_at is not null;

-- Backfill note: historical audit rows (written before this column
-- existed) have merchant_id = null. The customer-app activity feed
-- already drops those rows. If/when a one-shot backfill is run, the
-- canonical lookup is the customer's most-recent customer_credit row at
-- the audit row's created_at timestamp (customer_credit.branch_id →
-- branches.merchant_id). This is a data-quality call, not a code call,
-- and is intentionally NOT included in this migration.

-- ──────────────────────────────────────────────────────────────────────────
-- 7b. customer_credit_redemptions: rejected_at
-- ──────────────────────────────────────────────────────────────────────────
-- `rejected_at` is the distinct "rejected" terminal state — null = not
-- rejected. The two terminal states are derived from approved_at /
-- rejected_at (no status enum):
--   Approved → approved_at IS NOT NULL
--   Rejected → rejected_at IS NOT NULL (implies approved_at IS NULL)
-- approved_at and rejected_at are mutually exclusive (enforced in the
-- service layer).
alter table public.customer_credit_redemptions
  add column if not exists rejected_at timestamptz;

-- Rejected-redemption audit feed (powers the merchant "Rejected" listing):
-- sorted by rejected_at DESC for the feed ordering. Lives here (after the
-- column is added) rather than next to the approved-at index in section
-- 7a because `rejected_at` doesn't exist until this ALTER runs.
create index if not exists idx_customer_credit_redemptions_customer_rejected
  on public.customer_credit_redemptions (customer_id, rejected_at desc)
  where rejected_at is not null and deleted_at is null;

-- ──────────────────────────────────────────────────────────────────────────
-- 8. Hot-path indexes for the new transactional tables
-- ──────────────────────────────────────────────────────────────────────────
-- Cumulative-spend lookback (running-config threshold check):
--   WHERE customer_id = ? AND branch_id IN (...) AND transaction_date < ? AND >= ?
create index if not exists idx_customer_purchases_cumulative
  on public.customer_purchases (customer_id, branch_id, transaction_date desc)
  where deleted_at is null;

-- Per-merchant transactions feed (replaces the old idx_customer_transactions_cumulative).
create index if not exists idx_customer_purchases_branch_date
  on public.customer_purchases (branch_id, transaction_date desc)
  where deleted_at is null;

-- Customer credit lookups by customer / branch.
create index if not exists idx_customer_credit_customer_branch
  on public.customer_credit (customer_id, branch_id)
  where deleted_at is null;

-- Staff directory hot path: users → staff → branches join, filtered by
-- merchant via branches.merchant_id and limited to live (non-deleted) rows.
create index if not exists idx_staff_user_branch
  on public.staff (user_id, branch_id)
  where deleted_at is null;

-- Single-role-per-staff model: the role lives directly on the staff row
-- (replaces the older staff_user_roles join table — that table is kept for
-- now but no longer written to). Nullable so a staff row can exist briefly
-- without a role; service code treats null as "no live role".
alter table public.staff
  add column if not exists role public.role;

-- Hot path: list staff filtered by role within a merchant + last-manager
-- guard (counts managers scoped to the merchant's branches).
create index if not exists idx_staff_role
  on public.staff (role)
  where deleted_at is null;

-- ──────────────────────────────────────────────────────────────────────────
-- 8b. Name + access_granted columns live on staff / customers, NOT on users
-- ──────────────────────────────────────────────────────────────────────────
-- `users` is a phone-based OTP login identity — it carries no name and no
-- access flag. A user's name is defined by their staff row (merchants'
-- employees) OR their customer row (walk-in / app customers). The
-- access_granted kill-switch also lives on `staff` (a staff member's access
-- is per-assignment, not per-login-identity). Both `staff` and `customers`
-- get their own `surname` + `other_names` columns; `staff` gets
-- `access_granted`; the legacy `users.surname` / `users.other_names` /
-- `users.access_granted` columns are dropped (data should be backfilled onto
-- the matching staff / customers rows before re-applying this section).
alter table public.staff
  add column if not exists surname text,
  add column if not exists other_names text,
  add column if not exists access_granted boolean not null default true;

alter table public.customers
  add column if not exists surname text,
  add column if not exists other_names text;

alter table public.users
  drop column if exists surname,
  drop column if exists other_names,
  drop column if exists access_granted;

-- ──────────────────────────────────────────────────────────────────────────
-- 8c. recorded_by_staff_id / approved_by_staff_id FKs → staff
-- ──────────────────────────────────────────────────────────────────────────
-- customer_purchases and customer_credit_redemptions previously recorded the
-- acting cashier via a users FK (`recorded_by_user_id` / `approved_by_user_id`).
-- Names live on `staff` now, so the FK must point at `staff.id` directly — this
-- lets the activity feed join `staff(surname, other_names)` for the "Recorded
-- by" / "Approved by" columns without going through `users`.
--
-- Idempotent rename: if the *_user_id column still exists, drop its FK, copy
-- the values into a new `*_staff_id bigint` column, drop the old column, and
-- add the staff FK. If the rename has already been applied, the old column no
-- longer exists so the `information_schema` guard skips the block. The
-- `customer_credit_redemptions` table also gets a `recorded_by_staff_id`
-- column (for pending redemptions awaiting approval — the recording cashier is
-- distinct from the approving manager).
do $$
begin
  -- customer_purchases: recorded_by_user_id → recorded_by_staff_id
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customer_purchases'
      and column_name = 'recorded_by_user_id'
  ) then
    alter table public.customer_purchases drop constraint if exists customer_purchases_recorded_by_user_id_fkey;
    alter table public.customer_purchases add column if not exists recorded_by_staff_id bigint;
    update public.customer_purchases cp
      set recorded_by_staff_id = s.id
      from public.staff s
      where cp.recorded_by_user_id = s.user_id;
    alter table public.customer_purchases drop column if exists recorded_by_user_id;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customer_purchases'
      and column_name = 'recorded_by_staff_id'
  ) then
    alter table public.customer_purchases add column recorded_by_staff_id bigint;
  end if;
  alter table public.customer_purchases
    drop constraint if exists customer_purchases_recorded_by_staff_id_fkey;
  alter table public.customer_purchases
    add constraint customer_purchases_recorded_by_staff_id_fkey
    foreign key (recorded_by_staff_id) references public.staff(id) on delete set null;

  -- customer_credit_redemptions: approved_by_user_id → approved_by_staff_id
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customer_credit_redemptions'
      and column_name = 'approved_by_user_id'
  ) then
    alter table public.customer_credit_redemptions drop constraint if exists customer_credit_redemptions_approved_by_user_id_fkey;
    alter table public.customer_credit_redemptions add column if not exists approved_by_staff_id bigint;
    update public.customer_credit_redemptions r
      set approved_by_staff_id = s.id
      from public.staff s
      where r.approved_by_user_id = s.user_id;
    alter table public.customer_credit_redemptions drop column if exists approved_by_user_id;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customer_credit_redemptions'
      and column_name = 'approved_by_staff_id'
  ) then
    alter table public.customer_credit_redemptions add column approved_by_staff_id bigint;
  end if;
  alter table public.customer_credit_redemptions
    drop constraint if exists customer_credit_redemptions_approved_by_staff_id_fkey;
  alter table public.customer_credit_redemptions
    add constraint customer_credit_redemptions_approved_by_staff_id_fkey
    foreign key (approved_by_staff_id) references public.staff(id) on delete set null;
end $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 9. Leaderboard RPCs
-- ──────────────────────────────────────────────────────────────────────────
-- Source tables (after the redemption row-state collapse):
--   - customer_purchases              (kind = 'purchase')
--   - customer_credit                  (kind = 'credit_issue', credit_amount column)
--   - customer_credit_redemptions      (kind = 'credit_redeem', amount_redeemed column;
--                                      customer_id lives directly on the row now;
--                                      branch is reached via the audit row's
--                                      customer_id → customer_credit → branch_id,
--                                      but for the leaderboard we only need the
--                                      customer-level total, so branch scoping is
--                                      enforced by joining the customer's credits
--                                      at a merchant branch)
--
-- `transaction_date` is Unix epoch MILLISECONDS (bigint) on customer_purchases.
-- customer_credit and customer_credit_redemptions only have a timestamptz
-- `created_at`, so we synthesize a millisecond epoch via
-- (EXTRACT(EPOCH FROM created_at) * 1000)::bigint when applying the date filter.
create or replace function public.get_customer_leaderboard(
  p_merchant_id  bigint,
  p_branch_id    bigint default null,
  p_sort         text    default 'purchases',
  p_start_epoch  bigint  default null,
  p_end_epoch    bigint  default null,
  p_limit        int     default 20,
  p_offset       int     default 0
)
returns table (
  customer_id            bigint,
  phone                  text,
  user_id                uuid,
  customer_name          text,
  branch_id              bigint,
  total_purchases        numeric,
  total_credits_issued   numeric,
  total_credits_redeemed numeric,
  transaction_count      bigint
)
language sql
stable
as $$
  with merchant_branches as (
    select id from public.branches
    where merchant_id = p_merchant_id and deleted_at is null
      and (p_branch_id is null or id = p_branch_id)
  ),
  purchase_agg as (
    select p.customer_id, p.branch_id, p.amount as amount
    from public.customer_purchases p
    join merchant_branches mb on mb.id = p.branch_id
    where p.deleted_at is null
      and (p_start_epoch is null or p.transaction_date >= p_start_epoch)
      and (p_end_epoch   is null or p.transaction_date <= p_end_epoch)
  ),
  credit_agg as (
    select c.customer_id, c.branch_id, c.credit_amount as amount
    from public.customer_credit c
    join merchant_branches mb on mb.id = c.branch_id
    where c.deleted_at is null and c.revoked_at is null
      and (p_start_epoch is null or c.transaction_date >= p_start_epoch)
      and (p_end_epoch   is null or c.transaction_date <= p_end_epoch)
  ),
  redemption_agg as (
    -- The audit row's `customer_id` IS the merchant's customer; the
    -- (customer_id, merchant_id) scoping is enforced at write time, so
    -- we just need to filter the audit rows by their transaction_date
    -- epoch and join on customer_id.
    select r.customer_id, c.branch_id, r.amount_redeemed as amount
    from public.customer_credit_redemptions r
    join public.customer_credit c
      on c.customer_id = r.customer_id
     and c.deleted_at is null
     and c.revoked_at is null
    join merchant_branches mb on mb.id = c.branch_id
    where r.deleted_at is null and r.approved_at is not null
      and (p_start_epoch is null or r.transaction_date >= p_start_epoch)
      and (p_end_epoch   is null or r.transaction_date <= p_end_epoch)
  ),
  unioned as (
    select customer_id, branch_id, amount, 'purchase'  ::text as kind from purchase_agg
    union all
    select customer_id, branch_id, amount, 'credit'     ::text as kind from credit_agg
    union all
    select customer_id, branch_id, amount, 'redemption'::text as kind from redemption_agg
  ),
  agg as (
    select
      customer_id,
      coalesce(sum(amount) filter (where kind = 'purchase'),    0) as total_purchases,
      coalesce(sum(amount) filter (where kind = 'credit'),      0) as total_credits_issued,
      coalesce(sum(amount) filter (where kind = 'redemption'), 0) as total_credits_redeemed,
      count(*)::bigint as transaction_count
    from unioned
    group by customer_id
  ),
  branch_pick as (
    select distinct on (customer_id) customer_id, branch_id
    from unioned
    order by customer_id, branch_id desc
  )
  select
    c.id          as customer_id,
    c.phone       as phone,
    c.user_id     as user_id,
    coalesce(nullif(trim(coalesce(c.surname, '') || ' ' || coalesce(c.other_names, '')), ''), 'Unnamed customer') as customer_name,
    bp.branch_id as branch_id,
    a.total_purchases        as total_purchases,
    a.total_credits_issued   as total_credits_issued,
    a.total_credits_redeemed as total_credits_redeemed,
    a.transaction_count      as transaction_count
  from agg a
  left join public.customers c on c.id = a.customer_id
  left join branch_pick      bp on bp.customer_id = a.customer_id
  order by
    case
      when p_sort = 'credits_issued'   then a.total_credits_issued
      when p_sort = 'credits_redeemed' then a.total_credits_redeemed
      else a.total_purchases
    end desc,
    a.customer_id asc
  limit p_limit
  offset p_offset;
$$;

create or replace function public.get_customer_leaderboard_count(
  p_merchant_id  bigint,
  p_branch_id    bigint default null,
  p_start_epoch  bigint  default null,
  p_end_epoch    bigint  default null
)
returns bigint
language sql
stable
as $$
  with merchant_branches as (
    select id from public.branches
    where merchant_id = p_merchant_id and deleted_at is null
      and (p_branch_id is null or id = p_branch_id)
  ),
  purchase_ids as (
    select p.customer_id from public.customer_purchases p
    join merchant_branches mb on mb.id = p.branch_id
    where p.deleted_at is null
      and (p_start_epoch is null or p.transaction_date >= p_start_epoch)
      and (p_end_epoch   is null or p.transaction_date <= p_end_epoch)
  ),
  credit_ids as (
    select c.customer_id from public.customer_credit c
    join merchant_branches mb on mb.id = c.branch_id
    where c.deleted_at is null and c.revoked_at is null
      and (p_start_epoch is null or c.transaction_date >= p_start_epoch)
      and (p_end_epoch   is null or c.transaction_date <= p_end_epoch)
  ),
  redemption_ids as (
    select r.customer_id from public.customer_credit_redemptions r
    join public.customer_credit c
      on c.customer_id = r.customer_id
     and c.deleted_at is null
     and c.revoked_at is null
    join merchant_branches mb on mb.id = c.branch_id
    where r.deleted_at is null and r.approved_at is not null
      and (p_start_epoch is null or r.transaction_date >= p_start_epoch)
      and (p_end_epoch   is null or r.transaction_date <= p_end_epoch)
  )
  select count(distinct customer_id)::bigint
  from (
    select customer_id from purchase_ids
    union all
    select customer_id from credit_ids
    union all
    select customer_id from redemption_ids
  ) s;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 10. Distinct customer count RPC
-- ──────────────────────────────────────────────────────────────────────────
-- A "customer of a branch" = has ≥1 purchase at that branch with deleted_at
-- IS NULL. Merchant scoping is enforced by joining customer_purchases →
-- branches on branch_id and filtering branches.merchant_id = p_merchant_id,
-- so a caller cannot pass another merchant's branch_id to inflate the count.
create or replace function public.get_distinct_customer_count(
  p_merchant_id  bigint,
  p_branch_id    bigint default null
)
returns bigint
language sql
stable
as $$
  select count(distinct p.customer_id)::bigint
  from public.customer_purchases p
  join public.branches b on b.id = p.branch_id
  where b.merchant_id = p_merchant_id
    and p.deleted_at is null
    and (p_branch_id is null or p.branch_id = p_branch_id);
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 11. Customers list RPC
-- ──────────────────────────────────────────────────────────────────────────
-- Paginated, searchable customer directory for the /customers page.
-- Scoping: a customer appears iff they have ≥1 non-deleted purchase at a
-- merchant branch (filtered to p_branch_id when provided). Search is a
-- substring match on surname, other_names, or customer phone — applied
-- AFTER scoping so search never leaks customers outside the branch/merchant
-- scope.
--
-- Per-customer aggregates (all scoped to the same branch filter):
--   total_purchases     = SUM(customer_purchases.amount)
--   available_credits   = SUM(GREATEST(0, credit_amount − approved redemptions))
--                         over LIVE credits (non-deleted, non-revoked,
--                         non-expired). Per-credit remaining is clamped at 0
--                         so an over-redeemed credit can't subtract from the
--                         total.
--   live_credit_count   = COUNT of live credits with remaining > 0
--   last_activity_epoch = GREATEST across purchase.transaction_date,
--                         credit.created_at, redemption.created_at
--   total               = window count of matched customers (pre-LIMIT) for
--                         pagination — read from the first row, 0 if empty.
create or replace function public.get_customers(
  p_merchant_id  bigint,
  p_branch_id    bigint default null,
  p_search       text   default null,
  p_limit        int    default 20,
  p_offset       int    default 0
)
returns table (
  customer_id          bigint,
  phone                text,
  user_id              uuid,
  customer_name        text,
  total_purchases      numeric,
  available_credits    numeric,
  live_credit_count    bigint,
  last_activity_epoch  bigint,
  total                bigint
)
language sql
stable
as $$
  with merchant_branches as (
    select id from public.branches
    where merchant_id = p_merchant_id and deleted_at is null
      and (p_branch_id is null or id = p_branch_id)
  ),
  scoped_customers as (
    select distinct p.customer_id
    from public.customer_purchases p
    join merchant_branches mb on mb.id = p.branch_id
    where p.deleted_at is null
  ),
  matched_customers as (
    select c.id as customer_id,
           c.phone,
           c.user_id,
           coalesce(
             nullif(trim(coalesce(c.surname, '') || ' ' || coalesce(c.other_names, '')), ''),
             'Unnamed customer'
           ) as customer_name
    from scoped_customers sc
    join public.customers c on c.id = sc.customer_id
    where p_search is null
       or c.phone ilike '%' || p_search || '%'
       or c.surname ilike '%' || p_search || '%'
       or coalesce(c.other_names, '') ilike '%' || p_search || '%'
  ),
  purchase_agg as (
    select p.customer_id,
           coalesce(sum(p.amount), 0) as total_purchases,
           max(p.transaction_date)    as last_purchase_epoch
    from public.customer_purchases p
    join merchant_branches mb on mb.id = p.branch_id
    where p.deleted_at is null
    group by p.customer_id
  ),
  -- After the row-state collapse, each credit row carries its own
  -- approved_redemption_amount and pending_redemption_amount — no JOIN
  -- through customer_credit_redemptions needed to compute remaining.
  -- available = credit_amount - approved_redemption_amount - pending_redemption_amount,
  -- clamped at 0 so an over-redeemed credit can't subtract from the total.
  credit_agg as (
    select c.customer_id,
           coalesce(
             sum(greatest(0,
               c.credit_amount
               - coalesce(c.approved_redemption_amount, 0)
               - coalesce(c.pending_redemption_amount, 0))),
             0
           ) as available_credits,
           count(*) filter (
             where greatest(0,
               c.credit_amount
               - coalesce(c.approved_redemption_amount, 0)
               - coalesce(c.pending_redemption_amount, 0)) > 0
           )::bigint as live_credit_count,
           max(c.transaction_date) as last_credit_epoch
    from public.customer_credit c
    join merchant_branches mb on mb.id = c.branch_id
    where c.deleted_at is null
      and c.revoked_at is null
      and (c.expires_at is null
           or c.expires_at > (extract(epoch from now()) * 1000)::bigint)
    group by c.customer_id
  ),
  redemption_agg as (
    -- The audit row's customer_id IS the merchant's customer; we scope
    -- the last-redemption epoch via the customer's credits at this
    -- merchant (so a redemption against a different merchant doesn't
    -- pollute this customer's "last activity" at ours).
    select c.customer_id,
           max(r.transaction_date) as last_redemption_epoch
    from public.customer_credit_redemptions r
    join public.customer_credit c
      on c.customer_id = r.customer_id
     and c.deleted_at is null
     and c.revoked_at is null
    join merchant_branches mb on mb.id = c.branch_id
    where r.deleted_at is null and r.approved_at is not null
    group by c.customer_id
  )
  select
    mc.customer_id,
    mc.phone,
    mc.user_id,
    mc.customer_name,
    coalesce(pa.total_purchases, 0)   as total_purchases,
    coalesce(ca.available_credits, 0) as available_credits,
    coalesce(ca.live_credit_count, 0) as live_credit_count,
    greatest(
      pa.last_purchase_epoch,
      ca.last_credit_epoch,
      ra.last_redemption_epoch
    )                                 as last_activity_epoch,
    count(*) over()                   as total
  from matched_customers mc
  left join purchase_agg   pa on pa.customer_id = mc.customer_id
  left join credit_agg     ca on ca.customer_id = mc.customer_id
  left join redemption_agg ra on ra.customer_id = mc.customer_id
  order by
    greatest(
      pa.last_purchase_epoch,
      ca.last_credit_epoch,
      ra.last_redemption_epoch
    ) desc nulls last,
    mc.customer_id asc
  limit p_limit
  offset p_offset;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 12. Redemption fan-out RPCs (atomic, single-transaction)
-- ──────────────────────────────────────────────────────────────────────────
-- All four customer- and merchant-initiated operations that touch
-- `pending_redemption_amount` run through `redemption_fan_out`. The fan-out
-- is the only place in the database that writes to the column — every
-- caller funnels through it so the invariants hold:
--
--   1. fan-out order: `expires_at ASC NULLS LAST, created_at ASC, id ASC`.
--      The "full-row-take" rule means each credit row is either fully
--      reserved (its pending slice equals its full available capacity) or
--      zero — there's no partial-fill middle state for a single row.
--   2. available per row = credit_amount − approved_redemption_amount.
--      Pending is what's being re-fanned-out; approved is locked.
--   3. demand walks rows oldest-expiry-first; when demand runs out, the
--      rest of the rows have their pending set to 0.
--
-- `redemption_fan_out` is callable from both customer (create/edit/cancel)
-- and merchant (approve/reject) code paths. The merchant approve/reject
-- flow uses its own dedicated RPCs (`redemption_approve`,
-- `redemption_reject`) so the audit-row insert lives in the same
-- transaction as the row-state mutation — Supabase JS can't span a
-- transaction across two calls otherwise.
create or replace function public.redemption_fan_out(
  p_customer_id  bigint,
  p_merchant_id  bigint,
  p_amount       numeric
)
returns table (
  credit_id              bigint,
  pending_redemption_amount numeric
)
language plpgsql
volatile
as $$
declare
  v_remaining numeric := greatest(0, coalesce(p_amount, 0));
begin
  -- Walk merchant's credit rows at this customer, oldest-expiry-first
  -- (NULLS LAST so lifetime credits always take the back seat).
  -- Each row takes min(available, demand_remaining), where demand_remaining
  -- for row N is v_remaining minus the sum of available seen in rows 1..N-1.
  --
  -- Implementation: compute a running sum of `available` over the sorted
  -- rows using a window function (`sum(...) over (order by ...)`), then
  -- for each row the demand-before-it is `cum_available - this_row_available`
  -- and the slice it consumes is `min(available, max(0, v_remaining - demand_before))`.

  return query
  with merchant_branches as (
    select id from public.branches
    where merchant_id = p_merchant_id and deleted_at is null
  ),
  ordered as (
    select c.id, c.credit_amount, c.approved_redemption_amount,
           c.pending_redemption_amount, c.expires_at, c.created_at,
           greatest(
             0,
             c.credit_amount - coalesce(c.approved_redemption_amount, 0)
           ) as available
    from public.customer_credit c
    join merchant_branches mb on mb.id = c.branch_id
    where c.customer_id = p_customer_id
      and c.deleted_at is null
      and c.revoked_at is null
      and (c.expires_at is null or c.expires_at > (extract(epoch from now()) * 1000)::bigint)
    order by c.expires_at asc nulls last, c.created_at asc, c.id asc
    for update of c
  ),
  with_running_sum as (
    -- Cumulative `available` over the ordering, INCLUDING each row.
    -- `cum_after_this_row = sum(available[1..N])`. To get demand BEFORE
    -- this row, subtract this row's `available`.
    select
      o.id,
      o.available,
      sum(o.available) over (
        order by o.expires_at asc nulls last, o.created_at asc, o.id asc
        rows between unbounded preceding and current row
      ) as cum_after_this_row
    from ordered o
  ),
  computed as (
    select
      r.id,
      greatest(
        0,
        least(
          r.available,
          v_remaining - greatest(0, r.cum_after_this_row - r.available)
        )
      ) as new_pending
    from with_running_sum r
  ),
  updated as (
    update public.customer_credit c
    set pending_redemption_amount = coalesce(comp.new_pending, 0),
        updated_at = now()
    from computed comp
    where c.id = comp.id
    returning c.id, c.pending_redemption_amount
  )
  select u.id, u.pending_redemption_amount from updated u;
end;
$$;

-- Approve a pending redemption at (customer, merchant). All-or-nothing
-- in one transaction:
--   1. snapshot total pending across the merchant's credits at this customer;
--   2. write one audit row to customer_credit_redemptions;
--   3. move pending → approved_redemption_amount on every touched row
--      and stamp redemption_approval_staff_id.
-- Returns: the new audit row's id + the total approved amount.
create or replace function public.redemption_approve(
  p_customer_id  bigint,
  p_merchant_id  bigint,
  p_staff_id     bigint
)
returns table (
  audit_id          bigint,
  amount_redeemed   numeric
)
language plpgsql
volatile
as $$
declare
  v_total numeric := 0;
  v_audit_id bigint;
begin
  -- Lock and sum every pending slice at this (customer, merchant).
  select coalesce(sum(c.pending_redemption_amount), 0)
    into v_total
  from public.customer_credit c
  join public.branches b on b.id = c.branch_id and b.deleted_at is null
  where c.customer_id = p_customer_id
    and b.merchant_id = p_merchant_id
    and c.deleted_at is null
    and c.revoked_at is null
    and c.pending_redemption_amount > 0
  for update of c;

  if v_total <= 0 then
    raise exception 'No pending redemption to approve'
      using errcode = 'P0002';
  end if;

  -- Write the audit row first so it has the right snapshot amount even
  -- if the row-state mutation raises (which it shouldn't — both run in
  -- the same transaction). `merchant_id` is stamped here so the
  -- customer activity feed and the merchant Approved tab can join
  -- directly to merchants without going through customer_credit →
  -- branches.
  insert into public.customer_credit_redemptions
    (customer_id, merchant_id, amount_redeemed, approved_at, approved_by_staff_id)
  values
    (p_customer_id, p_merchant_id, v_total, now(), p_staff_id)
  returning id into v_audit_id;

  -- Move pending → approved and stamp the approval staff id.
  update public.customer_credit c
  set approved_redemption_amount = approved_redemption_amount + c.pending_redemption_amount,
      pending_redemption_amount = 0,
      redemption_approval_staff_id = p_staff_id,
      updated_at = now()
  from public.branches b
  where c.customer_id = p_customer_id
    and b.id = c.branch_id
    and b.merchant_id = p_merchant_id
    and c.deleted_at is null
    and c.pending_redemption_amount > 0;

  return query select v_audit_id, v_total;
end;
$$;

-- Reject a pending redemption at (customer, merchant). Atomic:
--   1. snapshot total pending across the merchant's credits at this customer;
--   2. write one audit row to customer_credit_redemptions with
--      rejected_at = now();
--   3. zero out pending_redemption_amount on every touched row.
create or replace function public.redemption_reject(
  p_customer_id  bigint,
  p_merchant_id  bigint
)
returns table (
  audit_id          bigint,
  amount_redeemed   numeric
)
language plpgsql
volatile
as $$
declare
  v_total numeric := 0;
  v_audit_id bigint;
begin
  select coalesce(sum(c.pending_redemption_amount), 0)
    into v_total
  from public.customer_credit c
  join public.branches b on b.id = c.branch_id and b.deleted_at is null
  where c.customer_id = p_customer_id
    and b.merchant_id = p_merchant_id
    and c.deleted_at is null
    and c.revoked_at is null
    and c.pending_redemption_amount > 0
  for update of c;

  if v_total <= 0 then
    raise exception 'No pending redemption to reject'
      using errcode = 'P0002';
  end if;

  insert into public.customer_credit_redemptions
    (customer_id, merchant_id, amount_redeemed, rejected_at)
  values
    (p_customer_id, p_merchant_id, v_total, now())
  returning id into v_audit_id;

  update public.customer_credit c
  set pending_redemption_amount = 0,
      updated_at = now()
  from public.branches b
  where c.customer_id = p_customer_id
    and b.id = c.branch_id
    and b.merchant_id = p_merchant_id
    and c.deleted_at is null
    and c.pending_redemption_amount > 0;

  return query select v_audit_id, v_total;
end;
$$;

-- Auto-shrink hook: when a credit row is revoked (or soft-deleted), if
-- it was part of a pending fan-out, re-fan-out the remaining demand
-- across the customer's other live rows at the merchant so the request
-- doesn't claim more than the customer can still spend. Trigger-only —
-- called by the trigger below, never directly from the service layer.
create or replace function public.redemption_auto_shrink()
returns trigger
language plpgsql
as $$
declare
  v_merchant_id bigint;
  v_remaining numeric := 0;
begin
  -- Only act when revoked_at / deleted_at just got stamped and there was
  -- a pending slice on this row. The OLD row captures the previous
  -- pending amount (before the UPDATE sets it to 0).
  if tg_op = 'UPDATE' then
    if new.revoked_at is null and new.deleted_at is null then
      return new;
    end if;
    if coalesce(old.pending_redemption_amount, 0) <= 0 then
      return new;
    end if;
  elsif tg_op = 'DELETE' then
    if coalesce(old.pending_redemption_amount, 0) <= 0 then
      return old;
    end if;
  end if;

  select b.merchant_id into v_merchant_id
  from public.branches b
  where b.id = coalesce(old.branch_id, new.branch_id)
    and b.deleted_at is null;

  if v_merchant_id is null then
    return coalesce(new, old);
  end if;

  -- Re-fan-out the previous pending demand; the revoked/deleted row is
  -- already filtered out by `revoked_at IS NULL AND deleted_at IS NULL`.
  v_remaining := coalesce(old.pending_redemption_amount, 0);

  -- Clear the revoked row's pending so the walk starts clean.
  if tg_op = 'UPDATE' then
    new.pending_redemption_amount := 0;
  end if;

  -- Fan out the rest. We use the existing RPC (it filters by deleted_at
  -- and revoked_at, so the revoked row won't be in the result set).
  perform public.redemption_fan_out(
    coalesce(old.customer_id, new.customer_id),
    v_merchant_id,
    v_remaining
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_customer_credit_auto_shrink on public.customer_credit;
create trigger trg_customer_credit_auto_shrink
  before update of revoked_at, deleted_at on public.customer_credit
  for each row execute function public.redemption_auto_shrink();

-- ──────────────────────────────────────────────────────────────────────────
-- 13. Grants
-- ──────────────────────────────────────────────────────────────────────────
grant execute on function public.get_customer_leaderboard(bigint, bigint, text, bigint, bigint, int, int) to authenticated, service_role;
grant execute on function public.get_customer_leaderboard_count(bigint, bigint, bigint, bigint) to authenticated, service_role;
grant execute on function public.get_distinct_customer_count(bigint, bigint) to authenticated, service_role;
grant execute on function public.get_customers(bigint, bigint, text, int, int) to authenticated, service_role;
grant execute on function public.redemption_fan_out(bigint, bigint, numeric) to service_role;
grant execute on function public.redemption_approve(bigint, bigint, bigint) to service_role;
grant execute on function public.redemption_reject(bigint, bigint) to service_role;