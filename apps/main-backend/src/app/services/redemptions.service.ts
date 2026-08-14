import { supabaseAdmin } from "../utils/supabase.client";
import { QueryFragments } from "../constants/queryFragments";
import { AccessTokenPayload } from "../schemas/auth.schema";
import {
  MerchantApprovedRedemption,
  MerchantApprovedRedemptionsResponse,
  MerchantAuditFeedFilters,
  MerchantPendingRequest,
  MerchantPendingRequestFilters,
  MerchantPendingRequestsPage,
  MerchantPendingRequestsResponse,
  MerchantRedemptionMutationResponse,
  MerchantRejectedRedemption,
  MerchantRejectedRedemptionsResponse,
} from "../schemas/redemptions.schema";

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

/**
 * Merchant-side redemption approval queue.
 *
 * Three views on the customer-initiated flow:
 *
 *   1. Pending — implicit set of `customer_credit` rows at the merchant
 *                with `pending_redemption_amount > 0`. There is one
 *                Pending row per (customer, merchant) pair; the per-credit
 *                breakdown is the fan-out across that customer's credits.
 *
 *   2. Approved — audit feed from `customer_credit_redemptions` where
 *                 `approved_at IS NOT NULL`.
 *
 *   3. Rejected — audit feed from `customer_credit_redemptions` where
 *                 `rejected_at IS NOT NULL`.
 *
 * Approve / reject are atomic single-call SQL RPCs
 * (`redemption_approve`, `redemption_reject`) — they write the audit row +
 * update every touched `customer_credit` row in one transaction.
 */
export class RedemptionService {
  private static readonly DEFAULT_LIMIT = 20;

  /**
   * Pending requests at the merchant. One row per (customer, merchant) pair
   * that has any customer_credit row with pending_redemption_amount > 0.
   * Sorted by oldest-touched-credit-created-at (so the longest-waiting
   * request surfaces first) then by customer_id for stability.
   */
  async listPendingRedemptions(
    merchantId: number,
    filters: MerchantPendingRequestFilters,
  ): Promise<MerchantPendingRequestsPage> {
    const limit = filters.limit ?? RedemptionService.DEFAULT_LIMIT;
    const offset = filters.offset ?? 0;

    // 1. Resolve the merchant's branch IDs. The pending view scopes through
    //    branches — `customer_credit` carries branch_id, not merchant_id.
    const branchIds = await this.resolveMerchantBranchIds(merchantId);
    if (branchIds.length === 0) {
      return { rows: [], total: 0, offset, limit };
    }
    const scopedBranchIds =
      filters.branch_id != null && branchIds.includes(filters.branch_id)
        ? [filters.branch_id]
        : branchIds;

    // 2. Pull the touched credit rows (one row per pending credit slice,
    //    multiple rows per customer is fine — they fan out the breakdown).
    //    Sorted to match the SQL fan-out order so the breakdown reads in
    //    the order the merchant's UI will display it.
    const { data: creditRows, error: creditErr } = await supabaseAdmin
      .from("customer_credit")
      .select(
        `${QueryFragments.BASE_CUSTOMER_CREDIT},branch:branches(${QueryFragments.BASE_BRANCH})`,
      )
      .in("branch_id", scopedBranchIds)
      .gt("pending_redemption_amount", 0)
      .is("deleted_at", null)
      .order("expires_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (creditErr) {
      throw new Error(`Failed to load pending redemptions: ${creditErr.message}`);
    }

    const rows = creditRows ?? [];

    // 3. Group by customer_id, build the Pending view.
    const byCustomer = new Map<
      number,
      {
        requested_amount: number;
        pending_credit_breakdown: MerchantPendingRequest["pending_credit_breakdown"];
        requested_at: string | null;
      }
    >();

    for (const row of rows) {
      const pending = Number(row.pending_redemption_amount) || 0;
      if (pending <= 0) continue;
      const bucket = byCustomer.get(row.customer_id) ?? {
        requested_amount: 0,
        pending_credit_breakdown: [],
        requested_at: null,
      };
      bucket.requested_amount += pending;
      bucket.pending_credit_breakdown.push(
        row as MerchantPendingRequest["pending_credit_breakdown"][number],
      );
      // requested_at = oldest touched credit's created_at
      if (bucket.requested_at == null || row.created_at < bucket.requested_at) {
        bucket.requested_at = row.created_at;
      }
      byCustomer.set(row.customer_id, bucket);
    }

    // 4. Hydrate customer + merchant rows in two batched queries. The merchant
    //    is constant; the customers are the distinct customer_ids.
    const customerIds = Array.from(byCustomer.keys());
    const { data: customers, error: customersErr } = await supabaseAdmin
      .from("customers")
      .select(
        `${QueryFragments.BASE_CUSTOMER},users(${QueryFragments.BASE_USER_PROFILE})`,
      )
      .in("id", customerIds);
    if (customersErr) {
      throw new Error(`Failed to load customers: ${customersErr.message}`);
    }

    const { data: merchantRow, error: merchantErr } = await supabaseAdmin
      .from("merchants")
      .select(QueryFragments.BASE_MERCHANT)
      .eq("id", merchantId)
      .maybeSingle();
    if (merchantErr || !merchantRow) {
      throw new Error(`Failed to load merchant: ${merchantErr?.message ?? "not found"}`);
    }

    // 5. Build the page rows. Sort by oldest-requested-at desc so the
    //    longest-waiting request surfaces first.
    const composed: MerchantPendingRequest[] = [];
    for (const [customerId, bucket] of byCustomer.entries()) {
      const customer = (customers ?? []).find((c) => c.id === customerId);
      if (!customer) continue;
      composed.push({
        customer_id: customerId,
        requested_amount: bucket.requested_amount,
        pending_credit_breakdown: bucket.pending_credit_breakdown,
        requested_at: bucket.requested_at ?? new Date().toISOString(),
        customer: customer as MerchantPendingRequest["customer"],
        merchant: merchantRow,
      });
    }
    composed.sort((a, b) =>
      a.requested_at < b.requested_at ? -1 : a.requested_at > b.requested_at ? 1 : 0,
    );

    // 6. Paginate the composed list (the SQL fan-out row count is a strict
    //    upper bound on the customer count — drop pagination math on the
    //    ungrouped row set).
    const total = composed.length;
    const pageRows = composed.slice(offset, offset + limit);
    return { rows: pageRows, total, offset, limit };
  }

