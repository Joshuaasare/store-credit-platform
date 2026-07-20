-- Merchant Credit Config — schema augmentations
--
-- Adds:
--   enum cumulative_scope_type        (per_branch | merchant_wide)
--   enum credit_stacking_policy_type   (stack | best_only)
--   running_credit_config.config_group_id        uuid, not null, default gen_random_uuid()
--   running_credit_config.cumulative_scope       cumulative_scope_type, not null, default 'per_branch'
--   fixed_credit_config.config_group_id          uuid, not null, default gen_random_uuid()
--   merchants.credit_stacking_policy             credit_stacking_policy_type, not null, default 'stack'
--   partial indexes on running/fixed_credit_config (branch_id) and (config_group_id) where deleted_at is null
--   hot-path index on customer_transactions (branch_id, transaction_date, transaction_type) where deleted_at is null
--
-- Multi-branch configs are denormalized: one row per branch sharing a config_group_id.

-- 1. Enum types
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

-- 2. running_credit_config augmentations
alter table public.running_credit_config
  add column if not exists config_group_id uuid not null default gen_random_uuid(),
  add column if not exists cumulative_scope public.cumulative_scope_type not null default 'per_branch';

create index if not exists idx_running_credit_config_branch
  on public.running_credit_config (branch_id)
  where deleted_at is null;

create index if not exists idx_running_credit_config_group
  on public.running_credit_config (config_group_id)
  where deleted_at is null;

-- 3. fixed_credit_config augmentations
alter table public.fixed_credit_config
  add column if not exists config_group_id uuid not null default gen_random_uuid();

create index if not exists idx_fixed_credit_config_branch
  on public.fixed_credit_config (branch_id)
  where deleted_at is null;

create index if not exists idx_fixed_credit_config_group
  on public.fixed_credit_config (config_group_id)
  where deleted_at is null;

-- 4. merchants augmentation
alter table public.merchants
  add column if not exists credit_stacking_policy public.credit_stacking_policy_type not null default 'stack';

-- 5. customer_transactions hot-path index for cumulative-spend lookback
create index if not exists idx_customer_transactions_cumulative
  on public.customer_transactions (branch_id, transaction_date, transaction_type)
  where deleted_at is null;