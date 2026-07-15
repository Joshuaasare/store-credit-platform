-- My Store v1 — schema augmentations
-- Approved subset of Initial_plan_v1.md §1.3
--
-- Adds:
--   merchants.credit_pool_limit        numeric, nullable
--   merchants.credit_pool_used         numeric, not null, default 0
--   customer_transactions.transaction_type  enum (purchase | credit_redeem | credit_adjustment), default 'purchase'
--   customer_transactions.credit_generated  numeric, nullable
--   customer_transactions.credit_redeemed   numeric, nullable
--   branches.is_active                 boolean, not null, default true
--
-- Notes:
--   - branches.name is intentionally left nullable (legacy). The form requires 2–80 chars;
--     existing null rows render as "Unnamed branch" in the UI.

-- 1. merchants: credit pool columns
alter table public.merchants
  add column if not exists credit_pool_limit numeric,
  add column if not exists credit_pool_used  numeric not null default 0;

-- 2. customer_transactions: type + issued/redeemed breakdown
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

alter table public.customer_transactions
  add column if not exists transaction_type public.transaction_type not null default 'purchase',
  add column if not exists credit_generated numeric,
  add column if not exists credit_redeemed   numeric;

-- 3. branches: is_active flag (v1 forms do not toggle it; column is forward-looking)
alter table public.branches
  add column if not exists is_active boolean not null default true;