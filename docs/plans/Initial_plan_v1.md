# Store Credit Platform — End-to-End Implementation Plan (Aligned to Schema)

## Context

We are building a Store Credit App for small shops in Ghana. Shops give "store credit" (loyalty points) to customers based on cash purchases. Customers use their phone number to save and spend credit. The system must prevent cashier fraud through 4 strict anti-fraud rules, support Ghana-specific needs (Mobile Money, offline-first, local SMS), and be architected to grow into a full inventory management system.

**Tech Stack**: Nx monorepo, Fastify backend, Supabase (Postgres + Auth), React + Vite web app, React Native (Expo) customer app, Zod validation, Zustand state management, shadcn/ui.

**Existing Setup**: Basic Fastify backend with auto-loaded routes/plugins, React web app with theme provider and shadcn components, shared `api-services` and `web-components` libs, Supabase env configuration.

---

## 1. Database Schema (Source of Truth)

The schema in `database.types.ts` is the source of truth. The following tables, enums, and relationships are already defined and the plan is built around them.

### 1.1 Enums

| Enum | Values | Purpose |
|------|--------|---------|
| `credit_type` | `fixed`, `percentage` | How credit is calculated per branch |
| `role` | `manager`, `cashier` | Staff roles (to be attached to staff) |

### 1.2 Core Tables

#### `users` — Identity & Authentication
The central user table. All humans in the system (staff, owners, future customers who install the app) have a row here.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `string` (UUID) | Supabase Auth `auth.users.id`. The single source of identity. |
| `surname` | `string` | Required display name. |
| `other_names` | `string` | Optional additional names. |
| `email` | `string` | Optional email for notifications. |
| `otp` | `string` | Hashed OTP for phone login. |
| `otp_attempts` | `number` | Failed OTP attempts (rate limiting). |
| `otp_expires_at` | `string` (timestamp) | OTP expiry for time-windowed validation. |
| `access_granted` | `boolean` | Soft-lock. An admin can revoke access without deleting the user. |
| `deleted_at` | `string` (timestamp) | Soft delete. |

**Auth Flow**: Phone number -> OTP sent via SMS -> `otp` + `otp_expires_at` stored -> OTP verified -> `access_granted` checked -> JWT issued.

---

#### `merchants` — Business Profile
A shop, business, or merchant in the system.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `number` (serial) | Auto-increment primary key. |
| `name` | `string` | Business name (e.g., "Mensah Provisions"). |
| `phone` | `string` | Primary business contact (E.164, e.g., +233...). |
| `country_code` | `string` | ISO country code (e.g., `GH`). Enables multi-country expansion. |
| `slug` | `string` | URL-friendly identifier. |
| `is_active` | `boolean` | Soft-toggle. Admin can disable a merchant. |
| `deleted_at` | `string` (timestamp) | Soft delete. |

**Note**: The original brief's `credit_rate_percent` and `redemption_cap_percent` are **NOT** here. Credit rules live per-branch in `branch_credit_config`, allowing different branches of the same merchant to run different campaigns (e.g., flagship branch gives 3%, kiosk branch gives 1%).

---

#### `branches` — Shop Locations
A branch belongs to exactly one `merchant`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `number` (serial) | Auto-increment. |
| `merchant_id` | `number` | FK -> `merchants.id`. |
| `city` | `string` | City name. |
| `country_code` | `string` | Branch-level country override. |
| `address` | `string` | Street address. |
| `phone` | `string` | Branch contact number. |
| `deleted_at` | `string` (timestamp) | Soft delete. |

---

#### `staff` — Employees
A staff member is a `user` assigned to a `branch`. One user can be staff at multiple branches (future), but currently one `staff` row links one `user_id` to one `branch_id`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `number` (serial) | Auto-increment. |
| `user_id` | `string` (UUID) | FK -> `users.id`. |
| `branch_id` | `number` | FK -> `branches.id`. The branch they primarily work at. |
| `address` | `string` | Optional. |
| `notes` | `string` | Internal admin notes. |
| `deleted_at` | `string` (timestamp) | Soft delete. |

**Note**: The `role` enum (`manager`, `cashier`) exists but is not yet attached to this table. We will add a `role` column to `staff` (or a `staff_roles` junction table) to support RBAC.

---

#### `customers` — Customer Identity
Customers are identified by phone number. They do NOT need to install an app.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `number` (serial) | Auto-increment. |
| `phone` | `string` | Unique. E.164 format (e.g., +233207654321). The primary lookup key. |
| `unique_id` | `string` | Optional alternate identifier (e.g., loyalty card barcode). |
| `deleted_at` | `string` (timestamp) | Soft delete. |

