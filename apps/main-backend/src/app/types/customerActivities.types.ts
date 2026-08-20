import {
  ApiErrorResponse,
  BaseBranch,
  BaseMerchant,
} from "./main.types";

// Customer-app Home tab feed — one row per customer_credit (issuance) + one per APPROVED customer_credit_redemption (spend). Cursor-paginated on the row id; created_at = coalesce(approved_at, created_at) for redemptions.

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
  // Informational only — customer purchase history is out of scope here. Null for legacy rows not tied to a purchase.
  purchase_id: number | null;
}

export type CustomerActivity =
  | CustomerActivityIssued
  | CustomerActivityRedeemed;

export interface CustomerActivitiesPage {
  items: CustomerActivity[];
  // Last id from the previous page; the service sorts kind-blocked then id desc, so a single numeric cursor suffices. Null on the last page.
  nextCursor: number | null;
}

export interface CustomerActivitiesResponse {
  success: true;
  data: CustomerActivitiesPage;
}

export type CustomerActivitiesApiResponse =
  | CustomerActivitiesResponse
  | ApiErrorResponse;
