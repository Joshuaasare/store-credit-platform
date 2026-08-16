import type { CustomerCreditWithBranch } from "@store-credit-platform/api-services";

/**
 * One aggregate row per merchant — the customer's "money view" of their
 * credit at a single merchant. The home-screen Credits card and the
 * per-merchant detail screen both render from this shape.
 *
 * `credits` is the raw live credit rows in this bucket (newest first),
 * so the per-merchant detail screen can render a per-branch breakdown
 * without re-querying.
 *
 * `totalRemaining` is the sum of `remaining` across `credits` — the
 * big number rendered on the card.
 *
 * `soonest` is the credit that's expiring first (or the lifetime credit
 * if any of them has `expires_at = null`). The card's subtitle line
 * ("{amount} expires in N days") reads from this.
 */
export interface MerchantCreditBucket {
  merchantId: number;
  merchantName: string;
  logoUrl: string | null;
  totalRemaining: number;
  soonest: BucketCredit | null;
  credits: BucketCredit[];
}

/**
 * A live credit row in the bucket view. Equivalent to
 * `CustomerCreditWithBranch` today — kept as a named alias so the
 * bucket's internal type can be tightened later (e.g. dropping
 * `pending_redemption_amount` once the fan-out flow is fully removed
 * from the customer-facing surface) without churning every consumer.
 */
export type BucketCredit = CustomerCreditWithBranch;

/**
 * Group live credit rows by merchant and compute the headline numbers
 * for the home Credits screen + per-merchant detail screen.
 *
 * Sort order:
 *   1. Buckets with the largest `totalRemaining` first (so the most
 *      valuable card surfaces to the top of the list).
 *   2. Inside each bucket, credits are sorted by `expires_at` ASC NULLS
 *      LAST, then by `created_at` ASC — lifetime credits sink to the
 *      bottom, the soonest-to-expire credit rises to the top. This
 *      matches the SQL fan-out order used by the merchant-side
 *      approval queue.
 */
export function aggregateLiveByMerchant(
  live: CustomerCreditWithBranch[],
): MerchantCreditBucket[] {
  const buckets = new Map<number, CustomerCreditWithBranch[]>();
  for (const credit of live) {
    const merchantId = credit.branch.merchant.id;
    const list = buckets.get(merchantId) ?? [];
    list.push(credit);
    buckets.set(merchantId, list);
  }

  const composed: MerchantCreditBucket[] = [];
  for (const [merchantId, credits] of buckets.entries()) {
    const sorted = [...credits].sort(sortCreditsByExpiry);
    const totalRemaining = sorted.reduce(
      (s, c) => s + (Number(c.remaining) || 0),
      0,
    );
    const soonest = pickSoonest(sorted);
    const head = sorted[0];
    composed.push({
      merchantId,
      merchantName: head.branch.merchant.name,
      logoUrl: head.branch.merchant.logo_url ?? null,
      totalRemaining,
      soonest,
      credits: sorted,
    });
  }

  composed.sort((a, b) => b.totalRemaining - a.totalRemaining);
  return composed;
}

/**
 * Pick the "soonest to expire" credit from a bucket. Returns the credit
 * with the smallest non-null `expires_at`; if every credit has
 * `expires_at = null`, returns the first one (lifetime credit).
 */
function pickSoonest(credits: CustomerCreditWithBranch[]): BucketCredit | null {
  if (credits.length === 0) return null;
  const withExpiry = credits.filter((c) => c.expires_at != null);
  if (withExpiry.length === 0) {
    return credits[0];
  }
  return withExpiry.reduce((min, c) =>
    (c.expires_at ?? Infinity) < (min.expires_at ?? Infinity) ? c : min,
  );
}

/**
 * Sort credits: ASC by `expires_at` (nulls last), then ASC by
 * `created_at`. Mirrors the SQL fan-out order in the merchant
 * approval queue so the credit breakdown reads consistently across
 * the customer + merchant surfaces.
 */
function sortCreditsByExpiry(
  a: CustomerCreditWithBranch,
  b: CustomerCreditWithBranch,
): number {
  const aExp = a.expires_at ?? null;
  const bExp = b.expires_at ?? null;
  if (aExp == null && bExp != null) return 1;
  if (aExp != null && bExp == null) return -1;
  if (aExp != null && bExp != null) {
    if (aExp !== bExp) return aExp - bExp;
  }
  const aCreated = String(a.created_at ?? "");
  const bCreated = String(b.created_at ?? "");
  if (aCreated < bCreated) return -1;
  if (aCreated > bCreated) return 1;
  return 0;
}