---

#### `branch_customer` — Customer ↔ Branch Association
Customers can shop at multiple branches. This junction tracks which branches a customer is known at.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `number` (serial) | Auto-increment. |
| `branch_id` | `number` | FK -> `branches.id`. |
| `customer_id` | `number` | FK -> `customers.id`. |
| `deleted_at` | `string` (timestamp) | Soft delete. |

**Use case**: When a cashier types a phone number, we can show "This customer shops at these branches..." and their balances per branch.

---

#### `customer_credit` — Credit Balance per Customer per Branch
This replaces the concept of "wallets". Each customer has a separate credit balance at each branch.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `number` (serial) | Auto-increment. |
| `customer_id` | `number` | FK -> `customers.id`. |
| `branch_id` | `number` | FK -> `branches.id`. |
| `credit_amount` | `number` | Current available credit balance. |
| `expires_at` | `number` (Unix timestamp) | When this credit expires (optional). |
| `deleted_at` | `string` (timestamp) | Soft delete. |

**Key point**: The original brief's 24-hour delay rule (pending -> spendable) is **not natively represented** in this table. The `expires_at` field is for credit expiration (validity), not maturation.

**Augmentation needed for Rule 3**: Add `pending_credit_amount` (number) and `pending_matures_at` (timestamp) to this table, OR create a `pending_credit` side table. We will add `pending_credit_amount` and `matured_credit_amount` (renaming `credit_amount`) for clarity.

---

#### `customer_transactions` — Transaction Ledger
Every purchase or credit event is recorded here. This is the immutable log.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `number` (serial) | Auto-increment. |
| `customer_id` | `number` | FK -> `customers.id`. |
| `branch_id` | `number` | FK -> `branches.id`. Where the transaction happened. |
| `amount` | `number` | The cash purchase amount (what the customer paid). |
| `transaction_date` | `number` (Unix timestamp) | When the transaction occurred (can differ from `created_at`). |
| `recorded_by_user_id` | `string` (UUID) | FK -> `users.id`. The staff member who recorded this. |
| `deleted_at` | `string` (timestamp) | Soft delete. |

**Note**: This table currently does not distinguish between "purchase transactions" and "credit redemption transactions". To support the 4 rules properly, we need a `transaction_type` and `credit_amount` column here. We will augment this table with:
- `transaction_type`: `purchase`, `credit_redeem`, `credit_adjustment`
- `credit_generated`: the calculated credit from this purchase (if any)
- `credit_redeemed`: the credit used (if any)

---

#### `branch_credit_config` — Credit Rules per Branch
This is where the anti-fraud calculations are configured. Each branch has exactly one active config row.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `number` (serial) | Auto-increment. |
| `branch_id` | `number` | FK -> `branches.id`. |
| `credit_type` | `enum` | `fixed` = flat amount, `percentage` = percent of purchase. |
| `percentage_credit_value` | `number` | e.g., 0.02 for 2% (when `credit_type = percentage`). |
| `fixed_credit_value` | `number` | e.g., 5.00 for GH₵5 flat (when `credit_type = fixed`). |
| `threshold_amount` | `number` | Minimum purchase required to earn credit. |
| `maximum_allowed_credit` | `number` | Per-customer cap at this branch. |
| `credit_validity` | `number` | Hours before credit expires (optional). |
| `terms` | `string` | Human-readable terms shown to customer. |
| `is_active` | `boolean` | Toggle this config on/off. |
| `deleted_at` | `string` (timestamp) | Soft delete. |

**Augmentation needed for Rule 4**: Add `redemption_cap_percent` (number, e.g., 0.20 for 20%) to enforce the spend limit.

**Augmentation needed for Rule 2 (Pool Limit)**: Add `total_pool_limit` and `used_pool_amount` to `merchants`, OR add `branch_pool_limit` and `branch_pool_used` to this table. Per the original brief, the pool is merchant-wide, so we will add `credit_pool_limit` and `credit_pool_used` to `merchants`.

---

### 1.3 Schema Augmentations Required for 4 Anti-Fraud Rules

