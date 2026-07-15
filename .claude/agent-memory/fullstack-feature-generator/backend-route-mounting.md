---
name: backend-route-mounting
description: Backend routes auto-load with NO `/api` prefix; auth mounts at `/auth/...`, new feature routes mount at `/<feature>/...`
metadata:
  type: project
---

`apps/main-backend/src/app/app.ts` registers `@fastify/autoload` on the `routes/` directory. There is no global prefix configured. So:
- `routes/auth/index.ts` → `/auth/otp/send`, `/auth/otp/verify`, `/auth/refresh`, `/auth/logout`, `/auth/sessions`, `/auth/me`
- `routes/merchants/index.ts` → `/merchants/me`, etc.
- `routes/branches/index.ts` → `/branches`, `/branches/:id`
- `routes/root.ts` → `/`

The frontend `libs/api-services/src/services/apiService.ts` uses `API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001"` and calls `${API_BASE_URL}${endpoint}` where endpoint starts with `/auth/...` or `/merchants/...` (no `/api`). CORS is configured to allow `http://localhost:4200`.

**Why:** Plans written as "GET /api/merchants/me" are conceptual — the actual mounted path is `/merchants/me`. Matching the existing convention keeps the frontend apiService consistent.

**How to apply:** New feature routes go in `routes/<feature>/index.ts` and the frontend apiService calls them as `/<feature>/...`. Do NOT add an `/api` prefix. The vite proxy only forwards `/auth` (and the apiService bypasses the proxy anyway by using an absolute URL).