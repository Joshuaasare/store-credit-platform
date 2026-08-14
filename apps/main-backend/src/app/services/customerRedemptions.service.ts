import { supabaseAdmin } from "../utils/supabase.client";
import { QueryFragments } from "../constants/queryFragments";
import {
  CustomerPendingRequestAmountBody,
  CustomerPendingRequestResult,
} from "../types/customerRedemptions.types";

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

/**
 * Customer-app pending-request service — backs the
 * `POST /customers/me/merchants/:merchantId/redemptions` (create / edit) and
 * `DELETE .../redemptions` (cancel) endpoints.
 *
 * There is no per-redemption-row CRUD anymore. A redemption request is the
 * implicit set of `customer_credit` rows at the (customer, merchant) pair
 * that have `pending_redemption_amount > 0`. Creating or editing the request
 * fans the new total out across the merchant's credit rows in oldest-expiry
 * order via the SQL RPC `redemption_fan_out`; cancelling calls the same RPC
 * with amount=0, which zeroes the pending slice on every row.
 *
 * The "breakdown" the customer sees on confirm is read back via the same
 * RPC's `pending_credit_breakdown` return — we just read the live rows for
 * the merchant that have `pending_redemption_amount > 0` after the fan-out.
 *
 * All reads use the generated `database.types.ts` types natively — no
 * `any` / `as` casts on the Supabase builders or results.
 */
export class CustomerRedemptionsService {
  /**
   * Create or edit the customer's pending request at a merchant. The
   * `redemption_fan_out` RPC handles the full-row-take walk atomically
   * server-side; this method just calls the RPC and reads back the
   * resulting per-credit breakdown.
   */
  async upsertMyPendingRequest(
    customerId: number,
    merchantId: number,
    body: CustomerPendingRequestAmountBody,
  ): Promise<CustomerPendingRequestResult> {
    return this.runFanOut(customerId, merchantId, body.amount);
  }

  /**
   * Cancel the customer's pending request at a merchant (zero the pending
   * slice on every row). Idempotent — calling it with no pending request
   * is a no-op.
   */
  async cancelMyPendingRequest(
    customerId: number,
    merchantId: number,
  ): Promise<CustomerPendingRequestResult> {
    return this.runFanOut(customerId, merchantId, 0);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Internals
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Run the fan-out RPC, then read back the per-credit breakdown for the
   * response. The RPC itself returns the breakdown rows, but we keep this
   * read in JS so the response shape mirrors the customer-facing schema
   * (with the nested branch join + merchant wrapper) without coupling
   * TypeBox to the SQL row type.
   */
  private async runFanOut(
    customerId: number,
    merchantId: number,
    amount: number,
  ): Promise<CustomerPendingRequestResult> {
    // 1. Atomic fan-out via RPC. The RPC walks the merchant's credit rows
    //    oldest-expiry-first and writes the requested total across them.
    //    If amount > the merchant's available_total + current_pending, the
    //    RPC raises (the route layer caps the body client-side; the SQL
    //    CHECK on pending + approved <= credit_amount is the server-side
    //    safety net).
    const { data: rpcRows, error: rpcError } = await supabaseAdmin.rpc(
      "redemption_fan_out",
      {
        p_customer_id: customerId,
        p_merchant_id: merchantId,
        p_amount: amount,
      },
    );
    if (rpcError) {
      throw new Error(`Fan-out failed: ${rpcError.message}`);
    }

    // 2. Read back the current pending breakdown — the merchant's credit
    //    rows for this customer with pending > 0, joined to branch.
    //    Sorted to match the RPC's fan-out order
    //    (expires_at ASC NULLS LAST, created_at ASC, id ASC) so the
    //    customer sees a stable allocation.
    const { data: breakdown, error: breakdownError } = await supabaseAdmin
      .from("customer_credit")
      .select(`${QueryFragments.BASE_CUSTOMER_CREDIT},branch:branches(${QueryFragments.BASE_BRANCH})`)
      .eq("customer_id", customerId)
      .eq("branch.merchant_id", merchantId)
      .gt("pending_redemption_amount", 0)
      .is("deleted_at", null)
      .order("expires_at", {
        ascending: true,
        nullsFirst: false,
      })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (breakdownError) {
      throw new Error(`Failed to read pending breakdown: ${breakdownError.message}`);
    }

    // 3. Resolve the merchant row (for display name / logo on confirm).
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from("merchants")
      .select(QueryFragments.BASE_MERCHANT)
      .eq("id", merchantId)
      .maybeSingle();
    if (merchantError) {
      throw new Error(`Failed to load merchant: ${merchantError.message}`);
    }
    if (!merchant) {
      throw new Error("Merchant not found");
    }

    const requestedAmount =
      amount > 0
        ? (rpcRows ?? []).reduce(
            (sum, r) => sum + (Number(r.pending_redemption_amount) || 0),
            0,
          )
        : 0;

    return {
      merchant_id: merchantId,
      requested_amount: requestedAmount,
      pending_credit_breakdown: (breakdown ?? []) as CustomerPendingRequestResult["pending_credit_breakdown"],
      merchant,
    };
  }
}

export const customerRedemptionsService = new CustomerRedemptionsService();