| Rule | Gap in Schema | Addition |
|------|---------------|----------|
| **Rule 1: Auto-Calculate** | Backend must derive credit from `amount` + `branch_credit_config`. | No schema change needed. Enforced in API logic. |
| **Rule 2: Pool Limit** | No merchant-wide pool tracking. | Add `credit_pool_limit` (number) and `credit_pool_used` (number) to `merchants`. |
| **Rule 3: 24h Delay** | No pending/spendable split in `customer_credit`. | Add `pending_credit_amount` (number) and `matured_credit_amount` (number) to `customer_credit`. Rename existing `credit_amount` to `matured_credit_amount`. Add `pending_matures_at` (timestamp). |
| **Rule 4: 20% Spend Limit** | No redemption cap in config. | Add `redemption_cap_percent` (number) to `branch_credit_config`. |
| **RBAC** | `role` enum exists but not attached to `staff`. | Add `role` column to `staff` (enum `role`). |
| **Audit Trail** | No audit log table. | Add `audit_logs` table (merchant_id, user_id, action, table_name, record_id, old_values, new_values, ip_address, created_at). |

---

## Phase 1: Foundation (Weeks 1–2)

### 1.1 Apply Schema + Augmentations

1. Create all 9 tables as defined in `database.types.ts`.
2. Apply the 6 augmentations above (pool columns on `merchants`, pending columns on `customer_credit`, `redemption_cap_percent` on `branch_credit_config`, `role` on `staff`, `audit_logs` table).
3. Add `transaction_type`, `credit_generated`, `credit_redeemed` to `customer_transactions`.
4. Create indexes:
   - `customers(phone)` — Unique lookup
   - `staff(user_id)` — Login lookup
   - `staff(branch_id)` — Branch staff listing
   - `customer_credit(customer_id, branch_id)` — Unique
   - `customer_transactions(customer_id, branch_id, transaction_date)` — History lookup
   - `branch_credit_config(branch_id)` — Unique (one active config per branch)
   - `audit_logs(merchant_id, created_at)` — Reporting

### 1.2 Row Level Security (RLS)

Enable RLS on all tables. Backend uses Supabase Service Role Key.

- **`users`**: SELECT own record. UPDATE own record (except `access_granted`, `otp`).
- **`merchants`**: Staff can SELECT merchants they belong to. Owners/managers can UPDATE.
- **`branches`**: Staff can SELECT branches of their merchant.
- **`staff`**: SELECT own record. Managers can SELECT all staff in their merchant.
- **`customers`**: Staff can SELECT customers of their merchant's branches. Customers can SELECT own record.
- **`customer_credit`**: Staff can SELECT for customers at their branches. Customers can SELECT own credit.
- **`customer_transactions`**: Staff can SELECT for transactions at their branches. Customers can SELECT own transactions.
- **`branch_credit_config`**: Staff can SELECT for their branches. Managers can UPDATE.
- **`audit_logs`**: Owners/managers can SELECT for their merchant.

### 1.3 Auth Service (OTP-Based Phone Auth)

The `users` table already has OTP fields. Implement the flow:

- `POST /api/auth/otp/send`
  - Body: `{ phone: string }` (E.164, e.g., +233207654321)
  - Generate 6-digit OTP, hash it, store in `users.otp`, set `users.otp_expires_at` (10 minutes), reset `otp_attempts`.
  - Send via SMS (Twilio/Hubtel).
  - Rate limit: 3 sends per phone per hour.

- `POST /api/auth/otp/verify`
  - Body: `{ phone: string, otp: string }`
  - Find user by phone. Check `otp` matches hash, `otp_expires_at` not passed, `access_granted` is true.
  - Increment `otp_attempts`. If attempts > 5, lock temporarily.
  - Generate JWT with claims: `sub` (user_id), `phone`, `merchant_id` (from staff), `branch_id` (from staff), `role`.
  - Clear OTP fields.

- `POST /api/auth/refresh`
  - Refresh JWT before expiry.

- `POST /api/auth/logout`
  - Client-side token deletion + server-side revoke list (optional).

- `GET /api/auth/me`
  - Return user profile + staff info + merchant info.

### 1.4 Shared Libraries

Create new Nx libraries:
- **`libs/shared-schemas`** — Zod schemas for all API contracts.
  - `auth.schema.ts` — `SendOtpSchema`, `VerifyOtpSchema`
  - `merchant.schema.ts` — `CreateMerchantSchema`, `UpdateMerchantSchema`
  - `branch.schema.ts` — `CreateBranchSchema`, `UpdateBranchSchema`
  - `staff.schema.ts` — `CreateStaffSchema`, `UpdateStaffSchema`
  - `customer.schema.ts` — `CreateCustomerSchema`, `CustomerLookupSchema`
  - `credit.schema.ts` — `IssueCreditSchema`, `RedeemCreditSchema`
  - `transaction.schema.ts` — `CreateTransactionSchema`
