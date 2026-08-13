import {
  ApiErrorResponse,
  BaseBranch,
  BaseMerchant,
} from "./main.types";

// ────────────────────────────────────────────────────────────────────────────
// Customer-app Home tab — Recent Activity feed (`/customers/me/transactions`)
// ────────────────────────────────────────────────────────────────────────────
// The Home tab renders a unified activity stream for the authenticated
// customer — one row per `customer_credit` (issuance) and one row per APPROVED
// `customer_credit_redemption` (spend). Two kinds of rows are returned by a
// single endpoint so the feed can sort, paginate, and render them as one
// chronological list.
//
// Lives in its own file (not `transactions.types.ts`) because the staff-facing
// `/customers/:id/transactions` endpoint exposes purchase / credit_issue /
// credit_redeem rows joined to staff + customer — a different audience and
// shape. The customer-app feed is much smaller (no purchase rows, no staff
// join) and uses cursor-based pagination rather than offset/limit.
//
// Row shape composes from the shared base types (BaseBranch, BaseMerchant) so
// a column added to BASE_BRANCH / BASE_MERCHANT auto-propagates through the
// generated schema and the frontend type. `id` is the row's primary key
// (customer_credit.id for issuances, customer_credit_redemptions.id for
// redemptions) — used by the cursor-based pagination.
//
// `created_at` is the row's display timestamp:
//   - issuances    → customer_credit.created_at (always set, ISO timestamptz)
//   - redemptions  → coalesce(approved_at, created_at). The approved time is
//                    semantically correct ("when was this redeemed?") and is
//                    guaranteed non-null for approved rows; created_at is the
//                    fall-back if a row is somehow approved with approved_at
//                    null. The service coalesces — never nulls out.

export type CustomerActivityKind = "credit_issued" | "credit_redeemed";

export interface CustomerActivityIssued {
  kind: "credit_issued";
  id: number;
  amount: number;
  merchant: BaseMerchant;
  branch: BaseBranch;
  created_at: string;
  credit_id: number;
}

export interface CustomerActivityRedeemed {
  kind: "credit_redeemed";
  id: number;
  amount: number;
  merchant: BaseMerchant;
  branch: BaseBranch;
  created_at: string;
  credit_id: number;
  // The originating purchase is informational only — the customer's
  // purchase history is out of scope for this endpoint. Null when the
  // redemption is not tied to a specific purchase (e.g. legacy rows).
  purchase_id: number | null;
}

export type CustomerActivity =
  | CustomerActivityIssued
  | CustomerActivityRedeemed;

export interface CustomerActivitiesPage {
  items: CustomerActivity[];
  // The last `id` from the previous page (kind + id together would be
  // safer, but kind is implicit in the merged order — the service sorts
  // kind-blocked first, then id desc within block, so a single numeric
  // cursor is enough for v1). Null when the previous page was the last.
  nextCursor: number | null;
}

export interface CustomerActivitiesResponse {
  success: true;
  data: CustomerActivitiesPage;
}

export type CustomerActivitiesApiResponse =
  | CustomerActivitiesResponse
  | ApiErrorResponse;
