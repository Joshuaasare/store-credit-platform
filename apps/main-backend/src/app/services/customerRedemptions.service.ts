import { supabaseAdmin } from "../utils/supabase.client";
import { QueryFragments } from "../constants/queryFragments";
import {
  CustomerRedemptionRow,
  CustomerRedemptionStatusFilter,
} from "../types/customerRedemptions.types";

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

/**
 * Customer-app redemptions service — the data behind the "Credits Redeemed"
 * tab on the merchant detail screen on the customer mobile app.
 *
 * Two operations:
 *   - `listMyRedemptionsAtMerchant(customerId, { merchantId, status })`
 *     pulls every non-deleted redemption the customer has at the given
 *     merchant (scoped through `branches` since redemptions don't carry
 *     a `merchant_id`). Status filter narrows the row set; "all" returns
 *     the merged pending + approved + rejected stream.
 *
 *   - `cancelMyRedemption(id, customerId)` soft-deletes a pending
 *     redemption, asserting (a) the row exists and is not already
 *     deleted, (b) it belongs to the caller, (c) it has not been
 *     approved or rejected yet. Terminal states return 409.
 *
 * All reads use the generated `database.types.ts` types natively — no
 * `any` / `as` casts on the Supabase builders or results.
 */
export class CustomerRedemptionsService {
  /**
   * List the customer's redemptions at a given merchant. Resolves the
   * merchant's branches first (small subquery), then scopes the redemption
   * list to those branches via `branch_id IN (...)`. Status filter narrows
   * the row set on the `approved_at` / `rejected_at` columns.
   *
   * Returns rows newest-first by `created_at`.
   */
  async listMyRedemptionsAtMerchant(
    customerId: number,
    options: {
      merchantId: number;
      status: CustomerRedemptionStatusFilter;
    },
  ): Promise<CustomerRedemptionRow[]> {
    // 1. Resolve the merchant's branch IDs (small subquery). If the merchant
    //    has no branches, the redemption list is empty by construction.
    const { data: branchRows, error: branchError } = await supabaseAdmin
      .from("branches")
      .select("id")
      .eq("merchant_id", options.merchantId)
      .is("deleted_at", null);
    if (branchError) {
      throw new Error(
        `Failed to resolve merchant branches: ${branchError.message}`,
      );
    }
    const branchIds = (branchRows ?? []).map((b) => b.id);
    if (branchIds.length === 0) {
      return [];
    }

    // 2. Build the redemption list query — same composed join as the
    //    merchant-side service, minus the redundant `customer` join
    //    (the caller IS the customer).
    let query = supabaseAdmin
      .from("customer_credit_redemptions")
      .select(
        `${QueryFragments.BASE_CUSTOMER_CREDIT_REDEMPTION},branch:branches(${QueryFragments.BASE_BRANCH},merchant:merchants(${QueryFragments.BASE_MERCHANT})),credit:customer_credit(${QueryFragments.BASE_CUSTOMER_CREDIT})`,
      )
      .eq("customer_id", customerId)
      .in("branch_id", branchIds)
      .is("deleted_at", null);

    if (options.status === "pending") {
      query = query.is("approved_at", null).is("rejected_at", null);
    } else if (options.status === "approved") {
      query = query.not("approved_at", "is", null);
    } else if (options.status === "rejected") {
      query = query.not("rejected_at", "is", null);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to load redemptions: ${error.message}`);
    }
    return (data ?? []) as CustomerRedemptionRow[];
  }

  /**
   * Soft-cancel a pending redemption. Returns a tagged result so the route
   * can map the failure to a 4xx status without throwing.
   */
  async cancelMyRedemption(
    redemptionId: number,
    customerId: number,
  ): Promise<
    | { ok: true }
    | {
        ok: false;
        status: 403 | 404 | 409;
        error: string;
      }
  > {
    // 1. Load the row (id + ownership + state). Stripped select — we don't
    //    need the joined branch/credit for the ownership/state checks.
    const { data, error } = await supabaseAdmin
      .from("customer_credit_redemptions")
      .select("id, customer_id, approved_at, rejected_at, deleted_at")
      .eq("id", redemptionId)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to load redemption: ${error.message}`);
    }
    if (!data || data.deleted_at !== null) {
      return { ok: false, status: 404, error: "Not found" };
    }
    if (data.customer_id !== customerId) {
      return { ok: false, status: 403, error: "Forbidden" };
    }
    if (data.approved_at !== null) {
      return {
        ok: false,
        status: 409,
        error: "Cannot cancel an approved redemption",
      };
    }
    if (data.rejected_at !== null) {
      return {
        ok: false,
        status: 409,
        error: "Redemption is already rejected",
      };
    }

    // 2. Soft-delete with a double-guard so we never overwrite an
    //    already-deleted / already-decided row (a concurrent approve or
    //    cancel could have moved this row out from under us).
    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("customer_credit_redemptions")
      .update({ deleted_at: nowIso })
      .eq("id", redemptionId)
      .is("deleted_at", null)
      .is("approved_at", null)
      .is("rejected_at", null);
    if (updateError) {
      throw new Error(
        `Failed to cancel redemption: ${updateError.message}`,
      );
    }
    return { ok: true };
  }
}

export const customerRedemptionsService = new CustomerRedemptionsService();
