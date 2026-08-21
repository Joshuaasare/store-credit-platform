---
name: fixed-credit-config-promo-banner
description: fixed_credit_config repurposed from credit-issuing config to promotional banner config (title/description/images/start/end/terms); credit_type/fixed_credit_value/percentage_credit_value/maximum_allowed_credit columns dropped.
metadata:
  type: project
---

`fixed_credit_config` was repurposed from a credit-issuing config to a promotional banner config. The migration in `supabase/migrations/20260724000000_consolidated_schema.sql` section 6 now drops `credit_type`, `fixed_credit_value`, `percentage_credit_value`, `maximum_allowed_credit` and adds `title`, `description`, `images` (jsonb of string URLs), `start_date`, `end_date` (bigint epoch ms). `terms` and `config_group_id` are retained.

**Why:** the fixed config was never actually issuing credits (it was a "passive registry"); the user leaned into that and turned it into a promo banner with images. The running_credit_config half still issues credits and is untouched.

**How to apply:**
- The fixed half of `creditConfig.service.ts` (groupFixedRows, normalizeFixedValues, create/update/deleteFixedConfig) no longer touches credit_type/value fields; `images` is a `string[] | null` invariant on a `Json | null` DB column (narrowing cast is intentional).
- `deleteFixedConfig` and `updateFixedConfig` now garbage-collect orphaned image files in the `store-assets` bucket via `storageService.deleteFiles` + `extractPathFromUrl`. In `updateFixedConfig`, image diff only runs when `payload.images` is an explicit array — null means "leave existing alone".
- `merchant.service.ts updateMyMerchant` now best-effort deletes the previous `logo_url`/`cover_photo_url` from `store-assets` when the payload replaces them (try/catch logs but doesn't throw).
- `BaseFixedCreditConfig.config_group_id` stays `string` (non-null) in app types, but the DB Row is `string | null` (user hand-edit) — `groupFixedRows` filters nulls defensively.
- `ConfigSummary.tsx` only exports `RunningConfigSummary` now; `FixedConfigSummary` was removed. `FixedConfigCard`/`FixedConfigDialog` no longer use FlipCard or credit-type UI; they render title/description/image thumbnails/window/terms.
- The typebox `maxLength` guards on `CreateFixedCreditConfigRequest.title` (120) / `description` (1000) are HAND-APPLIED in `creditConfig.schema.ts` — regenerating with `yarn generate:types` strips them (per [[schema-hand-edits-leak]]); re-apply after regen.
- `FixedConfigDialog` create-flow uploads images to a temp folder (`promo-images/temp/<clientUuid>`) because the backend mints `config_group_id` server-side; edit-flow uses the real group's folder.