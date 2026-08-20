import { supabaseAdmin } from "../utils/supabase.client";
import { QueryFragments } from "../constants/queryFragments";
import {
  CustomerActivitiesPage,
  CustomerActivity,
} from "../schemas/customerActivities.schema";

// Two parallel queries (not a SQL union) so database.types.ts can infer each branch's row shape. Cursor = row id of the last item from the previous page; nextCursor is null on the last page.
export class CustomerActivitiesService {
  private static readonly DEFAULT_LIMIT = 20;
  private static readonly MAX_LIMIT = 50;

  async listMyActivities(
    customerId: number,
    opts: { cursor?: number | null; limit?: number } = {},
  ): Promise<CustomerActivitiesPage> {
    const limit = Math.min(
      Math.max(1, opts.limit ?? CustomerActivitiesService.DEFAULT_LIMIT),
      CustomerActivitiesService.MAX_LIMIT,
    );
    const cursor = opts.cursor ?? null;

    const [issuances, redemptions] = await Promise.all([
      this.fetchIssuances(customerId, limit, cursor),
      this.fetchRedemptions(customerId, limit, cursor),
    ]);

    // created_at is ISO timestamptz — lexicographic compare is correct for sort by created_at desc.
    const merged: CustomerActivity[] = [...issuances, ...redemptions].sort(
      (a, b) => b.created_at.localeCompare(a.created_at),
    );

    if (merged.length <= limit) {
      return { items: merged, nextCursor: null };
    }
    const page = merged.slice(0, limit);
    const lastItem = page.at(-1);
    return { items: page, nextCursor: lastItem ? lastItem.id : null };
  }

  // Over-fetch by one to detect whether a next page exists.
  private async fetchIssuances(
    customerId: number,
    limit: number,
    cursor: number | null,
  ): Promise<CustomerActivity[]> {
    let query = supabaseAdmin
      .from("customer_credit")
      .select(
        `${QueryFragments.BASE_CUSTOMER_CREDIT},branch:branches(${QueryFragments.BASE_BRANCH},merchant:merchants(${QueryFragments.BASE_MERCHANT}))`,
      )
      .eq("customer_id", customerId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (cursor != null) {
      query = query.lt("id", cursor);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to load issuances: ${error.message}`);
    }

    const rows = data ?? [];
    const out: CustomerActivity[] = [];
    for (const r of rows) {
      if (!r.branch) continue; // orphaned credit — skip
      out.push({
        kind: "credit_issued",
        id: r.id,
        amount: Number(r.credit_amount) || 0,
        merchant: r.branch.merchant,
        branch: r.branch,
        created_at: r.created_at,
        credit_id: r.id,
      });
    }
    return out;
  }

  // merchant_id is denormalized on the audit row; merchant.branches is an array (no !inner), so pick the first as the "primary branch" for the activity card. Skip rows with null merchant_id (orphan/legacy audit rows).
  private async fetchRedemptions(
    customerId: number,
    limit: number,
    cursor: number | null,
  ): Promise<CustomerActivity[]> {
    let query = supabaseAdmin
      .from("customer_credit_redemptions")
      .select(
        `${QueryFragments.BASE_CUSTOMER_CREDIT_REDEMPTION},
         merchant:merchants!inner(${QueryFragments.BASE_MERCHANT}, branches:branches(${QueryFragments.BASE_BRANCH}))`,
      )
      .eq("customer_id", customerId)
      .not("merchant_id", "is", null)
      .is("deleted_at", null)
      .not("approved_at", "is", null)
      .order("approved_at", { ascending: false })
      .limit(limit + 1);

    if (cursor != null) {
      query = query.lt("id", cursor);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to load redemptions: ${error.message}`);
    }

    const rows = data ?? [];
    const out: CustomerActivity[] = [];
    for (const r of rows) {
      // TS types the nested embed as nullable despite the !inner join + .not filter — skip rows that somehow lack it.
      const merchant = r.merchant;
      if (!merchant) continue;
      const branch = merchant.branches?.[0];
      if (!branch) continue;

      // approved_at is guaranteed non-null by the filter, but TS types it nullable — fall back to created_at defensively.
      const displayCreatedAt = r.approved_at ?? r.created_at;
      out.push({
        kind: "credit_redeemed",
        id: r.id,
        amount: Number(r.amount_redeemed) || 0,
        merchant,
        branch,
        created_at: displayCreatedAt,
        // The audit row has no credit_id FK — populate with the redemption's own id for back-compat; consumers should not rely on it post-collapse.
        credit_id: r.id,
        purchase_id: null,
      });
    }
    return out;
  }
}

export const customerActivitiesService = new CustomerActivitiesService();