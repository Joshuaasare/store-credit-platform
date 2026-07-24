---
name: purchase-credit-redemption-rearchitecture
description: customer_transactions table has been removed; purchases/credits/redemptions now live in three separate tables (customer_purchases, customer_credit, customer_credit_redemptions).
metadata:
  type: project
---

As of 2026-07-23 the Store Credit Platform re-architected the purchase → credit → redemption flow. The single `customer_transactions` table is gone; three tables now own the data:

- `customer_purchases` — every purchase (replaces `customer_transactions` rows where `transaction_type='purchase'`). Columns: `amount`, `branch_id`, `customer_id`, `recorded_by_user_id`, `transaction_date` (epoch), soft-delete.
- `customer_credit` — issued credit. Now stores ONLY the calculated GHS amount (`credit_amount`) + expiry + revocation metadata. The old `credit_type` / `credit_precentage` / `max_credit_amount` columns are gone — the originating config is identified by `branch_id` + the merchant's `running_credit_config` rows.
- `customer_credit_redemptions` — redemptions. Has `amount_redeemed`, `approved_at`, `approved_by_user_id`. The user's new schema omitted `credit_id`, so migration `20260723000000_purchase_credit_redemption_flow.sql` adds `credit_id` / `customer_id` / `branch_id` FKs to it (redemptions must reference a specific customer_credit row).

**Why:** the user wants the calculated credit amount stored once at issuance; remaining credit = `credit_amount − SUM(approved redemptions)`. The `approved_at` column is there for a future customer-initiated approval flow — for now the webapp auto-approves on creation.

**How to apply:** when touching this flow, write to the three tables separately; do not look for a `customer_transactions` table. The leaderboard / count RPCs were rewritten in the same migration to UNION across the three new tables. The `getTransactions` endpoint synthesizes a `CustomerTransactions`-shaped row (with `transaction_type` enum + optional `credit_id`) from the union so the frontend activity feed did not need a row-type change. Related: [[type-first-workflow]], [[database-types-hand-edits]].