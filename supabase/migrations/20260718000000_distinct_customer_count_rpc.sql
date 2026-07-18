-- Customer Management v1 — distinct customer count RPC
--
-- Replaces the client-side `Set(customer_id).size` dedup used by
-- branch.service.ts and merchant.service.ts with a server-side aggregate.
--
--   get_distinct_customer_count(p_merchant_id, p_branch_id?)
--     - p_branch_id NULL  → distinct customers across ALL of the merchant's branches
--     - p_branch_id set   → distinct customers who have transacted at that branch
--
-- Notes:
--   - Source of truth is `customer_transactions.customer_id` (the `branch_customer`
--     junction has been dropped). A "customer of a branch" = has ≥1 transaction
--     at that branch with `deleted_at IS NULL`.
--   - Merchant scoping is enforced by joining `customer_transactions` → `branches`
--     on `branch_id` and filtering `branches.merchant_id = p_merchant_id`, so a
--     caller cannot pass another merchant's branch_id to inflate the count.
--   - `transaction_date` is Unix epoch seconds (bigint).

create or replace function public.get_distinct_customer_count(
  p_merchant_id  bigint,
  p_branch_id    bigint default null
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
    and (p_branch_id is null or t.branch_id = p_branch_id);
$$;

grant execute on function public.get_distinct_customer_count(bigint, bigint) to authenticated, service_role;