- **`libs/shared-types`** — TypeScript interfaces.
- **`libs/database-types`** — Re-export and extend `database.types.ts`.

### 1.5 Backend Plugin Architecture

Extend existing Fastify plugins:
- **`auth.ts`** — Extract Bearer token, verify JWT, attach `request.user` with `user_id`, `merchant_id`, `branch_id`, `role`.
- **`rbac.ts`** — `requireRole(...roles)` decorator. Rejects with 403 if role mismatch.
- **`audit.ts`** — Post-response hook. On mutation responses (POST/PATCH/DELETE), write to `audit_logs`.
- **`rate-limit.ts`** — OTP endpoint rate limiting.
- **`supabase.ts`** — Initialize Supabase service role client for DB operations.

### 1.6 Service Layer

Create services in `apps/main-backend/src/app/services/`:
- `auth.service.ts` — OTP generation, verification, JWT management.
- `merchant.service.ts` — CRUD, onboarding.
- `branch.service.ts` — CRUD.
- `staff.service.ts` — CRUD, role assignment.
- `customer.service.ts` — Lookup by phone, implicit registration.
- `credit.service.ts` — Core anti-fraud logic (issue/redeem/cancel).
- `transaction.service.ts` — Transaction logging, history queries.
- `config.service.ts` — `branch_credit_config` CRUD.
- `audit.service.ts` — Audit log writes.
- `notification.service.ts` — SMS dispatch (Twilio/Hubtel).

---

## Phase 2: Core Credit Engine (Weeks 3–4)

### 2.1 Credit Issuance (`POST /api/credit/issue`)

**Request Body** (`IssueCreditSchema`):
```json
{
  "customer_phone": "+233207654321",
  "amount_paid": 150.00,
  "branch_id": 1
}
```

**Backend Logic** (enforced in `credit.service.ts`):

1. **Lookup customer** by phone. If not found, auto-create in `customers` + `branch_customer` junction.
2. **Verify staff** has `credit:issue` permission at this branch.
3. **Fetch `branch_credit_config`** for this branch. Must be `is_active = true`.
4. **Rule 1: Auto-Calculate**
   - Reject if payload contains any `credit_amount` field.
   - If `amount_paid < threshold_amount`, credit = 0.
   - If `credit_type = percentage`: `credit = amount_paid * percentage_credit_value`.
   - If `credit_type = fixed`: `credit = fixed_credit_value`.
5. **Rule 2: Pool Limit**
   - Fetch `merchant.credit_pool_limit` and `merchant.credit_pool_used`.
   - If `credit_pool_used + credit > credit_pool_limit`, throw `PoolLimitExceededError`.
   - Atomically increment `credit_pool_used`.
6. **Rule 3: 24-Hour Delay**
   - Credit does NOT go to `matured_credit_amount` immediately.
   - Instead, add to `pending_credit_amount`.
   - Set `pending_matures_at = NOW() + INTERVAL '24 hours'` (or `branch_credit_config.credit_validity` hours).
7. **Record Transaction**
   - Insert into `customer_transactions`:
     - `transaction_type = 'purchase'`
     - `amount = 150.00`
     - `credit_generated = 3.00`
     - `credit_redeemed = 0`
     - `recorded_by_user_id = current_user.id`
8. **Update Customer Credit**
   - Upsert `customer_credit` row:
     - `pending_credit_amount += credit`
     - `pending_matures_at = NOW() + INTERVAL '24 hours'`
9. **Send Notification**
   - SMS to customer: "You earned GH₵3.00 credit at BranchName. Available after 24 hours."
10. **Return Response**:
```json
{
  "transaction_id": 12345,
  "credit_amount": 3.00,
  "pending_balance": 3.00,
  "matured_balance": 0.00,
  "matures_at": "2026-07-09T12:00:00Z",
  "pool_remaining": 97.00
}
```

### 2.2 Credit Redemption (`POST /api/credit/redeem`)

**Request Body** (`RedeemCreditSchema`):
```json
{
  "customer_phone": "+233207654321",
  "total_purchase_amount": 100.00,
  "branch_id": 1
}
```

**Backend Logic**:

