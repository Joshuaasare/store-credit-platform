import type { CustomerCreditWithBranch } from "@store-credit-platform/api-services";

export interface MerchantCreditBucket {
  merchantId: number;
  merchantName: string;
  logoUrl: string | null;
  totalRemaining: number;
  soonest: BucketCredit | null;
  credits: BucketCredit[];
}

// Named alias so the bucket's internal type can be tightened later without
// churning every consumer.
export type BucketCredit = CustomerCreditWithBranch;

// Buckets sorted by largest `totalRemaining` first; credits within each bucket
// by `expires_at` ASC NULLS LAST, then `created_at` ASC — matches the SQL
// fan-out order used by the merchant-side approval queue.
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

// Smallest non-null `expires_at`; falls back to the first lifetime credit.
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

// Mirrors the SQL fan-out order in the merchant approval queue.
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
