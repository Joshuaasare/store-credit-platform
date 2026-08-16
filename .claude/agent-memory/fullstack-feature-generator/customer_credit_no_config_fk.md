---
name: customer-credit-no-config-fk
description: customer_credit has no FK to running_credit_config or fixed_credit_config — credit_type ("running" vs "fixed") is not derivable from the row alone.
metadata:
  type: project
---

`customer_credit` does NOT link to `running_credit_config` or `fixed_credit_config` via any FK or `config_group_id`. The new `customerCredits.service.getMyCredits` defaults `credit_type` to `"running"` because only `issueRunningCreditsForPurchase` (in `creditConfig.service.ts`) writes to `customer_credit` today — there is no fixed-issuance flow yet.

**Why:** The post-re-architecture schema (see [[purchase-credit-redemption-rearchitecture]]) deliberately dropped the denormalized `credit_type` / `percentage_credit_value` / `maximum_allowed_credit` columns from `customer_credit`. Those fields stay on the issuing config; the credit row only carries `credit_amount` + `expires_at` + revocation metadata. There is no `config_group_id` on `customer_credit` either, so the originating config is not identifiable from the row.

**How to apply:** When a fixed-issuance flow is added (or any feature that needs to distinguish running vs fixed credits server-side), either:
1. Add a `credit_type` + `config_group_id` column to `customer_credit` via the consolidated migration (`supabase/migrations/20260724000000_consolidated_schema.sql`) and update `BASE_CUSTOMER_CREDIT` + `BaseCustomerCredit`, OR
2. Insert with `credit_type: "fixed"` from the new issuance flow and read it back directly.

Until then, `credit_type: "running"` is a server-side heuristic, not a stored field. See [[database-types-hand-edits]] for the related constraint that you can't add a column to `database.types.ts` without applying the migration to dev Supabase.