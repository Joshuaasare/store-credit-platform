---
name: webapp-typecheck-baseline
description: main-webapp typecheck has pre-existing failures unrelated to feature work — verify new code passes by diffing errors against the baseline before chasing them.
metadata:
  type: project
---

`npx nx typecheck main-webapp` has pre-existing failures that are NOT caused by feature code. Confirmed baseline errors present at HEAD of `feature/setup-customer-management` (2026-07-15):

1. `tsconfig.spec.json(2,3): error TS5069: Option 'emitDeclarationOnly' cannot be specified without specifying option 'declaration' or option 'composite'.` — spec config bug.
2. `src/app/app.tsx(6,19)` and `(7,23): error TS1261` — casing conflict between `./pages/Auth/Login` import casing (uppercase, in app.tsx) and the actual directory `pages/auth/` (lowercase, on disk). macOS HFS+ is case-insensitive so it works at runtime; tsc strict flags it.
3. `src/app/shared/lib/__mocks__/supabase.ts` — `error TS2708: Cannot use namespace 'jest' as a value.` — pre-existing test mock file.

**Why:** The user expects typecheck on changed code to pass; they do not expect you to fix unrelated pre-existing infrastructure. Wasting time chasing these slows delivery.

**How to apply:** After running `npx nx typecheck main-webapp`, filter the output to errors that mention files you actually touched. Only fix those. Leave the rest in the report under "pre-existing baseline failures." Same approach for `main-backend` — the TS6305 "Output file 'X.d.ts' has not been built from source file 'X.ts'" errors in `*.spec.ts` files appear when `dist/` is stale; clean with `rm -rf apps/main-backend/dist apps/main-backend/out-tsc` and re-run before treating them as real.