-- Customer Management v1 — leaderboard RPC functions
--
-- Adds two SECURITY INVOKER-friendly SQL functions for the Customers leaderboard:
--   get_customer_leaderboard(merchant_id, branch_id?, sort, start_epoch?, end_epoch?, limit, offset)
--   get_customer_leaderboard_count(merchant_id, branch_id?, start_epoch?, end_epoch?)
--
-- Notes:
--   - `amount` is canonical per `transaction_type` (`purchase` / `credit_issue` / `credit_redeem`).
--     `credit_generated` / `credit_redeemed` columns are deprecated and intentionally ignored here.
--   - `transaction_date` is Unix epoch seconds (bigint).
--   - Merchant scoping is enforced by joining `customer_transactions` → `branches` on `branch_id`
--     and filtering `branches.merchant_id = p_merchant_id`.
--   - Customer name resolves from `users.surname + ' ' + other_names` when `customers.user_id` is
--     linked; otherwise "Unnamed customer".
--   - Tiebreak: `customer_id ASC` so pagination ordering is deterministic.

-- 1. Leaderboard rows
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
  with filtered_tx as (
    select t.customer_id, t.branch_id, t.amount, t.transaction_type
    from public.customer_transactions t
    join public.branches b on b.id = t.branch_id
    where b.merchant_id = p_merchant_id
      and t.deleted_at is null
      and (p_branch_id   is null or t.branch_id        = p_branch_id)
      and (p_start_epoch is null or t.transaction_date >= p_start_epoch)
      and (p_end_epoch   is null or t.transaction_date <= p_end_epoch)
  ),
  agg as (
    select
      customer_id,
      coalesce(sum(amount) filter (where transaction_type = 'purchase'),       0) as total_purchases,
      coalesce(sum(amount) filter (where transaction_type = 'credit_issue'),    0) as total_credits_issued,
      coalesce(sum(amount) filter (where transaction_type = 'credit_redeem'),    0) as total_credits_redeemed,
      count(*) as transaction_count
    from filtered_tx
    group by customer_id
  ),
  -- Pick a single representative branch_id per customer (the branch of their latest transaction in window)
  branch_pick as (
    select distinct on (customer_id) customer_id, branch_id
    from filtered_tx
    order by customer_id, branch_id desc
  )
  select
    c.id                                as customer_id,
    c.phone                             as phone,
    c.user_id                           as user_id,
    coalesce(nullif(trim(coalesce(u.surname, '') || ' ' || coalesce(u.other_names, '')), ''), 'Unnamed customer') as customer_name,
    bp.branch_id                        as branch_id,
    a.total_purchases                   as total_purchases,
    a.total_credits_issued              as total_credits_issued,
    a.total_credits_redeemed            as total_credits_redeemed,
    a.transaction_count                 as transaction_count
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

-- 2. Total distinct customer count (for hasNextPage)
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
  select count(distinct t.customer_id)
  from public.customer_transactions t
  join public.branches b on b.id = t.branch_id
  where b.merchant_id = p_merchant_id
    and t.deleted_at is null
    and (p_branch_id   is null or t.branch_id        = p_branch_id)
    and (p_start_epoch is null or t.transaction_date >= p_start_epoch)
    and (p_end_epoch   is null or t.transaction_date <= p_end_epoch);
$$;

-- Grant execute to authenticated + service_role
grant execute on function public.get_customer_leaderboard(bigint, bigint, text, bigint, bigint, int, int) to authenticated, service_role;
grant execute on function public.get_customer_leaderboard_count(bigint, bigint, bigint, bigint) to authenticated, service_role;