1. **Lookup customer** by phone. Must exist at this branch (via `branch_customer`).
2. **Verify staff** has `credit:redeem` permission.
3. **Fetch `customer_credit`** for this customer at this branch.
4. **Rule 4: 20% Spend Limit**
   - Fetch `branch_credit_config.redemption_cap_percent`.
   - `max_credit_allowed = total_purchase_amount * redemption_cap_percent`.
   - `actual_credit = min(max_credit_allowed, matured_credit_amount)`.
   - Cashier CANNOT override this. No `credit_redeem_amount` in request body.
5. **Calculate Cash Due**
   - `cash_to_pay = total_purchase_amount - actual_credit`.
6. **Update Customer Credit**
   - `matured_credit_amount -= actual_credit`.
7. **Record Transaction**
   - Insert into `customer_transactions`:
     - `transaction_type = 'credit_redeem'`
     - `amount = total_purchase_amount`
     - `credit_generated = 0`
     - `credit_redeemed = actual_credit`
8. **Send Notification**
   - SMS: "You used GH₵20.00 credit at BranchName. Remaining: GH₵30.00."
9. **Return Response**:
```json
{
  "transaction_id": 12346,
  "total_purchase_amount": 100.00,
  "max_credit_allowed": 20.00,
  "credit_used": 20.00,
  "cash_to_pay": 80.00,
  "remaining_matured_balance": 30.00
}
```

### 2.3 Credit Maturation Cron (Rule 3)

**Mechanism**: A scheduled job (Supabase Edge Function or pg_cron) runs every minute.

**Logic**:
1. `SELECT * FROM customer_credit WHERE pending_credit_amount > 0 AND pending_matures_at <= NOW()`.
2. For each row:
   - `matured_credit_amount += pending_credit_amount`
   - `pending_credit_amount = 0`
   - `pending_matures_at = NULL`
3. Send SMS notification: "Your GH₵X credit at BranchName is now ready to spend!"
4. Log to `audit_logs`.

### 2.4 Credit Cancellation (Manager Override)

**Endpoint**: `POST /api/credit/cancel` (Manager only)

**Logic**:
1. Manager selects a pending `customer_transaction`.
2. Verify `transaction_type = 'purchase'` and `credit_generated > 0`.
3. Revert `customer_credit`:
   - If already matured: `matured_credit_amount -= credit_generated`.
   - If still pending: `pending_credit_amount -= credit_generated`.
4. Reverse `merchants.credit_pool_used`.
5. Soft-delete the original transaction (or mark as `cancelled`).
6. Log to `audit_logs`.

### 2.5 API Endpoints Summary

**Auth (`/api/auth/*`)**:
- POST `/otp/send` — Public
- POST `/otp/verify` — Public
- POST `/refresh` — Bearer
- POST `/logout` — Bearer
- GET `/me` — Bearer

**Merchants (`/api/merchants/*`)**:
- POST `/` — Bearer, role=manager (create merchant during onboarding)
- GET `/:id` — Bearer
- PATCH `/:id` — Bearer, role=manager
- GET `/:id/dashboard` — Bearer, role=manager

**Branches (`/api/branches/*`)**:
- POST `/` — Bearer, role=manager
- GET `/` — Bearer (list branches for merchant)
- GET `/:id` — Bearer
- PATCH `/:id` — Bearer, role=manager

**Staff (`/api/staff/*`)**:
- POST `/` — Bearer, role=manager (invite staff)
- GET `/` — Bearer, role=manager
- GET `/:id` — Bearer
- PATCH `/:id` — Bearer, role=manager
- PATCH `/:id/role` — Bearer, role=manager (change role)

**Customers (`/api/customers/*`)**:
- POST `/` — Bearer, cashier/manager
- GET `/lookup?phone=...` — Bearer, cashier/manager (POS lookup)
- GET `/:id` — Bearer
- GET `/:id/transactions` — Bearer
- GET `/:id/credit` — Bearer

**Credit (`/api/credit/*`)**:
- POST `/issue` — Bearer, cashier/manager
- POST `/redeem` — Bearer, cashier/manager
- POST `/cancel` — Bearer, manager only

**Transactions (`/api/transactions/*`)**:
- GET `/` — Bearer (with filters: branch_id, date range, type)
- GET `/:id` — Bearer
- GET `/summary` — Bearer, role=manager

**Config (`/api/config/*`)**:
- GET `/branch/:branch_id` — Bearer
- PATCH `/branch/:branch_id` — Bearer, role=manager

---

## Phase 3: Web App POS (Weeks 5–6)

### 3.1 Page Structure & Routing

Use `react-router-dom` v6:

