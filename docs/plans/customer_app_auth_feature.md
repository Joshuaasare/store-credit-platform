# Customer App — Auth + Navigation Feature Plan

## Context

The Store Credit Platform has a staff-facing web app (`apps/main-webapp`) and a Fastify backend (`apps/main-backend`). The next step is a **customer-facing mobile app** — a fresh Expo / React Native app scaffolded at `apps/customer-app` by the Nx `@nx/expo` preset. This feature wires up the customer app's first slice: **phone-based authentication + navigation**, with a placeholder post-auth home screen. The real customer features (viewing credits, redeeming, merchant discovery) land in later features.

The backend's existing `/api/auth/*` flow is **staff-only**: `verifyOtp` → `resolveStaffAssignment` → throws "Access denied" if no `staff` row exists. A customer (no staff row) cannot log in through it. `sendOtp` also has anti-enumeration (returns success but sends no SMS if no `users` row) — incompatible with a new-user flow that *must* send an OTP to a brand-new phone. So customer auth lives in a **separate namespace**, reusing the underlying primitives but not the staff-gated service logic.

### Key schema facts (from `apps/main-backend/src/app/types/database.types.ts` + `main.types.ts`)
- `users`: phone-based OTP login identity. `id (uuid), phone, email, otp, otp_expires_at, otp_attempts, last_login_at, created_at, deleted_at`. **No surname/other_names/access_granted** (those moved to `staff`/`customers`).
- `customers`: `id, phone, unique_id, user_id (uuid, nullable → users.id), surname, other_names, created_at, deleted_at`. A walk-in customer created by a cashier has `phone` set and `surname`/`other_names`/`user_id` **null** — cashiers only record purchases against a phone, never names. Names are populated only when the customer downloads the app and registers.
- `staff`: `id, user_id, branch_id, role, surname, other_names, access_granted, ...` — irrelevant to customers.
- `refresh_tokens`: `jti, user_id, token_hash, family_id, device_fingerprint, ip_address, issued_at, expires_at, revoked_at, replaced_at, replaced_by_jti, parent_jti, created_at`. Keyed on `user_id` — persona-agnostic, reusable for customers once they have a `users` row.
- `AccessTokenPayload` (JWT): `sub, phone, role, merchant_id, branch_id, staff_id, iat, exp, iss, aud, jti`. All staff claims are `| null` already.

### The three registration flows (resolved by `otp/verify` after phone ownership is proven)
1. **No `users` row, no `customers` row** (brand-new phone) → `needs_profile` → `register` creates both a `users` row and a `customers` row, links `customers.user_id`, writes the submitted name.
2. **`customers` row exists, no `users` row** (walk-in customer, cashier-created) → `needs_profile` → `register` creates the `users` row, links the existing `customers.user_id`, writes the submitted name (overwriting null).
3. **Both `users` and `customers` rows exist** (returning customer) → `logged_in` directly, no name screen.

### Decisions confirmed with the user
1. **Separate `/api/customer-auth/*` namespace.** New routes file + new `CustomerAuthService`. Reuse primitives: `otp.store` (`setOtp`/`getOtp`/`deleteOtp`/`incrementAttempts`), `normalizePhone`, `MessagingService.sendSMSMessage`, `PasswordService.hashOTP`/`verifyOTP`, `RateLimitService.checkOtpSendLimits`, `TokenService` storage/rotation/revocation. Staff web flow stays untouched.
2. **Shared JWT contract.** Extend `TokenService.signAccessToken` with an optional `customerId: number | null = null` param; add `customer_id: number | null` to `AccessTokenPayload`. No `persona` claim — handlers assert `request.user.customer_id != null`. `requireAuth` middleware reused unchanged (it only verifies + attaches the payload). Staff login passes `customer_id: null`; customer login passes `staff_id/role/merchant_id/branch_id: null`.
3. **OTP-first flow model (no upfront lookup).** `POST /api/customer-auth/otp/send` always sends an OTP (no anti-enumeration — we *want* to verify ownership for new accounts). `POST /api/customer-auth/otp/verify` checks DB state post-verification and returns one of:
   - `{ status: "logged_in", access_token, refresh_token, expires_in, expires_at, token_type, user }` — flow 3.
   - `{ status: "needs_profile", pending_token }` — flows 1+2.
   `POST /api/customer-auth/register { pending_token, surname, other_names }` verifies the pending token, creates/links rows, issues the real session. The "Looks like you're a new user" message appears **post-OTP**, not before — phone ownership is proven before any account state is revealed (consistent with the staff anti-enumeration stance).
