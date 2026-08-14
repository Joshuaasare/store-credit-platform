import type { CustomerCreditWithBranch } from "@store-credit-platform/api-services";

export { formatExpiryDistance } from "../../../shared/utils/credits.utils";

/**
 * A merchant-level bucket of the customer's live credits. One card on the
 * Credits screen renders one bucket. The bucketing rule is "merchant
 * wins": every credit at any branch of the same merchant aggregates into
 * the same bucket, regardless of `running_credit_config.cumulative_scope`.
 * Branches are summed as a view layer — the underlying `customer_credit`
 * rows still resolve at the branch level when spent.
 */
export interface MerchantCreditBucket {
  merchantId: number;
  merchantName: string;
  logoUrl: string | null;
  /** Sum of `remaining` across all live credit rows at this merchant. */
  totalRemaining: number;
  /** The credit row with the soonest non-null `expires_at`. Drives the urgency line. */
  soonest: CustomerCreditWithBranch | null;
  /** All live credit rows that contributed to the bucket (sorted by expiry, soonest first). */
  credits: CustomerCreditWithBranch[];
}

/**
 * Group live credit rows by merchant.
 *
 *   - Stable order: merchants appear in the order of their soonest
 *     contribution's `created_at` (most recently created credit wins on
 *     tie), which keeps the list predictable as new credits arrive.
 *   - `soonest` is the credit with the earliest non-null `expires_at`;
 *     `null` only if every contributing credit has `expires_at = null`.
 *   - Each bucket's `credits` array is sorted by `expires_at ASC NULLS LAST`
 *     so the detail screen can render the same ordering without resorting.
 */
export function aggregateLiveByMerchant(
  live: CustomerCreditWithBranch[],
): MerchantCreditBucket[] {
  const bucketsByMerchant = new Map<string, MerchantCreditBucket>();

  for (const credit of live) {
    const merchant = credit.branch.merchant;
    const merchantKey = String(merchant.id);
    const existing = bucketsByMerchant.get(merchantKey);
    if (existing) {
      existing.totalRemaining += credit.remaining;
      existing.credits.push(credit);
    } else {
      bucketsByMerchant.set(merchantKey, {
        merchantId: merchant.id,
        merchantName: merchant.name,
        logoUrl: merchant.logo_url,
        totalRemaining: credit.remaining,
        soonest: credit,
        credits: [credit],
      });
    }
  }

  const buckets = Array.from(bucketsByMerchant.values());

  for (const bucket of buckets) {
    bucket.credits.sort(compareByExpiryAsc);

    const nextSoonest = bucket.credits
      .map((c) => ({ credit: c, expiresAt: c.expires_at }))
      .filter(
        (entry): entry is { credit: CustomerCreditWithBranch; expiresAt: number } =>
          entry.expiresAt !== null,
      )
      .sort((a, b) => a.expiresAt - b.expiresAt)[0];

    bucket.soonest = nextSoonest?.credit ?? null;
  }

  // Sort the bucket list by the soonest contribution's `created_at` DESC so
  // a freshly-issued credit at any branch promotes its merchant to the top.
  buckets.sort((a, b) => {
    const aCreated = a.credits[0]?.created_at ?? "";
    const bCreated = b.credits[0]?.created_at ?? "";
    return Date.parse(bCreated) - Date.parse(aCreated);
  });

  return buckets;
}

function compareByExpiryAsc(
  a: CustomerCreditWithBranch,
  b: CustomerCreditWithBranch,
): number {
  if (a.expires_at === null && b.expires_at === null) return 0;
  if (a.expires_at === null) return 1;
  if (b.expires_at === null) return -1;
  return a.expires_at - b.expires_at;
}