| Route | Role | Description |
|-------|------|-------------|
| `/login` | Public | Phone + OTP |
| `/dashboard` | Manager | Analytics, pool status, staff overview |
| `/pos/issue` | Cashier/Manager | Issue credit flow |
| `/pos/redeem` | Cashier/Manager | Redeem credit flow |
| `/customers` | Manager | Customer list, search |
| `/customers/:id` | Manager | Customer detail, transaction history, credit per branch |
| `/transactions` | Manager | Full transaction log with filters |
| `/staff` | Manager | Staff management |
| `/settings` | Manager | Branch credit config, pool limits |
| `/receipts/:id` | Cashier/Manager | View receipt |

### 3.2 State Management (Zustand)

**`auth-store.ts`**:
```typescript
interface AuthStore {
  user: User | null;
  staff: Staff | null;
  merchant: Merchant | null;
  currentBranch: Branch | null;
  isAuthenticated: boolean;
  login: (phone: string, otp: string) => Promise<void>;
  logout: () => void;
  switchBranch: (branchId: number) => void;
}
```

**`pos-store.ts`**:
```typescript
interface PosStore {
  mode: 'issue' | 'redeem';
  customerPhone: string | null;
  customer: Customer | null;
  amountPaid: number;          // For issue mode
  totalPurchaseAmount: number; // For redeem mode
  computedCredit: number;        // Auto-calculated (Rule 1)
  maxCreditAllowed: number;    // 20% cap (Rule 4)
  actualCreditUsed: number;
  cashToPay: number;
  receipt: Transaction | null;
  isSubmitting: boolean;
  reset: () => void;
}
```

**`shop-store.ts`**:
```typescript
interface ShopStore {
  merchant: Merchant | null;
  branches: Branch[];
  staff: Staff[];
  pool: { limit: number; used: number } | null;
  config: BranchCreditConfig | null;
  refreshPool: () => Promise<void>;
  refreshConfig: () => Promise<void>;
}
```

### 3.3 Component Architecture

**Layout**:
- `app-shell.tsx` — Sidebar + header. Sidebar items filtered by role.
- `cashier-shell.tsx` — Simplified POS layout. Large buttons, minimal chrome.
- `protected-route.tsx` — Redirects to `/login` if no JWT.
- `role-gate.tsx` — Renders children only if user has required role.

**Forms (react-hook-form + Zod from `libs/shared-schemas`)**:
- `issue-credit-form.tsx` — Only `customer_phone`, `amount_paid`, `branch_id` inputs. Live computed credit preview. Pool status badge above submit button.
- `redeem-credit-form.tsx` — Only `customer_phone`, `total_purchase_amount`, `branch_id` inputs. Live preview of max credit, cash due. Slider capped at 20%.
- `customer-lookup.tsx` — Phone input with debounced search. Shows customer name, branches, balances.

**Shared**:
- `credit-calculator.tsx` — Visual breakdown: "GH₵150 × 2% = GH₵3.00 credit"
- `pool-status-badge.tsx` — "Pool: GH₵73 / GH₵100 used". Red when >90%.
- `receipt-modal.tsx` — Shows transaction summary after issue/redeem. Option to print or send SMS.
- `offline-banner.tsx` — "Offline mode — transactions will sync when reconnected".

### 3.4 Role-Based UI Access

| Role | Pages Accessible |
|------|-----------------|
| **Owner/Manager** | Dashboard, POS, Customers, Transactions, Staff, Settings |
| **Cashier** | POS only (issue/redeem). Customer lookup read-only. No settings, no pool view. |

Use `PermissionGate` component:
```tsx
<PermissionGate requiredRole="manager">
  <SettingsPage />
</PermissionGate>
```

---

## Phase 4: Customer Mobile App (Weeks 7–8)

### 4.1 Screen Structure (React Native / Expo)

Use React Navigation with bottom tabs:

**Auth Stack**:
- `LoginScreen` — Phone input
- `VerifyOtpScreen` — OTP input

**Main Tabs**:
- **Home Tab**
  - `HomeScreen` — Total matured credit across all branches/shops. Recent transactions.
- **Shops Tab**
  - `ShopBalancesScreen` — List of merchants/branches with per-branch matured and pending balances.
- **History Tab**
  - `TransactionHistoryScreen` — All transactions, filterable by branch, date.
  - `TransactionDetailScreen` — Full transaction detail.
- **Profile Tab**
  - `ProfileScreen` — Settings, notification preferences.

**Shared**:
- `ReceiptViewerScreen` — View receipt PDF/image.

### 4.2 Offline Sync Strategy

