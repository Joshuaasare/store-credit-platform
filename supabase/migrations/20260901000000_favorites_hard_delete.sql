-- Favorites are hard-deleted on unfavorite (no soft-delete rows), so a plain
-- unique index per (customer, config) is all the idempotency the upsert needs.
drop index if exists public.customer_running_config_favorites_unique_active;
drop index if exists public.customer_fixed_config_favorites_unique_active;

create unique index if not exists customer_running_config_favorites_unique
  on public.customer_running_config_favorites (customer_id, running_config_id);

create unique index if not exists customer_fixed_config_favorites_unique
  on public.customer_fixed_config_favorites (customer_id, fixed_config_id);