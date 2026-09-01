import { supabaseAdmin } from "../utils/supabase.client";
import { QueryFragments } from "../constants/queryFragments";
import { AccessTokenPayload } from "../schemas/auth.schema";
import {
  MerchantApprovedRedemptionsResponse,
  MerchantAuditFeedFilters,
  MerchantPendingRequestFilters,
  MerchantPendingRequestsPage,
  MerchantRedemptionActionBody,
  MerchantRedemptionMutationResponse,
  MerchantRejectedRedemptionsResponse,
} from "../schemas/redemptions.schema";

// Merchant-side redemption approval queue. Pending/approved/rejected views all read `customer_credit_redemptions` scoped by `merchant_id`. The `redemption_code` column is INTENTIONALLY never projected — the code is customer-only; merchant staff read it off the customer's screen and type it into the approve dialog. Approve/reject are atomic SQL RPCs that verify the supplied code, stamp approved_at/rejected_at, and move/zero the fan-out slices in one transaction.
export class RedemptionService {
  private static readonly DEFAULT_LIMIT = 20;

  // One pending row per (customer, merchant) pair, so the row count is the pending count. Sorted by requested_date ASC (longest-waiting first), then id ASC for stability. The branch join supplies the display name; branch_id on the audit row is the source of truth.
  async listPendingRedemptions(
    merchantId: number,
    filters: MerchantPendingRequestFilters,
  ): Promise<MerchantPendingRequestsPage> {
    const limit = filters.limit ?? RedemptionService.DEFAULT_LIMIT;
    const offset = filters.offset ?? 0;

    const { data, error, count } = await supabaseAdmin
      .from("customer_credit_redemptions")
      .select(
        `${QueryFragments.BASE_CUSTOMER_CREDIT_REDEMPTION},
         branch:branches(${QueryFragments.BASE_BRANCH}),
         customer:customers(${QueryFragments.BASE_CUSTOMER}, users(${QueryFragments.BASE_USER_PROFILE})),
         merchant:merchants!inner(${QueryFragments.BASE_MERCHANT})` as const,
        { count: "exact" },
      )
      .eq("merchant_id", merchantId)
      .is("deleted_at", null)
      .is("approved_at", null)
      .is("rejected_at", null)
      .order("requested_date", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to load pending redemptions: ${error.message}`);
    }

    const rows = data ?? [];

    const filtered =
      filters.branch_id != null
        ? rows.filter((r) => r.branch_id === filters.branch_id)
        : rows;

    return {
      rows: filtered,
      total: count ?? filtered.length,
      offset,
      limit,
    };
  }

  async listApprovedRedemptions(
    merchantId: number,
    filters: MerchantAuditFeedFilters,
  ): Promise<MerchantApprovedRedemptionsResponse["data"]> {
    const limit = filters.limit ?? RedemptionService.DEFAULT_LIMIT;
    const offset = filters.offset ?? 0;

    const { data, error, count } = await supabaseAdmin
      .from("customer_credit_redemptions")
      .select(
        `${QueryFragments.BASE_CUSTOMER_CREDIT_REDEMPTION},
         merchant:merchants!inner(${QueryFragments.BASE_MERCHANT}),
         customer:customers(${QueryFragments.BASE_CUSTOMER}, users(${QueryFragments.BASE_USER_PROFILE})),
         branch:branches(${QueryFragments.BASE_BRANCH}),
         approved_by_staff:staff(${QueryFragments.BASE_STAFF})` as const,
        { count: "exact" },
      )
      .eq("merchant_id", merchantId)
      .not("approved_at", "is", null)
      .is("deleted_at", null)
      .order("approved_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to load approved redemptions: ${error.message}`);
    }
    return {
      rows: data ?? [],
      total: count ?? 0,
      offset,
      limit,
    };
  }

  async listRejectedRedemptions(
    merchantId: number,
    filters: MerchantAuditFeedFilters,
  ): Promise<MerchantRejectedRedemptionsResponse["data"]> {
    const limit = filters.limit ?? RedemptionService.DEFAULT_LIMIT;
    const offset = filters.offset ?? 0;

    const { data, error, count } = await supabaseAdmin
      .from("customer_credit_redemptions")
      .select(
        `${QueryFragments.BASE_CUSTOMER_CREDIT_REDEMPTION},
         merchant:merchants!inner(${QueryFragments.BASE_MERCHANT}),
         customer:customers(${QueryFragments.BASE_CUSTOMER}, users(${QueryFragments.BASE_USER_PROFILE})),
         branch:branches(${QueryFragments.BASE_BRANCH})` as const,
        { count: "exact" },
      )
      .eq("merchant_id", merchantId)
      .not("rejected_at", "is", null)
      .is("deleted_at", null)
      .order("rejected_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to load rejected redemptions: ${error.message}`);
    }
    return {
      rows: data ?? [],
      total: count ?? 0,
      offset,
      limit,
    };
  }

  // Atomic RPC: verifies redemption_code, stamps approved_at + approved_by_staff_id, moves pending→approved on every touched credit, stamps redemption_approval_staff_id. Manager-only (enforced at the route). Response deliberately does NOT echo the code — the merchant already supplied it. Mismatched code → 400 (RPC raises P0001).
  async approveRequest(
    user: AccessTokenPayload,
    merchantId: number,
    customerId: number,
    body: MerchantRedemptionActionBody,
  ): Promise<MerchantRedemptionMutationResponse> {
    const staffId = user.staff_id;
    if (staffId == null) {
      throw new Error("Authenticated user has no staff_id");
    }
    const { data, error } = await supabaseAdmin.rpc("redemption_approve", {
      p_customer_id: customerId,
      p_merchant_id: merchantId,
      p_staff_id: staffId,
      p_redemption_code: body.redemption_code,
    });
    if (error) {
      throw new Error(`Approve failed: ${error.message}`);
    }
    const first = (data ?? [])[0];
    if (!first) {
      throw new Error("No pending request at this merchant");
    }
    return {
      success: true,
      data: {
        audit_id: Number(first.audit_id),
        amount_redeemed: Number(first.amount_redeemed) || 0,
      },
    };
  }

  // Atomic RPC: verifies redemption_code, stamps rejected_at, zeroes pending_redemption_amount on every touched credit. Manager-only. Response does NOT echo the code.
  async rejectRequest(
    merchantId: number,
    customerId: number,
    body: MerchantRedemptionActionBody,
  ): Promise<MerchantRedemptionMutationResponse> {
    const { data, error } = await supabaseAdmin.rpc("redemption_reject", {
      p_customer_id: customerId,
      p_merchant_id: merchantId,
      p_redemption_code: body.redemption_code,
    });
    if (error) {
      throw new Error(`Reject failed: ${error.message}`);
    }
    const first = (data ?? [])[0];
    if (!first) {
      throw new Error("No pending request at this merchant");
    }
    return {
      success: true,
      data: {
        audit_id: Number(first.audit_id),
        amount_redeemed: Number(first.amount_redeemed) || 0,
      },
    };
  }
}

export const redemptionService = new RedemptionService();