- **Local DB**: Expo SQLite with tables:
  - `local_customer_credit` — Mirror of `customer_credit` for customer's own rows.
  - `local_customer_transactions` — Last 90 days of own transactions.
  - `local_branches` — Branch metadata (name, merchant).
- **Initial Load**: On login, fetch all `customer_credit` and `customer_transactions` into SQLite.
- **Background Sync**: Every 30s when online, or on app foreground. Use `last_sync_at`.
- **Offline Reads**: Query SQLite directly. Show "Last updated: X mins ago".
- **Conflict**: Server wins. Customer app is read-heavy.

### 4.3 Push Notifications (Expo)

- Register push token on app install. Store in `customers.push_token` (add column if needed).
- Send push for:
  - Credit matured (24h delay complete)
  - Credit issued notification
- Local scheduled notification for credits about to mature.

### 4.4 State Management (Zustand)

- `auth-store.ts` — Session, user, customer profile.
- `credit-store.ts` — `customer_credit` rows, transactions, lastSyncAt.
- `sync-store.ts` — Sync status, online/offline state.

---

## Phase 5: Ghana-Specific Features (Weeks 9–10)

### 5.1 Mobile Money (MoMo) Integration

**Provider Abstraction**:
- `momo.interface.ts` — `requestPayment(phone, amount)`, `verifyPayment(ref)`, `getStatus(ref)`.
- `momo-factory.ts` — Returns provider (MTN or AirtelTigo) based on config.
- `mtn-provider.ts`, `airteltigo-provider.ts` — Provider-specific API implementations.

**Schema Addition**:
- `momo_configs` table: `merchant_id`, `provider`, `api_key_encrypted`, `api_secret_encrypted`, `merchant_account`, `is_active`, `environment`.
- `momo_transactions` table: `merchant_id`, `transaction_id`, `provider`, `provider_ref`, `amount`, `phone_number`, `status`, `failure_reason`, `metadata`.

**Flow**:
1. Cashier selects "Pay with MoMo" in POS.
2. Backend calls `momo.requestPayment(customer_phone, total_purchase_amount)`.
3. Provider sends USSD push to customer's phone.
4. Customer confirms PIN.
5. Provider webhook hits `POST /api/momo/callback/:provider`.
6. Backend updates `momo_transactions` status.
7. On success, credit issuance proceeds. On failure, abort.

### 5.2 SMS Notifications

**Providers**: Twilio (already configured) and Hubtel (preferred for Ghana local numbers).

**Triggered Events**:
- `credit_issued` — "You earned GH₵X credit at BranchName. Available after Y hours."
- `credit_matured` — "Your GH₵X credit at BranchName is now ready to spend!"
- `credit_redeemed` — "You used GH₵X credit at BranchName. Remaining: GH₵Y."
- `pool_warning` — Manager SMS when pool >90% used.

**Schema Addition**:
- `notifications` table: `merchant_id`, `customer_id`, `channel` (sms/push), `status`, `template_key`, `payload` (jsonb), `provider_response`, `sent_at`.

**Implementation**: `notification.service.ts` polls pending rows and dispatches via SMS provider.

### 5.3 Offline-First for Cashier (Web App)

**Service Worker + IndexedDB**:
- Cache static assets via Service Worker.
- IndexedDB stores `offline_sync_queue` locally.
- When offline:
  - Credit issues/redeems stored with client-generated IDs.
  - UI shows "Offline Mode — Will sync when online".
- When online:
  - Batch submit via `POST /api/sync/batch`.
  - Server processes, returns server IDs.
  - Local queue cleared.
- **Conflict Resolution**: Last-write-wins with audit log.

### 5.4 Receipt Generation

**Formats**:
- **Thermal 58mm / 80mm**: Plain text with ESC/POS commands for Bluetooth thermal printers (common in Ghana shops).
- **A4**: PDF via `@react-pdf/renderer`.
- **SMS**: Text receipt sent via SMS.

**Schema Addition**:
- `receipts` table: `merchant_id`, `branch_id`, `transaction_id`, `receipt_number` (unique), `receipt_type`, `format`, `content_json` (jsonb), `pdf_url`, `printed_at`.

**Flow**:
1. On every `credit_issue` or `credit_redeem`, generate `receipts` record.
2. `content_json` stores structured data.
3. PDF generated and uploaded to Supabase Storage.
4. POS web app can trigger Web Bluetooth API for thermal printer.
5. Receipt number format: `REC-{YYYYMMDD}-{sequence}` via Postgres sequence.

---

