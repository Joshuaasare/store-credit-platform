import { supabaseAdmin } from "../utils/supabase.client";
import { QueryFragments } from "../constants/queryFragments";
import {
  CustomerCreditStatus,
  CustomerCreditType,
  CustomerCreditWithBranch,
  CustomerCredits,
} from "../schemas/customerCredits.schema";

// The redemption slice lives on the credit row (pending_redemption_amount / approved_redemption_amount) — no SUM-of-audit-table. redeemed_total / pending_total are back-compat aliases. Split into live / expired server-side: live = not deleted/revoked, expires_at null or future; expired = revoked or past expires_at (deleted dropped).
export class CustomerCreditsService {
  async getMyCredits(customerId: number): Promise<CustomerCredits> {
    // One round-trip: both buckets come from this result set — no second SUM query, no aggregation drift.
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

      // No FK from customer_credit to either config table; only running issuance writes here today. Default to "running".
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

    // Live: most remaining first (most actionable). Expired: most recently created first.
    live.sort((a, b) => b.remaining - a.remaining);
    expired.sort((a, b) => b.id - a.id);

    return { live, expired };
  }
}

export const customerCreditsService = new CustomerCreditsService();