4. **Name semantics.** Cashiers never write names; walk-in `customers` rows have null `surname`/`other_names`. `register` always writes the submitted name (flow 1 creates fresh; flow 2 overwrites null on the existing row). **No `prefill` in the `needs_profile` response** — the name screen always shows empty fields. (Consequence: on the staff web, walk-in customers show as "Unnamed"/phone-only until they register on the app — expected state.)
5. **`pending_token` = 5-minute signed JWT.** Claims `{ phone, purpose: "customer_register", jti }`, minted via the existing `jose` signer (reuse `TokenService`'s signer primitive with a dedicated secret or a `purpose` claim distinguishing it from access tokens). Stateless — no DB row, no in-memory store. Replay-safe via natural idempotency: a replayed `register` call finds a `users` row already exists for that phone and errors "already registered."
6. **Refresh token transport = JSON body (not cookie).** React Native has no httpOnly cookies. Separate `POST /api/customer-auth/refresh` and `POST /api/customer-auth/logout` routes read the refresh token from the JSON body (`refresh_token` field). App stores the refresh token in `expo-secure-store` (encrypted iOS Keychain / Android Keystore), access token in memory. On app launch: hydrate refresh token from SecureStore → call `/refresh` → get new access token + user → `authenticated`. `TokenService.storeRefreshToken`/`rotateRefreshToken`/`revokeRefreshToken`/`findRefreshToken`/`computeDeviceFingerprint` reused unchanged (keyed on `user_id`).
7. **Navigation = conditional root, two stacks.** A `NavigationContainer` wraps a root that renders `<AuthStack/>` or `<AppStack/>` based on the auth store. Auth stack: `Login` (phone entry → send code), `OtpVerify` (6-digit entry), `NewUser` (surname + other_names → create account — reached only when `otp/verify` returns `needs_profile`). App stack: `Home` (placeholder — "you're logged in" + logout button). A zustand `useAuthStore` mirrors the web app's pattern: `access_token, refresh_token, user, customer_id, status ("idle"|"loading"|"authenticated"|"unauthenticated")`. `pending_token` carried in the auth store between `OtpVerify` and `NewUser`. Logout clears store + SecureStore; root auto-switches to `<AuthStack/>`. Modern React Navigation v7 pattern — avoids the auth-screen flash and back-stack leak of single-stack `initialRouteName`.
8. **Glassmorphic UI.** Teal brand gradient background (`#0d9488 → #0f766e`) via `expo-linear-gradient`. Glass cards via `expo-blur` `BlurView` (intensity ~40 on iOS, tint `rgba(255,255,255,0.10)`, 1px `rgba(255,255,255,0.18)` border, 24px radius, **no shadow** — flat). Inputs: same glass treatment at `rgba(255,255,255,0.06)` tint, white text, teal focus ring. Primary button: solid `#0d9488` fill, white text, 12px radius. Typography: white headlines, `rgba(255,255,255,0.7)` secondary, Inter font (matches `brand_voltage_color` memory). **Android divergence accepted**: `expo-blur` only does real backdrop blur on iOS; Android renders a tinted overlay (translucency, no blur) — standard Expo tradeoff, no extra blur library.
9. **API client + UI primitives.** Generalize `@store-credit-platform/api-services` to be platform-agnostic (inject token source + refresh handler + base URL). **Types reused as-is** from `api-services` (plain TS interfaces, no DOM dependency). **Fetch layer** refactored to accept injected transport. **UI primitives** built inline in `apps/customer-app/src/app/components/` (`GlassCard`, `GlassInput`, `PrimaryButton`, `ScreenBackground`) — `web-components` is DOM-only, no RN reuse path; no heavy RN UI kit (Tamagui/NativeBase) for 3 screens.
10. **`api-services` generalization = backward-compatible singletons + `createApiClient` factory.** Refactor the base fetch wrapper to read token/refresh/baseUrl from an injected config, exposed via `createApiClient(config) → { transactionService, customerAuthService, ... }`. **Keep the existing top-level singleton exports** (`transactionService`, `authService`, etc.) auto-initialized with the *web* config at module load (web auth store + cookie refresh + `/api` base URL). Web app's existing imports stay unchanged — zero churn, zero regression risk. The RN app calls `createApiClient({ getAccessToken, refreshTokenHandler, baseUrl })` once at bootstrap.

### Fold-ins (assumed, flag if wrong)
- **Dev bypass**: reuse the `DEV_MOCK_PHONE`/`DEV_MOCK_OTP` pattern. Customer `sendOtp` skips the actual SMS send for the mock phone in dev (returns success). Customer `verifyOtp` accepts the mock OTP for the mock phone and proceeds to the flow decision based on real DB state (so you can test all 3 flows by seeding the DB accordingly). The existing staff DEV backdoor in `auth.service.ts` is untouched.
- **Rate limiting**: reuse `RateLimitService.checkOtpSendLimits` for customer `sendOtp` (same limits as staff).
- **Phone normalization**: reuse `normalizePhone` on both `sendOtp` and `verifyOtp` (E.164 with `+` prefix).
- **Session responses include the full customer `user` object** so the auth store hydrates without a separate `/me` call at login. A new `CustomerAuthService.getCurrentCustomer(userId)` method returns `{ id, phone, customer_id, surname, other_names }` and backs the `/refresh` response's `user` field (and an optional `/me` if needed later).

---

## Files to create / modify

### Backend — `apps/main-backend/src/app/`

**`types/auth.types.ts`** (edit — source of truth, then `yarn generate:types`)
- Add `customer_id: number | null;` to `AccessTokenPayload`.
- Add a `CustomerAuthUser` interface: `{ id: string; phone: string | null; customer_id: number; surname: string | null; other_names: string | null }`.
- Add `CustomerOtpSendRequest`, `CustomerOtpVerifyRequest`, `CustomerRegisterRequest`, and the response unions (`CustomerOtpVerifyApiResponse`, `CustomerRegisterApiResponse`, `CustomerRefreshApiResponse`, `CustomerLogoutApiResponse`).

**`types/customer-auth.types.ts`** (new — composed types for the customer-auth service)
- `CustomerOtpVerifyResponse = { status: "logged_in"; access_token: string; refresh_token: string; expires_in: number; expires_at: number; token_type: string; user: CustomerAuthUser } | { status: "needs_profile"; pending_token: string }`.
- `CustomerRegisterResponse = { access_token: string; refresh_token: string; expires_in: number; expires_at: number; token_type: string; user: CustomerAuthUser }`.

**`schemas/customer-auth.schema.ts`** (new — TypeBox, generated by `yarn generate:types`)
- `CustomerOtpSendRequest = Type.Object({ phone: Type.String() })`.
- `CustomerOtpVerifyRequest = Type.Object({ phone: Type.String(), otp: Type.String() })`.
- `CustomerRegisterRequest = Type.Object({ pending_token: Type.String(), surname: Type.String(), other_names: Type.String() })`.
- `CustomerRefreshRequest = Type.Object({ refresh_token: Type.String() })`.
- Response schemas mirroring the types above.

**`services/token.service.ts`** (edit)
- `signAccessToken` signature: add `customerId: number | null = null` as the last param. Include `customer_id: customerId` in the JWT payload.
- Add a `signPendingToken(phone: string): Promise<string>` method — mints a 5-min JWT with claims `{ phone, purpose: "customer_register", jti }` using the existing `jose` signer (reuse `accessTokenKey` or a dedicated `PENDING_TOKEN_SECRET` env var — recommend a dedicated secret so a pending token can't be mistaken for an access token). Add a `verifyPendingToken(token: string): { phone: string } | null` companion that checks `purpose === "customer_register"` and TTL.

**`services/customer-auth.service.ts`** (new — the core service)
- `sendOtp(data: { phone: string }, clientIp?)`: normalize phone, rate-limit via `RateLimitService.checkOtpSendLimits`, dev-bypass for `DEV_MOCK_PHONE` (skip SMS), else generate OTP (`PasswordService.generateOTP`), hash + store in `otp.store` (`setOtp`), update `users.otp`/`otp_expires_at`/`otp_attempts` if a `users` row exists (defensive — the row may not exist yet for flow 1), send SMS via `MessagingService.sendSMSMessage`. Always return `{ message: "OTP sent successfully" }`.
- `verifyOtp(data: { phone, otp }, userAgent?, clientIp?)`: normalize phone, dev-bypass, verify against `otp.store` + `PasswordService.verifyOTP`, enforce `MAX_OTP_ATTEMPTS`. On success, look up DB state:
  - Fetch `users` row by phone (`deleted_at IS NULL`). If found → flow 3: fetch the linked `customers` row (`user_id = users.id`), build `CustomerAuthUser`, issue access token (`signAccessToken` with `customerId`), generate + store refresh token (`TokenService.generateOpaqueToken` + `storeRefreshToken`), return `{ status: "logged_in", ... }`.
  - If no `users` row → flows 1+2: mint a `pending_token` via `TokenService.signPendingToken(phone)`, return `{ status: "needs_profile", pending_token }`.
- `register(data: { pending_token, surname, other_names }, userAgent?, clientIp?)`: verify the pending token (`TokenService.verifyPendingToken`), extract the verified phone. Check no `users` row exists for that phone (if it does → 400 "already registered", the replay guard). Create the `users` row (`{ phone, otp: null, otp_expires_at: null, otp_attempts: 0 }`). Check for an existing `customers` row by phone: if found (flow 2) → update `surname`/`other_names`/`user_id`; if not (flow 1) → insert a new `customers` row with `{ phone, surname, other_names, user_id }`. Issue access token (`customerId = customers.id`), generate + store refresh token, return the session + `CustomerAuthUser`.
- `getCurrentCustomer(userId: string): Promise<CustomerAuthUser>`: fetch `users` (phone) + the linked `customers` row (`user_id = userId`, `deleted_at IS NULL`), return the composed `CustomerAuthUser`. Used by `/refresh`.
- `refreshSession(refreshToken: string, userAgent?, clientIp?)`: hash the refresh token, `TokenService.rotateRefreshToken`, `getCurrentCustomer`, `signAccessToken` with `customerId`, return new access + refresh tokens + user.

**`routes/customer-auth/index.ts`** (new)
- `POST /api/customer-auth/otp/send` — body `CustomerOtpSendRequest`, calls `sendOtp`.
- `POST /api/customer-auth/otp/verify` — body `CustomerOtpVerifyRequest`, calls `verifyOtp`. Returns the discriminated `CustomerOtpVerifyResponse` (no refresh-token cookie — refresh token in JSON body for the `logged_in` branch).
- `POST /api/customer-auth/register` — body `CustomerRegisterRequest`, calls `register`. Returns session in JSON body.
- `POST /api/customer-auth/refresh` — body `CustomerRefreshRequest`, calls `refreshSession`. Returns new access + refresh tokens in JSON body.
- `POST /api/customer-auth/logout` — body `CustomerRefreshRequest`, revokes the refresh token via `TokenService.revokeRefreshToken`. Returns `{ success: true, message }`.
- `GET /api/customer-auth/me` — `preHandler: [requireAuth]`, asserts `request.user.customer_id != null`, calls `getCurrentCustomer(request.user.sub)`. (Optional — included for completeness; the session responses already hydrate the store at login.)
- Register the router in the main app loader alongside the existing `auth` route.

**`utils/phone.utils.ts`** — reused as-is (`normalizePhone`).

**No migration changes.** The `users`/`customers`/`refresh_tokens` tables already have all columns needed. No schema migration is required for this feature. (If a dedicated `PENDING_TOKEN_SECRET` env var is added, that's config, not a migration.)

### Shared library — `libs/api-services/` (or wherever `@store-credit-platform/api-services` lives)

**Refactor to platform-agnostic (decision 10A — backward-compatible)**
- Extract a `createApiClient(config: { getAccessToken: () => string | null; refreshTokenHandler: () => Promise<string | null>; baseUrl: string; fetch?: typeof fetch })` factory returning `{ transactionService, customerAuthService, authService, ... }`. The base fetch wrapper reads the access token from `config.getAccessToken()`, sets `Authorization: Bearer <token>`, and on 401 calls `config.refreshTokenHandler()` → retries once with the new token.
- **Keep the existing top-level singleton exports** auto-initialized with the web config: `getAccessToken` reads the web `useAuthStore`, `refreshTokenHandler` POSTs `/api/auth/refresh` (browser sends the cookie automatically), `baseUrl = "/api"`. Web app imports unchanged.
- Add a `customerAuthService` object with: `sendOtp(phone)`, `verifyOtp(phone, otp)`, `register(pendingToken, surname, otherNames)`, `refresh(refreshToken)`, `logout(refreshToken)`, `getMe()`. These call the new `/api/customer-auth/*` endpoints. (The RN app uses these via its own `createApiClient` instance; the web app doesn't use them.)
- Types: re-export the new customer-auth request/response types from `api.types.ts` (regenerated by `yarn generate:types`).

### Frontend — `apps/customer-app/`

**Dependencies to pin** (replace the `*` placeholders in `apps/customer-app/package.json` with real versions resolved in `yarn.lock`):
- `@react-navigation/native`, `@react-navigation/native-stack` (v7).
- `expo-secure-store`, `expo-blur`, `expo-linear-gradient`.
- `zustand`.
- `react-native-safe-area-context`, `react-native-screens` (React Navigation peer deps).
- Keep `expo`, `react`, `react-native`, `expo-status-bar`, `react-native-svg` (already present).

**`src/app/store/useAuthStore.ts`** (new — zustand, mirrors web pattern)
- State: `status: "idle" | "loading" | "authenticated" | "unauthenticated"`, `access_token: string | null`, `refresh_token: string | null`, `user: CustomerAuthUser | null`, `pending_token: string | null` (carried between OtpVerify and NewUser).
- Actions: `hydrate()` (read refresh token from SecureStore → call `refresh()` → set state), `setSession({ access_token, refresh_token, user })`, `setPending(token)`, `logout()` (clear state + SecureStore), `setStatus()`.

**`src/app/api/client.ts`** (new — RN-specific `createApiClient` wiring)
- Calls `createApiClient({ getAccessToken: () => useAuthStore.getState().access_token, refreshTokenHandler: async () => { /* read refresh_token from SecureStore, POST /api/customer-auth/refresh, store new refresh_token, return new access_token */ }, baseUrl: Constants.expoConfig?.extra?.apiBaseUrl ?? __DEV__ ? "http://localhost:3000/api" : "<production URL>" })`.
- Exports `customerAuthService` from the created client.

**`src/app/components/`** (new — inline RN primitives, decision X)
- `ScreenBackground.tsx` — `expo-linear-gradient` `LinearGradient` with `colors={["#0d9488", "#0f766e"]}`, `style={{ flex: 1 }}`, wraps children in a `SafeAreaView`.
- `GlassCard.tsx` — `BlurView` (intensity 40) with `rgba(255,255,255,0.10)` tint, 1px `rgba(255,255,255,0.18)` border, 24px radius, padding 24, no shadow.
- `GlassInput.tsx` — `TextInput` with `rgba(255,255,255,0.06)` background, white text, teal focus border, placeholder `rgba(255,255,255,0.5)`.
- `PrimaryButton.tsx` — solid `#0d9488` fill, white text, 12px radius, 48px height, loading spinner state.

**`src/app/navigation/RootNavigator.tsx`** (new — conditional root)
- Reads `useAuthStore(s => s.status)`. If `authenticated` → `<AppStack/>`; else `<AuthStack/>`. Wrapped in `<NavigationContainer>`.
- `AuthStack` = `createNativeStackNavigator()` with screens `Login`, `OtpVerify`, `NewUser`. `initialRouteName: "Login"`.
- `AppStack` = `createNativeStackNavigator()` with screen `Home`.

**`src/app/screens/auth/LoginScreen.tsx`** (new)
- `ScreenBackground` + centered `GlassCard` containing: app title, `GlassInput` (phone), `PrimaryButton` ("Send code"). On submit: call `customerAuthService.sendOtp(phone)`, navigate to `OtpVerify` (passing phone via params). Loading + error states.

**`src/app/screens/auth/OtpVerifyScreen.tsx`** (new)
- `ScreenBackground` + `GlassCard`: "Enter the code we sent to {phone}", 6-digit `GlassInput`, `PrimaryButton` ("Verify"). On submit: call `customerAuthService.verifyOtp(phone, otp)`:
  - If `status === "logged_in"` → `useAuthStore.setSession(...)`, root auto-switches to `<AppStack/>`.
  - If `status === "needs_profile"` → `useAuthStore.setPending(pending_token)`, navigate to `NewUser`.

**`src/app/screens/auth/NewUserScreen.tsx`** (new)
- `ScreenBackground` + `GlassCard`: "Looks like you're a new user — let's set up your account", `GlassInput` (surname), `GlassInput` (other_names), `PrimaryButton` ("Create account"). On submit: read `pending_token` from store, call `customerAuthService.register(pending_token, surname, other_names)` → `setSession(...)`, root auto-switches to `<AppStack/>`.

**`src/app/screens/home/HomeScreen.tsx`** (new — placeholder)
- `ScreenBackground` + `GlassCard`: "You're logged in", shows `user.surname + other_names` + phone, `PrimaryButton` ("Log out") → `useAuthStore.logout()`.

**`src/app/App.tsx`** (edit — replace boilerplate)
- On mount: `useAuthStore.hydrate()` (sets `status: "loading"` while checking SecureStore). Render `<NavigationContainer><RootNavigator/></NavigationContainer>`. While `status === "loading"` → a splash/loading screen.

**`app.json` / `app.config.ts`** (edit)
- Add `extra: { apiBaseUrl: "<URL>" }` for the API base URL (read by `client.ts`).

---

## Verification

1. `yarn generate:types` — confirm `customer-auth.schema.ts` + `api.types.ts` regenerate cleanly with the new customer-auth types and the `AccessTokenPayload.customer_id` field.
2. `npx nx typecheck main-backend --skip-nx-cache` — clean.
3. `npx nx build main-backend --skip-nx-cache` — clean.
4. `npx nx typecheck api-services --skip-nx-cache` — clean (the `createApiClient` refactor + backward-compatible singletons).
5. `npx nx typecheck main-webapp --skip-nx-cache` — only pre-existing baseline errors (jest mocks TS2708, tsconfig.spec TS5069); **no new errors from the `api-services` refactor** (this is the key regression check — the web app's imports must still resolve).
6. `npx nx typecheck customer-app --skip-nx-cache` — clean.
7. Manual smoke (dev Supabase + dev backend + Expo dev client):
   - **Flow 3** (returning customer): seed a `users` + `customers` row for a phone. App: enter phone → OTP → verify → lands on Home showing the customer's name. Logout works.
   - **Flow 2** (walk-in customer): seed a `customers` row (null names, no `user_id`) for a phone. App: enter phone → OTP → verify → "new user" screen → enter name → create → lands on Home. Verify `customers.surname`/`other_names`/`user_id` are now populated in the DB.
   - **Flow 1** (brand new): no rows for the phone. App: enter phone → OTP → verify → "new user" screen → enter name → create → lands on Home. Verify both `users` and `customers` rows created with the name + link.
   - **Replay guard**: replay the same `pending_token` twice → second call returns 400 "already registered".
   - **Refresh**: kill the app, relaunch → hydrate reads SecureStore → `/refresh` → new access token → lands on Home without re-login.
   - **Dev bypass**: with `DEV_MOCK_PHONE`/`DEV_MOCK_OTP` set, the mock phone logs in without a real SMS.
   - **Android build**: confirm the glass effect renders as translucency (no real blur) — acceptable per decision 8.
8. Confirm the staff web app's login still works end-to-end (the `api-services` refactor is backward-compatible — no web regression).

---

## Out of scope

- The real customer features (viewing credits, redeeming credit, merchant discovery, transaction history) — later features. `Home` is a placeholder.
- Customer-facing endpoints beyond auth (`/api/customer-auth/*` only). The existing `/api/customers/*`, `/api/transactions/*` etc. remain staff-gated; customer access to those is a later feature with its own authorization design.
- A customer "profile edit" screen — registration writes the name once; editing is later.
- SMS template customization for customer OTP (reuse the existing `SMSTemplates.loginOTP` or a near-identical customer variant — minor, decide at implementation).
- Push notifications, deep linking, biometric auth — later features.
- EAS build / submit configuration — the `eas.json` exists; production build setup is out of scope for this auth slice.