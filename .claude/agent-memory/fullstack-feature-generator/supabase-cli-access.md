---
name: supabase-cli-access
description: Supabase CLI is installed at /opt/homebrew/bin/supabase but NOT logged in; no Docker daemon; can't apply migrations or run type-gen from the live DB
metadata:
  type: project
---

`supabase` CLI v2.75.0 is installed at `/opt/homebrew/bin/supabase` but:
- `supabase login` has not been run (no access token in `~/.supabase/`).
- No Docker daemon running, so `supabase db start` (local Postgres) doesn't work.
- Therefore `supabase db push`, `supabase migration`, `supabase type gen` against the remote project are all unavailable without user intervention.

Project DB is `erbjmlspdpznihcnknxw.supabase.co` (see `apps/main-backend/.env`).

**Why:** The user's DB migrations need manual application. Previous sessions assumed the columns existed; they did not.

**How to apply:** When a feature needs new DB columns, write a SQL migration file in `supabase/migrations/<timestamp>_<name>.sql` and report to the user that they must run:
```
supabase login
supabase link --project-ref erbjmlspdpznihcnknxw
supabase db push
```
Then hand-edit `apps/main-backend/src/app/types/database.types.ts` to mirror the new columns so downstream code type-checks. Clearly tell the user that `database.types.ts` was hand-edited and they should regenerate it with `supabase type gen` once they have DB access. See [[type-first-workflow]] for the impact on `auth.schema.ts` etc.