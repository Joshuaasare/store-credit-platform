import { supabaseAdmin } from "../utils/supabase.client";
import { QueryFragments } from "../constants/queryFragments";
import {
  CustomerActivitiesPage,
  CustomerActivity,
} from "../schemas/customerActivities.schema";

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

/**
 * Customer-app Home tab — Recent Activity feed.
 *
 * Returns a unified, time-ordered stream of "things that happened to this
 * customer's money" — issuances (`customer_credit` rows) and approved
 * redemptions (`customer_credit_redemptions` rows where `approved_at IS NOT
 * NULL`). Two kinds of rows are fetched in parallel, merged, sorted, and
 * sliced for cursor-based pagination.
 *
 * Why two parallel queries (not a SQL UNION): keeping them as two simple
 * `select(...)` calls lets the generated `database.types.ts` infer the full
 * row shape for each branch without an ad-hoc UNION column-type (PostgREST
 * unions collapse the per-branch select into a single row, which the
 * generated types can't infer well). The merge + sort cost is O(n log n)
 * over `2 * limit` rows — tiny for the page sizes here (≤ 50).
 *
 * Cursor semantics: `cursor` is the primary-key `id` of the last item from
 * the previous page. The service returns `nextCursor: null` when the page
 * contains fewer than `limit` items (i.e. the last page). The id is
 * sufficient for v1 because the page is small and the cursor is only used
 * to terminate fetching — it does not need to encode kind.
 *
 * All reads use the generated `database.types.ts` types natively (no `any` /
 * `as` casts on the Supabase builders). The composed return shape mirrors
 * the `select(...)` fragment so column additions to BASE_BRANCH /
 * BASE_MERCHANT auto-propagate through.
 */
export class CustomerActivitiesService {
  private static readonly DEFAULT_LIMIT = 20;
  private static readonly MAX_LIMIT = 50;

  /**
   * List the authenticated customer's activity rows, most recent first.
   *
   * @param customerId The numeric `customers.id` resolved from the JWT
   *   (`request.user.customer_id`). The route layer guarantees this is
   *   non-null before calling.
   * @param opts.cursor Numeric row id of the last item from the previous
   *   page; null/undefined for the first page.
   * @param opts.limit Page size, clamped to [1, MAX_LIMIT]; defaults to
   *   DEFAULT_LIMIT.
   */
  async listMyActivities(
    customerId: number,
    opts: { cursor?: number | null; limit?: number } = {},
  ): Promise<CustomerActivitiesPage> {
    const limit = Math.min(
      Math.max(1, opts.limit ?? CustomerActivitiesService.DEFAULT_LIMIT),
      CustomerActivitiesService.MAX_LIMIT,
    );
    const cursor = opts.cursor ?? null;

    // Fetch the two streams in parallel. The branch+merchant join shape is
    // identical for both — we then collapse each row into the discriminated
    // `CustomerActivity` union.
    const [issuances, redemptions] = await Promise.all([
      this.fetchIssuances(customerId, limit, cursor),
      this.fetchRedemptions(customerId, limit, cursor),
    ]);

    // Merge + sort by created_at desc (most recent first). The composed
    // `created_at` is a string (ISO timestamptz) — lexicographic comparison
    // is correct for ISO 8601 timestamps.
    const merged: CustomerActivity[] = [...issuances, ...redemptions].sort(
      (a, b) => b.created_at.localeCompare(a.created_at),
    );

    // Slice for the page. If the merged array is larger than `limit`,
    // there's a next page — take the first `limit` and emit the last id of
    // that page as the next cursor. Otherwise, no next page.
    if (merged.length <= limit) {
      return { items: merged, nextCursor: null };
    }
    const page = merged.slice(0, limit);
    const lastItem = page.at(-1);
    return { items: page, nextCursor: lastItem ? lastItem.id : null };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Fetch up to `limit + 1` non-deleted `customer_credit` rows for the
   * customer, joined to their issuing branch (and that branch's merchant),
   * ordered by `created_at` desc. We over-fetch by one to detect whether
   * the next page exists.
   */
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
      // Cursor on id — id is monotonically increasing for the customer's
      // own credit rows, and the page is already time-sorted. The frontend
      // always passes back the last id from the previous page, so this
      // yields the row immediately older than that page.
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

  /**
   * Fetch up to `limit + 1` APPROVED `customer_credit_redemptions` rows for
   * the customer, ordered by `approved_at` desc.
   *
   * The audit row carries `merchant_id` directly (set by the approve /
   * reject write path). We join `audit → merchants` to fetch the
   * merchant row, then a second-level `merchant → branches` join to
   * surface the merchant's primary branch. `branch` is informational for
   * the activity card ("redeemed at Acme — Legon branch"); the primary
   * branch is acceptable for v1 even though a merchant may have many —
   * the activity card surfaces merchant identity, not branch address.
   *
   * Approved rows have `approved_at IS NOT NULL` and are the only rows
   * that should appear in the customer's spend history — pending / rejected
   * rows are not yet part of the customer's money. Rows with a null
   * `merchant_id` (orphan audit rows from a deleted merchant, or legacy
   * rows from before the column existed) are skipped — there is no
   * merchant to display and the row cannot be surfaced.
   */
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
      // Defensive: the .not("merchant_id", "is", null) filter + the
      // !inner join guarantee the merchant shape, but TS still types the
      // nested embed as nullable. Skip rows that somehow lack it.
      const merchant = r.merchant;
      if (!merchant) continue;
      // merchant.branches is an array (the embedded FK has no
      // !inner() so Supabase returns all matched rows); pick the first
      // as the "primary branch" surfaced on the activity card.
      const branch = merchant.branches?.[0];
      if (!branch) continue;

      // approved_at is guaranteed non-null by the .not("approved_at", "is", null)
      // filter, but TypeScript still types it as nullable. Fall back to
      // created_at if the column ever comes back null (e.g. a data-migration
      // row that bypasses the filter).
      const displayCreatedAt = r.approved_at ?? r.created_at;
      out.push({
        kind: "credit_redeemed",
        id: r.id,
        amount: Number(r.amount_redeemed) || 0,
        merchant,
        branch,
        created_at: displayCreatedAt,
        // The audit row has no `credit_id` FK — we keep the field on
        // the response type for back-compat. Populate with the redemption's
        // own id (a stable identifier); consumers should not rely on it
        // post-collapse.
        credit_id: r.id,
        // No purchase_id FK exists in the schema — leave null until a
        // purchase join is added. The frontend treats null as "no purchase
        // context".
        purchase_id: null,
      });
    }
    return out;
  }
}

export const customerActivitiesService = new CustomerActivitiesService();
