import { supabaseAdmin } from "../utils/supabase.client";
import { QueryFragments } from "../constants/queryFragments";
import {
  CustomerCreditStatus,
  CustomerCreditType,
  CustomerCreditWithBranch,
  CustomerCredits,
} from "../schemas/customerCredits.schema";

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

/**
 * Customer-app credits service — the data behind the Credits tab.
 *
 * Reads `customer_credit` rows for the logged-in customer, joins each to its
 * `branch` (and through `branch.merchant_id` to `merchants` for the merchant
 * display name). After the row-state collapse the redemption slice lives on
 * the credit row itself — `pending_redemption_amount` and
 * `approved_redemption_amount` are columns, no SUM-of-audit-table needed.
 *
 * `redeemed_total` / `pending_total` are kept on the composed row as back-compat
 * aliases of those two columns so older frontend code keeps compiling.
 *
 * The result is split into `live` and `expired` arrays on the server so the
 * client can render the two top-level tabs directly without re-bucketing:
 *   - live    → not deleted, not revoked, expires_at null or in the future
 *   - expired → revoked, OR expires_at in the past (deleted rows are dropped)
 *
 * All reads use the generated `database.types.ts` types natively (no `any` /
 * `as` casts on the Supabase builders). The composed return shape mirrors the
 * `select(...)` fragment so column additions to BASE_CUSTOMER_CREDIT /
 * BASE_BRANCH / BASE_MERCHANT auto-propagate.
 */
export class CustomerCreditsService {
  /**
   * Load the logged-in customer's credits, split into live / expired.
   *
   * @param customerId The numeric `customers.id` resolved from the JWT
   *   (`request.user.customer_id`). The route layer guarantees this is
   *   non-null before calling.
   */
  async getMyCredits(customerId: number): Promise<CustomerCredits> {
    // 1. Pull every non-deleted credit row for this customer, joined to its
    //    branch + the branch's merchant in a single query. We do NOT filter
    //    on revoked_at / expires_at here — both buckets (live + expired)
    //    come from this one result set, and the bucketing logic below is
    //    cheap and explicit.
    //
    //    The redemption slice is read directly off the row
    //    (`approved_redemption_amount`, `pending_redemption_amount`) — there
    //    is no second SUM query anymore. This is a strict improvement:
    //    one round-trip, no aggregation drift between row and audit.
    const { data: creditRows, error: creditErr } = await supabaseAdmin
      .from("customer_credit")
      .select(
        `${QueryFragments.BASE_CUSTOMER_CREDIT},branch:branches(${QueryFragments.BASE_BRANCH},merchant:merchants(${QueryFragments.BASE_MERCHANT}))`,
      )
      .eq("customer_id", customerId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (creditErr) {
      throw new Error(`Failed to load credits: ${creditErr.message}`);
    }

    const credits = creditRows ?? [];

    // 2. Bucket + derive aggregates from the row columns. The composed row
    //    already carries the nested branch/merchant join from the select
    //    fragment; we only add the derived top-level fields. `redeemed_total`
    //    / `pending_total` are kept as back-compat aliases of the column
    //    reads so older frontend code keeps working.
    const nowEpoch = Math.floor(Date.now());
    const live: CustomerCreditWithBranch[] = [];
    const expired: CustomerCreditWithBranch[] = [];

    for (const row of credits) {
      const creditAmount = Number(row.credit_amount) || 0;
      const approvedTotal = Number(row.approved_redemption_amount) || 0;
      const pendingTotal = Number(row.pending_redemption_amount) || 0;
      const remaining = Math.max(0, creditAmount - approvedTotal - pendingTotal);

      let status: CustomerCreditStatus;
      if (row.revoked_at != null) {
        status = "revoked";
      } else if (row.expires_at != null && Number(row.expires_at) <= nowEpoch) {
        status = "expired";
      } else {
        status = "live";
      }

      // credit_type: the schema has no FK from customer_credit to either
      // config table, and only `issueRunningCreditsForPurchase` writes here
      // today. Default to "running"; a future fixed-issuance flow will need
      // to populate this field (see customerCredits.types.ts note).
      const creditType: CustomerCreditType = "running";

      const composed: CustomerCreditWithBranch = {
        ...row,
        redeemed_total: approvedTotal,
        pending_total: pendingTotal,
        remaining,
        status,
        credit_type: creditType,
      };

      if (status === "live") {
        live.push(composed);
      } else {
        expired.push(composed);
      }
    }

    // Live: most remaining first (most actionable to the customer).
    // Expired: most recently created first (most recently alive).
    live.sort((a, b) => b.remaining - a.remaining);
    expired.sort((a, b) => b.id - a.id);

    return { live, expired };
  }
}

export const customerCreditsService = new CustomerCreditsService();
