---
name: database-types-hand-edits
description: When the user says "do not regenerate database.types.ts", hand-edits to database.types.ts are acceptable — incl. adding Functions (RPCs), widening nullable columns, and adjusting Insert/Update types to match real-world DB behavior.
metadata:
  type: project
---

The user's pre-flight instructions for the Customer Management feature explicitly permitted hand-editing `apps/main-backend/src/app/types/database.types.ts` (and forbade running `supabase gen types` / `yarn generate:types`). Confirmed acceptable edits:

- Adding RPC signatures to `public.Functions` so `supabaseAdmin.rpc(...)` typechecks (otherwise rpc names are `never`).
- Widening `branch_customer.Insert.deleted_at` from `string` to `string | null` (column is NOT NULL in schema, but app intentionally inserts NULL to mark an "active" link — soft-delete uses a timestamp).
- Widening `branch_customer.Update.deleted_at` similarly so reactivation via `.update({ deleted_at: null })` typechecks.

**Why:** The repo has no supabase project-id configured locally (see [[supabase-cli-access]]), so the type-gen command can't be run end-to-end. Hand-editing is the pragmatic path; the user accepts the divergence and will reconcile on the next real migration.

**How to apply:** When adding RPC functions or facing a NOT-NULL-but-actually-nullable column mismatch, edit `database.types.ts` directly rather than blocking on codegen. Mirror the existing TypeBox-Static shapes the user expects. Do NOT touch the auto-generated `libs/api-services/src/types/api.types.ts` or `apps/main-webapp/src/app/shared/types/api.types.ts` — those are stamped with "DO NOT EDIT MANUALLY" but are themselves stale duplicates; the user prefers new feature types live in a separate `customer.types.ts` rather than editing the generated file.