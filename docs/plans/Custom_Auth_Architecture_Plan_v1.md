# Custom Phone + OTP Authentication System — Architecture Plan

> **Status:** Implemented
> **Scope:** Backend (`apps/main-backend`) + Frontend (`apps/main-webapp`) + Shared (`libs/api-services`)
> **Objective:** Replace the Supabase-Auth-dependent session layer with a fully custom, cryptographically secure JWT-based auth system while retaining the existing OTP delivery infrastructure.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Security Principles & Threat Model](#3-security-principles--threat-model)
4. [Architecture Overview](#4-architecture-overview)
5. [Database Schema](#5-database-schema)
6. [Token Strategy](#6-token-strategy)
7. [OTP Flow Hardening](#7-otp-flow-hardening)
8. [Session & Device Management](#8-session--device-management)
9. [Middleware & Authorization](#9-middleware--authorization)
10. [API Contract](#10-api-contract)
11. [Implementation Summary](#11-implementation-summary)
12. [Dependencies & Tooling](#12-dependencies--tooling)
13. [Environment Variables](#13-environment-variables)
14. [Migration Path](#14-migration-path)
15. [Open Questions](#15-open-questions)
16. [Appendices](#appendices)

---

## 1. Executive Summary

The system delegates session creation to a custom JWT token lifecycle, completely decoupled from Supabase Auth:

- **Access Tokens:** Short-lived JWTs (15 minutes) signed with HS256 using a 256-bit cryptographically random secret.
- **Refresh Tokens:** Opaque, high-entropy random strings (not JWTs) persisted in Postgres with metadata (device fingerprint, IP, expiry, rotation lineage). Stored in `httpOnly` cookies.
- **OTP Verification:** Remains phone-based, hardened with cryptographic RNG, HMAC-SHA256 hashing, attempt limiting (5 tries), and in-memory rate limiting (3 sends per 10 minutes per phone + IP).
- **Authorization:** Fastify `onRequest` hook (`requireAuth`) verifies the Bearer token, decodes claims, and attaches `request.user`.
- **Session Revocation:** `/logout` invalidates the refresh token; `/sessions` lets users see and revoke active sessions by JTI.

**Why not keep Supabase Auth?**

- It introduces an external dependency for the most critical security boundary.
- Deterministic passwords stored in an external system create a compliance and audit gap.
- Custom JWTs give us full control over claims, expiry, rotation, and revocation — essential for RBAC and multi-merchant features.

---

## 2. Current State Analysis

| Component | Status | Notes |
| --------- | ------ | ----- |
| `POST /auth/otp/send` | Working | Uses `crypto.randomInt()` for OTP generation. In-memory rate limiting. |
| `POST /auth/otp/verify` | Working | Issues custom JWT access token + opaque refresh token. Stores RT in `httpOnly` cookie. |
| `POST /auth/refresh` | Working | Rotates refresh token from `httpOnly` cookie, sets new cookie. |
| `POST /auth/logout` | Working | Revokes refresh token by hash and clears cookie. |
| `GET /auth/me` | Working | Validates token via `jose` JWT verification. |
| `GET /auth/sessions` | Working | Lists active refresh tokens for the authenticated user. |
| `POST /auth/sessions/:id/revoke` | Working | Revokes a specific session by its JTI. |
| `auth.middleware.ts` | Working | `requireAuth` verifies JWT via `TokenService.verifyAccessToken()`. `requireRoles` for RBAC. |
| OTP Store | In-memory `Map` | Acceptable for single-node deploys. |
| Rate Limiting | In-memory `Map` | Moved from DB-backed to in-memory to avoid schema drift issues. |

---

## 3. Security Principles & Threat Model

### Principles

1. **Defense in Depth:** OTP verification checks both the in-memory store _and_ the database-stored hash.
2. **Least Privilege:** Access tokens carry minimal claims (`sub`, `phone`, `roles[]`). No PII in JWT payload.
3. **Token Binding:** Refresh tokens are bound to a device fingerprint (hash of UA + IP). Rotation detects token theft.
4. **Fail Secure:** Any exception in the auth pipeline returns `401 Unauthorized`. Never leak whether a phone number exists.
5. **No Secrets in Code:** All cryptographic secrets live in environment variables. No fallbacks in production.
6. **httpOnly Cookies:** Refresh tokens are never exposed to JavaScript — mitigates XSS token theft.
7. **Memory-Only Access Tokens:** Access tokens live only in JS memory, not `localStorage` or cookies — mitigates XSS token exfiltration.

### Threat Model

| Threat | Mitigation |
| ------ | ---------- |
| OTP brute-force | 5 attempt limit, 10-minute window. |
| OTP replay | Single-use only; cleared from DB and memory on successful verification. |
| Token theft | Short-lived access tokens (15 min). Refresh tokens rotate on every use; old token invalidated. |
| Refresh token reuse (detected) | Entire token family revoked; user forced to re-authenticate with OTP. |
| Phone enumeration | OTP always "sent" (no-op for unknown numbers), identical response timing. |
| SMS interception (OTP leaked) | Nothing we can do at app layer; mitigation is short OTP lifetime (10 min). |
| Database breach | No user passwords stored. Refresh tokens are hashed with SHA-256 before storage. |
| JWT secret compromise | Immediate rotation capability. Access tokens are short-lived, limiting blast radius. |
| XSS | Access token in memory only (not `localStorage`). Refresh token in `httpOnly` cookie. |
| CSRF | Refresh token is in `httpOnly` cookie with `SameSite=strict`, mitigating CSRF. |

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Web / Mobile)                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐  │
│  │   Login      │   │  Verify OTP  │   │  API Calls   │   │   Logout     │  │
│  │ (phone only) │   │ (phone+OTP)  │   │ + Bearer     │   │ (revoke RT)  │  │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘  │
└─────────┼──────────────────┼──────────────────┼──────────────────┼──────────┘
          │ POST /auth/otp/send│ POST /auth/otp/verify│ GET /auth/...  │ POST /auth/logout
          │                  │ → returns AT      │ + Authorization│ → revoke RT
          │                  │ → sets RT cookie  │                │ → clear cookie
          ▼                  ▼                  ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FASTIFY BACKEND                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────────────┐ │
│  │ OTP Service │  │ Auth Service│  │ JWT Service │  │ requireAuth Hook   │ │
│  │ - generate  │  │ - verify    │  │ - sign AT   │  │ - verify AT        │ │
│  │ - hash      │  │ - lookup    │  │ - verify AT │  │ - attach req.user  │ │
│  │ - rate limit│  │ - issue     │  │ - rotate RT │  │ - RBAC checks      │ │
│  │ - send SMS  │  │   tokens    │  │ - revoke    │  │                    │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────────────────────┘ │
│         └──────────────────┴──────────────────┘                              │
│                              │                                             │
│                              ▼                                             │
│                    ┌─────────────────┐                                     │
│                    │  SUPABASE DB    │                                     │
│                    │  - users        │                                     │
│                    │  - refresh_tokens│ (new)                              │
│                    │  - staff_user_roles│                                  │
│                    └─────────────────┘                                     │
└────────────────────────────────────────────────────────────────────────────┘
```

**Key Design Decision:** No `/api` prefix on endpoints. AutoLoad registers routes under the folder name, so `/auth/*` is the canonical path.

---

## 5. Database Schema

### 5.1 `refresh_tokens`

Stores refresh token metadata. The actual token is never stored plaintext — only a SHA-256 hash.

```sql
CREATE TABLE refresh_tokens (
  jti             TEXT PRIMARY KEY,      -- JWT ID / opaque token ID (UUID)
  user_id         UUID NOT NULL REFERENCES users(id),
  token_hash      TEXT NOT NULL,         -- SHA-256 of the opaque token string
  family_id       UUID NOT NULL,         -- rotation family for theft detection
  parent_jti      TEXT,                  -- previous token in rotation chain
  device_fingerprint TEXT NOT NULL,
  ip_address      INET,
  issued_at       TIMESTAMPTZ DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ,
  replaced_at     TIMESTAMPTZ,           -- when rotated to a child token
  replaced_by_jti TEXT
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_family ON refresh_tokens(family_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at) WHERE revoked_at IS NULL;
```

**Note:** The `jti` column is the PRIMARY KEY — not `id`. The application generates `jti = crypto.randomUUID()` for each token.

### 5.2 `rate_limit_log` (legacy)

The original table exists in the DB schema but is **not used** by the application. Rate limiting was moved to an in-memory `Map` implementation to avoid schema drift issues (the actual table was missing columns like `attempts`, `window_start`).

```sql
-- Legacy table (columns: id, phone, ip_address, action, attempted_at)
-- Application uses in-memory rate limiting instead.
```

### 5.3 Alter `users` table

The `users` table already has `otp`, `otp_expires_at`, `otp_attempts`, and `last_login_at` columns for OTP and audit purposes.

---

## 6. Token Strategy

### 6.1 Access Token (AT)

| Attribute | Value |
| --------- | ----- |
| Format | JWT (JWS) |
| Algorithm | HS256 |
| Secret | 256-bit (32-byte) base64-encoded random string (`ACCESS_TOKEN_SECRET`) |
| Lifetime | 15 minutes |
| Payload Claims | `sub` (user UUID), `phone`, `roles` (string[]), `iat`, `exp`, `iss`, `aud`, `jti` |
| Storage | Client memory only (React state / Zustand). **Never** `localStorage`. |

### 6.2 Refresh Token (RT)

| Attribute | Value |
| --------- | ----- |
| Format | Opaque string (256-bit / 43 chars base64url) |
| Storage | Hashed with SHA-256 in `refresh_tokens` table. Raw token sent to client via `httpOnly` cookie. |
| Lifetime | 7 days (configurable) |
| Rotation | **Mandatory** — every time RT is exchanged for a new AT+RT pair, the old RT is marked `replaced_at` and the new RT records `parent_jti`. |
| Theft Detection | If a used/replaced RT is presented again, the entire `family_id` is revoked. User must re-authenticate with OTP. |
| Cookie Config | `httpOnly: true`, `secure: "auto"`, `sameSite: "strict"`, `path: "/"`, `maxAge: 7 days` |

### 6.3 Token Service (`services/token.service.ts`)

```typescript
export class TokenService {
  static generateOpaqueToken(): { token: string; tokenHash: string; jti: string };
  static computeDeviceFingerprint(userAgent?: string, ip?: string): string;
  static signAccessToken(userId: string, phone: string | null, roles: string[]): Promise<string>;
  static verifyAccessToken(token: string): Promise<AccessTokenPayload>;
  static storeRefreshToken(tokenHash, jti, userId, familyId, deviceFingerprint, ipAddress?, parentJti?): Promise<void>;
  static findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null>;
  static findRefreshTokenByJti(jti: string): Promise<RefreshTokenRecord | null>;
  static revokeRefreshTokenByJti(jti: string): Promise<void>;
  static rotateRefreshToken(oldTokenHash: string, deviceFingerprint: string): Promise<{ token: string; tokenHash: string; familyId: string; userId: string }>;
  static markTokenAsReplaced(oldJti: string, newJti: string): Promise<void>;
  static revokeTokenFamily(familyId: string): Promise<void>;
  static revokeAllUserTokens(userId: string): Promise<void>;
  static listUserSessions(userId: string, currentTokenHash?: string): Promise<Session[]>;
  static cleanupExpiredTokens(): Promise<number>;
}
```

**Why `jose` over `jsonwebtoken`?**

- Native ESM support (matches our Fastify v5 / Node 20+ stack).
- Type-safe APIs with automatic algorithm validation (prevents `none` algorithm attacks).
- Built-in timing-safe comparisons.
- Actively maintained by Panva (OAuth/OIDC expert).

---

## 7. OTP Flow Hardening

### 7.1 Secure OTP Generation

Uses `crypto.randomInt(100000, 999999)` (Node 20+) for uniform distribution.

### 7.2 OTP Hashing

HMAC-SHA256 with `SERVER_AUTH_SECRET` as the pepper. The hash is stored in:

- In-memory Map (sub-10-minute lookup)
- `users.otp` column (defense in depth if memory is lost)

### 7.3 Rate Limiting

**Per-phone:** Max 3 OTP sends per 10-minute window.  
**Per-IP:** Max 5 OTP sends per 10-minute window.  
**Implementation:** In-memory `Map<string, RateLimitEntry>` with periodic cleanup. Moved away from DB-backed rate limiting due to schema mismatch on the actual Supabase instance.

### 7.4 Attempt Limiting

Max 5 verification attempts per OTP. After 5 failures, the OTP is purged from memory and DB.

### 7.5 Anti-Enumeration

Always return `{"success": true, "message": "OTP sent successfully"}` regardless of whether the phone number exists. **SMS is only dispatched if the user exists** — saving credits while preventing enumeration.

---

## 8. Session & Device Management

### 8.1 Device Fingerprint

Computed as `SHA-256(user-agent + ip)`.

- Used to bind refresh tokens to a device.
- If fingerprint changes significantly (e.g. user moves from WiFi to mobile data), the token family is revoked as a theft-detection measure.

### 8.2 Session Visibility

`GET /auth/sessions` — Returns active sessions for the current user:

```json
{
  "success": true,
  "data": [
    {
      "id": "jti-uuid",
      "device_fingerprint": "sha256-hash",
      "created_at": "2026-07-09T10:00:00Z",
      "expires_at": "2026-07-16T10:00:00Z",
      "revoked_at": null,
      "is_current": true
    }
  ]
}
```

Note: The API exposes `jti` as `id` for frontend compatibility.

### 8.3 Session Revocation

`POST /auth/sessions/:id/revoke` — Revokes a specific session by its JTI.

### 8.4 Global Logout

`POST /auth/logout` — Revokes the current refresh token by hash and clears the `httpOnly` cookie.

---

## 9. Middleware & Authorization

### 9.1 `requireAuth` Hook

```typescript
export async function requireAuth(request, reply) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return reply.code(401).send({ success: false, error: "Unauthorized" });
  }

  const token = authHeader.slice(7);
  const payload = await TokenService.verifyAccessToken(token);

  request.user = {
    sub: payload.sub,
    phone: payload.phone,
    roles: payload.roles,
  };
}
```

### 9.2 RBAC Decorator

```typescript
export function requireRoles(...allowedRoles: string[]) {
  return async (request, reply) => {
    if (!request.user)
      return reply.code(401).send({ success: false, error: "Unauthorized" });
    const hasRole = request.user.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole)
      return reply.code(403).send({ success: false, error: "Forbidden" });
  };
}
```

### 9.3 Fastify Plugin Registration

- `@fastify/cookie` is registered in `app.ts` with `REFRESH_TOKEN_SECRET`.
- Routes under `/auth/*` are public for OTP send/verify/refresh.
- All other routes use `preHandler: [requireAuth]` or `requireRoles(...)`.

---

## 10. API Contract

### Endpoints

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| `POST` | `/auth/otp/send` | Public | Send OTP (rate limited). |
| `POST` | `/auth/otp/verify` | Public | Verify OTP, return AT, set RT cookie. |
| `POST` | `/auth/refresh` | Public (via cookie) | Exchange RT cookie for new AT + RT cookie. |
| `POST` | `/auth/logout` | Public (via cookie) | Revoke RT by hash, clear cookie. |
| `GET`  | `/auth/me` | Bearer AT | Return current user profile + roles. |
| `GET`  | `/auth/sessions` | Bearer AT | List active sessions. |
| `POST` | `/auth/sessions/:id/revoke` | Bearer AT | Revoke a specific session by JTI. |

### Key Design Decisions

- **No `/api` prefix:** AutoLoad registers routes under the folder name. `/auth/*` is canonical.
- **Refresh token in cookie, not body:** The `/refresh` and `/logout` endpoints read the RT from the `httpOnly` cookie — the frontend never sends it manually.
- **Frontend uses absolute URLs:** `apiService.ts` hits `http://localhost:3001` directly. Vite dev proxy only proxies `/auth` → `:3001` for the browser's own `fetch` calls in `authStore.ts`.

---

## 11. Implementation Summary

### Phase 1: Foundation & Tooling (Completed)

1. Installed `jose` and `@fastify/cookie` in backend.
2. Added env vars: `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `TOKEN_ISSUER`, `TOKEN_AUDIENCE`.
3. Created `services/token.service.ts` with sign/verify/issue/rotate/revoke logic.
4. Updated `types/auth.types.ts` with new interfaces.
5. Ran `yarn generate:types`.

### Phase 2: OTP Hardening (Completed)

1. Replaced `Math.random()` OTP generation with `crypto.randomInt`.
2. Implemented in-memory rate limiting in `rateLimit.service.ts`.
3. Added anti-enumeration response normalization (success for all, SMS only for existing users).
4. Implemented attempt tracking (5 max per OTP).

### Phase 3: Custom Token Lifecycle (Completed)

1. Refactored `auth.service.verifyOtp()`:
   - Removed `supabaseAdmin.auth.signInWithPassword` call.
   - After OTP validation, queries user + roles from DB.
   - Calls `TokenService.signAccessToken()` and `TokenService.storeRefreshToken()`.
   - Sets `httpOnly` cookie for refresh token.
2. Implemented `POST /auth/refresh` — rotates token from cookie.
3. Implemented `POST /auth/logout` — revokes by hash from cookie.
4. Implemented `GET /auth/sessions` and `POST /auth/sessions/:id/revoke`.

### Phase 4: Middleware & Authorization (Completed)

1. Implemented `requireAuth` in `middleware/auth.middleware.ts` using `jose` JWT verification.
2. Implemented `requireRoles` decorator.
3. Registered `@fastify/cookie` in `app.ts`.
4. Refactored `GET /auth/me` to use `request.user`.
5. Removed all Supabase Auth client calls from backend.

### Phase 5: Frontend Sync (Completed)

1. Updated `apiService.ts` in `libs/api-services`:
   - Uses `credentials: "include"` for cookie transport.
   - `refreshToken()` and `logout()` no longer send RT in body.
2. Updated `authStore.ts`:
   - Access token stored in memory only (module-level variable).
   - `initialize()` tries silent refresh if no access token in memory.
   - After successful refresh, fetches current user via `createAuthService().getCurrentUser()`.
   - Added `isLoading` guard in `NavigateToDashboard` to prevent flash of login page.
3. Updated `vite.config.ts`:
   - Removed `/api` proxy.
   - Added `/auth` proxy to `http://localhost:3001`.
4. Added country selector (`PhoneInput` component) on login page — defaults to Ghana.

### Phase 6: Build Fixes (Completed)

1. Added `transformIgnorePatterns` for `jose` ESM to `jest.config.ts`.
2. Added `moduleNameMapper` for `@shared` alias in frontend Jest config.
3. Fixed route paths to remove `/api` prefix.

---

## 12. Dependencies & Tooling

### Backend Dependencies

```bash
yarn add jose                # JWT signing/verification
yarn add @fastify/cookie     # httpOnly cookie support
```

### Frontend Dependencies

No new auth-specific dependencies. Uses:
- `zustand` for state management (with `persist` middleware)
- `react-hook-form` for login form
- Custom `PhoneInput` component for country selection

---

## 13. Environment Variables

Add these to `apps/main-backend/.env`:

```bash
# ==============================================
# CUSTOM AUTH SECRETS (256-bit, base64-encoded)
# ==============================================
ACCESS_TOKEN_SECRET=FILL_WITH_CRYPTO_RANDOM_32_BYTES_BASE64
REFRESH_TOKEN_SECRET=FILL_WITH_CRYPTO_RANDOM_32_BYTES_BASE64

# ==============================================
# TOKEN CONFIGURATION
# ==============================================
ACCESS_TOKEN_TTL_MINUTES=15
REFRESH_TOKEN_TTL_DAYS=7
TOKEN_ISSUER=storecredit-api
TOKEN_AUDIENCE=storecredit-app

# ==============================================
# SECURITY
# ==============================================
SERVER_AUTH_SECRET=FILL_WITH_CRYPTO_RANDOM_32_BYTES_BASE64
```

**Important:** `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` MUST be different. `SERVER_AUTH_SECRET` (used for OTP HMAC) should also be distinct from the JWT secrets.

---

## 14. Migration Path

### Step 1: Cutover (Completed)

- Deployed backend with custom auth fully active.
- All existing clients re-authenticate with OTP (minimal friction).
- Removed Supabase Auth user creation logic (`ensureAuthUser`).

### Step 2: Cleanup (Completed)

- Removed `supabaseAdmin.auth.*` calls from backend.
- Removed `jwt-decode` or Supabase auth helpers from frontend if no longer used.
- Archived old `password.service.ts` methods that were Supabase-specific (`generateUserEmail`, `generateUserPassword`, `ensureAuthUser`).

---

## 15. Open Questions

1. **Do we need multi-device login?** (e.g., cashier logged in on tablet + phone simultaneously) — The architecture supports this via multiple refresh token families per user.
2. **Do we need an "admin force-logout" feature?** — Easy to add: admin calls `POST /admin/users/:id/revoke-sessions` which revokes all refresh token families for that user.
3. **Mobile app secure storage:** On React Native, should we use Expo SecureStore for the refresh token? Yes — recommended and aligned with the Expo stack. The backend already supports cookies, but mobile may prefer secure storage + manual header passing.
4. **IP address behind proxy:** If deployed behind Cloudflare or a load balancer, configure Fastify with `trustProxy: true` and read `X-Forwarded-For`.
5. **Should we add WebAuthn / passkeys in the future?** — Not in this plan, but architecture is forward-compatible. We can add a `webauthn_credentials` table later.

---

## Appendices

### Appendix A: JWT Access Token Payload Structure

```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "phone": "+233555123456",
  "roles": ["manager", "cashier"],
  "iat": 1752052800,
  "exp": 1752053700,
  "iss": "storecredit-api",
  "aud": "storecredit-app",
  "jti": "unique-token-id"
}
```

### Appendix B: Refresh Token Rotation Sequence

```
1. Client sends RT_1 cookie to POST /auth/refresh
2. Server verifies RT_1 hash in DB → valid, not revoked
3. Server marks RT_1 as replaced (replaced_at, replaced_by_jti = RT_2)
4. Server issues new AT_2 + RT_2
5. Server sets RT_2 as httpOnly cookie in response
6. Client stores AT_2 in memory, discards AT_1

If attacker later tries to use RT_1:
→ Server sees RT_1 is already replaced
→ Revokes entire family_id
→ All tokens in that family become invalid
→ Client (and attacker) must re-authenticate with OTP
```

### Appendix C: File Changes Summary

| File | Action |
| ---- | ------ |
| `apps/main-backend/src/app/services/token.service.ts` | **Created** — Core JWT and refresh token logic (JTI-based PK). |
| `apps/main-backend/src/app/services/auth.service.ts` | **Rewritten** — Remove Supabase Auth; integrate TokenService; anti-enumeration. |
| `apps/main-backend/src/app/services/rateLimit.service.ts` | **Created** — In-memory rate limiting (replaced DB-backed approach). |
| `apps/main-backend/src/app/middleware/auth.middleware.ts` | **Implemented** — JWT verification + user attachment + RBAC. |
| `apps/main-backend/src/app/routes/auth/index.ts` | **Extended** — Add `/refresh`, `/logout`, `/sessions`, `/sessions/:id/revoke`. No `/api` prefix. |
| `apps/main-backend/src/app/app.ts` | **Extended** — Register `@fastify/cookie` plugin. |
| `apps/main-backend/src/app/utils/password.service.ts` | **Hardened** — Replace `Math.random()` with `crypto.randomInt`. |
| `libs/api-services/src/services/authService.ts` | **Updated** — `refreshToken()` and `logout()` no longer send RT in body. |
| `libs/api-services/src/services/apiService.ts` | **Updated** — `credentials: "include"` for cookie transport. |
| `libs/api-services/src/services/accessTokenStorage.ts` | **Created** — Module-level variable for memory-only access token. |
| `apps/main-webapp/src/app/shared/stores/authStore.ts` | **Updated** — Memory-only AT; silent refresh; `createAuthService` for API calls. |
| `apps/main-webapp/src/app/app.tsx` | **Updated** — `NavigateToDashboard` shows spinner during auth init. |
| `apps/main-webapp/src/app/pages/auth/login-page.tsx` | **Updated** — `PhoneInput` with country selector (default Ghana). |
| `apps/main-webapp/vite.config.ts` | **Updated** — Proxy `/auth` → `localhost:3001` instead of `/api`. |
| `apps/main-backend/jest.config.ts` | **Updated** — `transformIgnorePatterns` for `jose` ESM. |
| `apps/main-webapp/jest.config.ts` | **Updated** — `moduleNameMapper` for `@shared` alias. |

---

_End of Plan_
