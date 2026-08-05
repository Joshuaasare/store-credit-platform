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
-- 7. customer_credit_redemptions: credit_id FK + remaining-credit index
-- ──────────────────────────────────────────────────────────────────────────
-- `credit_id` is the only FK the redemption table needs — customer_id and
-- branch_id are reached via credit_id → customer_credit (the schema is
-- normalized this way; we don't denormalize them onto redemptions).
-- `add column if not exists` is idempotent — safe whether or not credit_id
-- has been added manually.
alter table public.customer_credit_redemptions
  add column if not exists credit_id bigint not null references public.customer_credit(id) on delete cascade;

-- Approved-redemption aggregation per credit (used by "remaining credit" calc:
-- remaining = customer_credit.credit_amount − SUM(approved redemptions)).
create index if not exists idx_customer_credit_redemptions_credit_approved
  on public.customer_credit_redemptions (credit_id)
  where approved_at is not null and deleted_at is null;

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

-- ──────────────────────────────────────────────────────────────────────────
-- 9. Leaderboard RPCs
-- ──────────────────────────────────────────────────────────────────────────
-- Source tables (after the purchase/credit/redemption re-architecture):
--   - customer_purchases              (kind = 'purchase')
--   - customer_credit                  (kind = 'credit_issue', credit_amount column)
--   - customer_credit_redemptions      (kind = 'credit_redeem', amount_redeemed column;
--                                      customer_id / branch_id reached via
--                                      credit_id → customer_credit)
--
-- `transaction_date` is Unix epoch seconds (bigint) on customer_purchases.
-- customer_credit and customer_credit_redemptions only have a timestamptz
-- `created_at`, so we synthesize an epoch via EXTRACT(EPOCH FROM created_at)::bigint
-- when applying the date filter.
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
      and (p_start_epoch is null or (extract(epoch from c.created_at)::bigint) >= p_start_epoch)
      and (p_end_epoch   is null or (extract(epoch from c.created_at)::bigint) <= p_end_epoch)
  ),
  redemption_agg as (
    select c.customer_id, c.branch_id, r.amount_redeemed as amount
    from public.customer_credit_redemptions r
    join public.customer_credit c on c.id = r.credit_id
    join merchant_branches mb on mb.id = c.branch_id
    where r.deleted_at is null and r.approved_at is not null
      and c.deleted_at is null and c.revoked_at is null
      and (p_start_epoch is null or (extract(epoch from r.created_at)::bigint) >= p_start_epoch)
      and (p_end_epoch   is null or (extract(epoch from r.created_at)::bigint) <= p_end_epoch)
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
    coalesce(nullif(trim(coalesce(u.surname, '') || ' ' || coalesce(u.other_names, '')), ''), 'Unnamed customer') as customer_name,
    bp.branch_id as branch_id,
    a.total_purchases        as total_purchases,
    a.total_credits_issued   as total_credits_issued,
    a.total_credits_redeemed as total_credits_redeemed,
    a.transaction_count      as transaction_count
  from agg a
  left join public.customers c on c.id = a.customer_id
  left join public.users     u on u.id = c.user_id
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
      and (p_start_epoch is null or (extract(epoch from c.created_at)::bigint) >= p_start_epoch)
      and (p_end_epoch   is null or (extract(epoch from c.created_at)::bigint) <= p_end_epoch)
  ),
  redemption_ids as (
    select c.customer_id from public.customer_credit_redemptions r
    join public.customer_credit c on c.id = r.credit_id
    join merchant_branches mb on mb.id = c.branch_id
    where r.deleted_at is null and r.approved_at is not null
      and c.deleted_at is null and c.revoked_at is null
      and (p_start_epoch is null or (extract(epoch from r.created_at)::bigint) >= p_start_epoch)
      and (p_end_epoch   is null or (extract(epoch from r.created_at)::bigint) <= p_end_epoch)
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
             nullif(trim(coalesce(u.surname, '') || ' ' || coalesce(u.other_names, '')), ''),
             'Unnamed customer'
           ) as customer_name
    from scoped_customers sc
    join public.customers c on c.id = sc.customer_id
    left join public.users  u on u.id = c.user_id
    where p_search is null
       or c.phone ilike '%' || p_search || '%'
       or u.surname ilike '%' || p_search || '%'
       or coalesce(u.other_names, '') ilike '%' || p_search || '%'
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
  redemption_per_credit as (
    select r.credit_id,
           coalesce(sum(r.amount_redeemed), 0) as redeemed_total
    from public.customer_credit_redemptions r
    where r.deleted_at is null and r.approved_at is not null
    group by r.credit_id
  ),
  credit_agg as (
    select c.customer_id,
           coalesce(
             sum(greatest(0, c.credit_amount - coalesce(rpc.redeemed_total, 0))),
             0
           ) as available_credits,
           count(*) filter (
             where greatest(0, c.credit_amount - coalesce(rpc.redeemed_total, 0)) > 0
           )::bigint as live_credit_count,
           max(extract(epoch from c.created_at)::bigint) as last_credit_epoch
    from public.customer_credit c
    join merchant_branches mb on mb.id = c.branch_id
    left join redemption_per_credit rpc on rpc.credit_id = c.id
    where c.deleted_at is null
      and c.revoked_at is null
      and (c.expires_at is null
           or c.expires_at > extract(epoch from now())::bigint)
    group by c.customer_id
  ),
  redemption_agg as (
    select c.customer_id,
           max(extract(epoch from r.created_at)::bigint) as last_redemption_epoch
    from public.customer_credit_redemptions r
    join public.customer_credit c on c.id = r.credit_id
    join merchant_branches mb on mb.id = c.branch_id
    where r.deleted_at is null and r.approved_at is not null
      and c.deleted_at is null and c.revoked_at is null
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
-- 12. Grants
-- ──────────────────────────────────────────────────────────────────────────
grant execute on function public.get_customer_leaderboard(bigint, bigint, text, bigint, bigint, int, int) to authenticated, service_role;
grant execute on function public.get_customer_leaderboard_count(bigint, bigint, bigint, bigint) to authenticated, service_role;
grant execute on function public.get_distinct_customer_count(bigint, bigint) to authenticated, service_role;
grant execute on function public.get_customers(bigint, bigint, text, int, int) to authenticated, service_role;