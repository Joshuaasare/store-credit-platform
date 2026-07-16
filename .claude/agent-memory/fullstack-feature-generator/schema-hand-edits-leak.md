---
name: schema-hand-edits-leak
description: Regenerating main.schema.ts via yarn generate:types strips hand-edited fields from BaseMerchant/UpdateMerchantRequest — re-add them in main.types.ts/merchant.types.ts first.
metadata:
  type: project
---

The repo's `apps/main-backend/src/app/schemas/main.schema.ts` and `merchant.schema.ts` had been hand-edited in the past to add `logo_url` / `cover_photo_url` (and `BaseMerchant` credit_pool fields handled via `MerchantWithStats`) WITHOUT corresponding entries in the source `main.types.ts` / `merchant.types.ts`. `merchant.service.ts` reads `merchant.logo_url` / `merchant.cover_photo_url` and writes `payload.logo_url` / `payload.cover_photo_url`, so it depends on those fields being present.

**Why:** Running `yarn generate:types` regenerates `main.schema.ts` / `merchant.schema.ts` from the source `.types.ts` files and silently drops the hand-edited fields, which surfaces as `TS2353` / `TS2339` errors in `merchant.service.ts` even though the customer refactor itself is clean. The user's stated baseline is "typecheck passing" — this baseline was being held up by the hand-edits, not by the source types.

**How to apply:** Before running `yarn generate:types` on any change that touches `main.types.ts`, audit `git show HEAD:apps/main-backend/src/app/schemas/*.schema.ts` for fields present in the generated schemas but absent from the source `.types.ts` files. Add the missing fields to the source types (e.g. `BaseMerchant.logo_url`, `BaseMerchant.cover_photo_url`, `UpdateMerchantRequest.logo_url`, `UpdateMerchantRequest.cover_photo_url`) BEFORE regenerating, so the typecheck baseline is preserved. Related: [[type-first-workflow]] [[database-types-hand-edits]].