## Phase 6: Analytics, Reporting & Market-Ready Features (Weeks 11–12)

### 6.1 Analytics Dashboard

**Metrics**:
- Total credit issued today/week/month
- Total credit redeemed
- Redemption rate (% of issued spent)
- Average transaction value
- Pool utilization trend
- Top customers by lifetime value
- Branch comparison

**Implementation**:
- Postgres materialized views: `mv_daily_metrics`, `mv_customer_lifetime_value`.
- Frontend: Recharts charts in Dashboard page.
- Export: CSV via `/api/reports/export`.

### 6.2 Multi-Currency & Localization

- `merchants.country_code` drives currency formatting.
- Ghana: `Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' })` → "GH₵".
- Future expansion to Nigeria (NGN) or CFA (XOF) requires no schema changes.

### 6.3 Additional Market-Ready Features

| Feature | Description | Schema Addition |
|---------|-------------|-----------------|
| **Referral Program** | Customers earn bonus for referring friends | `referrals` table |
| **Tiered Loyalty** | Bronze/Silver/Gold based on lifetime spend | `loyalty_tiers` table |
| **Promotional Campaigns** | Temporary double-credit or bonus pool events | `campaigns` table |
| **Customer Feedback** | SMS prompt for rating after redemption | `feedback` table |
| **Staff Performance** | Per-cashier metrics, leaderboard | Derived from `customer_transactions.recorded_by_user_id` |
| **Inventory Hooks** | Link credit to product purchases | `products`, `transaction_items` tables |
| **Bulk Import/Export** | CSV import/export for customers, products | API endpoints + CSV parser |
| **Third-Party API** | Webhook subscriptions for partners | `webhook_subscriptions`, `webhook_deliveries` tables |
| **WhatsApp Integration** | WhatsApp Business messages as SMS alternative | Extend `notifications.channel` enum |
| **Dark Mode** | Extend existing ThemeProvider | No schema change |

---

## Implementation Sequence Summary

| Phase | Duration | Deliverables |
|-------|----------|-------------|
| **Phase 1: Foundation** | 2 weeks | Schema + augmentations, Supabase setup, shared Zod schemas, OTP auth, plugins, service skeleton |
| **Phase 2: Core Credit Engine** | 2 weeks | Issue/redeem APIs with all 4 anti-fraud rules, credit maturation cron, transaction history |
| **Phase 3: Web App POS** | 2 weeks | Cashier UI (issue/redeem), customer lookup, role-based access, receipt display |
| **Phase 4: Customer App** | 2 weeks | React Native login, balance viewer, transaction history, offline SQLite, push notifications |
| **Phase 5: Ghana Features** | 2 weeks | MoMo integration, SMS notifications, offline sync, receipt generation |
| **Phase 6: Polish & Scale** | 2 weeks | Analytics dashboard, reporting, referral program, tiered loyalty, WhatsApp integration |

---

## Verification Plan

1. **Unit Tests**: Jest for all service methods. Mock Supabase client. Test edge cases: pool limit at boundary, redemption cap rounding, OTP expiry.
2. **Integration Tests**: Fastify server tests for all API endpoints. Verify RLS with test users.
3. **E2E Tests**: Playwright for web app POS flows. Simulate offline mode.
4. **Load Testing**: k6 for concurrent credit issuance to verify pool limit atomicity.
5. **Manual Testing**: Local dev server. Test OTP with Twilio test credentials. Verify receipt PDF generation.
6. **Mobile Testing**: Expo Go on iOS/Android simulators. Test push notifications.

---

## Critical Files

### To Modify
- `apps/main-backend/src/app/app.ts`
- `apps/main-backend/src/app/types/database.types.ts`
- `apps/main-webapp/src/app/app.tsx`
- `libs/api-services/src/services/apiService.ts`
- `package.json`

### New Directories
- `apps/customer-app/` — React Native Expo app
- `libs/shared-schemas/` — Zod validation schemas
- `libs/shared-types/` — TypeScript types
- `libs/database-types/` — Supabase DB types
- `apps/main-backend/src/app/services/` — Business logic services
- `apps/main-backend/src/app/routes/` — Route files (auth, credit, merchant, branch, staff, customer, transaction, config, momo, receipt, notification, sync)
- `apps/main-webapp/src/app/pages/` — Page components
- `apps/main-webapp/src/app/stores/` — Zustand stores
- `apps/main-webapp/src/app/hooks/` — Custom React hooks
- `apps/main-webapp/src/app/components/` — Reusable components