  /**
   * Approved audit feed — rows from `customer_credit_redemptions` with
   * `approved_at IS NOT NULL`, scoped to the merchant via the audit
   * row's `merchant_id` column, joined to customer + merchant + the
   * approving staff.
   */
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
         approved_by_staff:staff(${QueryFragments.BASE_STAFF})`,
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
      rows: (data ?? []) as unknown as MerchantApprovedRedemption[],
      total: count ?? 0,
      offset,
      limit,
    };
  }

  /**
   * Rejected audit feed — rows from `customer_credit_redemptions` with
   * `rejected_at IS NOT NULL`, scoped to the merchant via `merchant_id`.
   */
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
         customer:customers(${QueryFragments.BASE_CUSTOMER}, users(${QueryFragments.BASE_USER_PROFILE}))`,
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
      rows: (data ?? []) as unknown as MerchantRejectedRedemption[],
      total: count ?? 0,
      offset,
      limit,
    };
  }

  /**
   * Approve the pending request for a (customer, merchant) pair. Atomic
   * via the SQL RPC: writes the audit row + moves pending → approved +
   * stamps the staff id in one transaction. Manager-only (enforced at
   * the route via `requireRoles("manager")`).
   */
  async approveRequest(
    user: AccessTokenPayload,
    merchantId: number,
    customerId: number,
  ): Promise<MerchantRedemptionMutationResponse> {
    const staffId = user.staff_id;
    if (staffId == null) {
      throw new Error("Authenticated user has no staff_id");
    }
    const { data, error } = await supabaseAdmin.rpc("redemption_approve", {
      p_customer_id: customerId,
      p_merchant_id: merchantId,
      p_staff_id: staffId,
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

  /**
   * Reject the pending request for a (customer, merchant) pair. Atomic
   * via the SQL RPC: writes the rejected audit row + zeroes the pending
   * slice on every touched credit row.
   */
  async rejectRequest(
    merchantId: number,
    customerId: number,
  ): Promise<MerchantRedemptionMutationResponse> {
    const { data, error } = await supabaseAdmin.rpc("redemption_reject", {
      p_customer_id: customerId,
      p_merchant_id: merchantId,
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

  // ──────────────────────────────────────────────────────────────────────────
  // Response builders (kept for routes that need the wrapped success shape)
  // ──────────────────────────────────────────────────────────────────────────

  buildPendingResponse(page: MerchantPendingRequestsPage): MerchantPendingRequestsResponse {
    return { success: true, data: page };
  }

  buildApprovedResponse(page: MerchantApprovedRedemptionsResponse["data"]): MerchantApprovedRedemptionsResponse {
    return { success: true, data: page };
  }

  buildRejectedResponse(page: MerchantRejectedRedemptionsResponse["data"]): MerchantRejectedRedemptionsResponse {
    return { success: true, data: page };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

  private async resolveMerchantBranchIds(merchantId: number): Promise<number[]> {
    const { data, error } = await supabaseAdmin
      .from("branches")
      .select("id")
      .eq("merchant_id", merchantId)
      .is("deleted_at", null);
    if (error) {
      throw new Error(`Failed to resolve branches: ${error.message}`);
    }
    return (data ?? []).map((b) => b.id);
  }
}

export const redemptionService = new RedemptionService();
