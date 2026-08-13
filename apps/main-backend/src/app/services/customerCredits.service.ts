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
 * display name), and aggregates approved `customer_credit_redemptions` to
 * compute `redeemed_total` and `remaining` per credit.
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

    // 2. Fetch approved redemptions for these credit_ids in one shot. We
    //    only sum approved (approved_at IS NOT NULL) redemptions — pending
    //    and rejected rows do NOT reduce remaining credit.
    const creditIds = credits.map((c) => c.id);
    const redeemedByCredit = new Map<number, number>();
    if (creditIds.length > 0) {
      const { data: redemptionRows, error: redemptionErr } = await supabaseAdmin
        .from("customer_credit_redemptions")
        .select("credit_id, amount_redeemed")
        .in("credit_id", creditIds)
        .not("approved_at", "is", null)
        .is("deleted_at", null);
      if (redemptionErr) {
        throw new Error(`Failed to load redemptions: ${redemptionErr.message}`);
      }
      for (const r of redemptionRows ?? []) {
        const amt = Number(r.amount_redeemed) || 0;
        redeemedByCredit.set(
          r.credit_id,
          (redeemedByCredit.get(r.credit_id) ?? 0) + amt,
        );
      }
    }

    // 3. Bucket + attach aggregates. The composed row already carries the
    //    nested branch/merchant join from the select fragment; we only add
    //    the derived top-level fields.
    const nowEpoch = Math.floor(Date.now() / 1000);
    const live: CustomerCreditWithBranch[] = [];
    const expired: CustomerCreditWithBranch[] = [];

    for (const row of credits) {
      const creditAmount = Number(row.credit_amount) || 0;
      const redeemedTotal = redeemedByCredit.get(row.id) ?? 0;
      const remaining = Math.max(0, creditAmount - redeemedTotal);

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
        redeemed_total: redeemedTotal,
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
