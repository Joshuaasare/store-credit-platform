---
name: backend-local-boot
description: How to boot main-backend locally for a smoke check — required env vars and the serve target.
metadata:
  type: reference
---

To smoke-boot the backend (confirm Fastify autoload registers routes without errors) without a real Supabase:

```sh
SUPABASE_URL=http://localhost:5432 \
SUPABASE_SECRET_KEY=dummy \
SUPABASE_ANON_KEY=dummy \
ACCESS_TOKEN_SECRET=access_dev_secret_at_least_32_chars \
REFRESH_TOKEN_SECRET=refresh_dev_secret_at_least_32_chars \
HOST=localhost PORT=3099 \
npx nx serve main-backend
```

The serve target is `npx nx serve main-backend` (defined in `apps/main-backend/package.json` under `nx.targets.serve`, executor `@nx/js:node`, depends on `build`). No `package.json` script in the root. The dev configuration watches and rebuilds on change.

**Why:** `apps/main-backend/src/app/utils/supabase.client.ts` throws on import if `SUPABASE_URL` / `SUPABASE_SECRET_KEY` are missing. `apps/main-backend/src/app/services/token.service.ts` throws on import if `ACCESS_TOKEN_SECRET` / `REFRESH_TOKEN_SECRET` are missing. No `.env` file is committed to the repo, so a bare `npx nx serve main-backend` exits with code 1 immediately after "Environment configuration loaded".

**How to apply:** For a smoke check, run the command above in the background, wait ~12–15s, then `pkill -f main-backend` to stop. Look for `Server listening at http://...` and `[ ready ] http://localhost:3099` in the output — that confirms all autoloaded routes (including new ones under `apps/main-backend/src/app/routes/<feature>/`) registered without throwing. Any route-registration error surfaces as a stack trace before the listening line.