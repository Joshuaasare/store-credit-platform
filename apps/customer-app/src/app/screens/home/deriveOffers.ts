import type { CustomerCreditsApiResponse } from "@store-credit-platform/api-services";
import { formatGhs } from "../../shared/utils/formatGhs";

/**
 * Derive Nearby Offers from the customer's credits data. Each live credit
 * is an entry point — we surface the merchant + a copy that uses the
 * running-credit percentage. We de-duplicate by merchant name and cap at
 * 4 cards so the grid stays a tight 2-up.
 */
export function deriveOffers(
  creditsData: CustomerCreditsApiResponse | undefined,
): Array<{
  merchantName: string;
  offerCopy: string;
  accent: string;
  logoUrl: string | null;
}> {
  if (!creditsData?.success) return [];
  const live = creditsData.data.live;
  if (live.length === 0) return [];

  const seen = new Set<string>();
  const out: Array<{
    merchantName: string;
    offerCopy: string;
    accent: string;
    logoUrl: string | null;
  }> = [];
  for (const c of live) {
    const merchantName = c.branch?.merchant?.name;
    if (!merchantName) continue;
    if (seen.has(merchantName)) continue;
    seen.add(merchantName);
    const logoUrl = c.branch?.merchant?.logo_url ?? null;
    // Copy: prefer a percent-style offer ("10% Back on every visit") —
    // we don't have the percent on the credit row itself, so we fall back
    // to a "Earn GH₵ X back" copy derived from the credit amount. The
    // accent text is the cedi amount, which pops in the brand primary.
    const amount = Number(c.credit_amount) || 0;
    if (amount > 0) {
      const formatted = formatGhs(amount);
      out.push({
        merchantName,
        offerCopy: `Earn ${formatted} back on your next visit`,
        accent: formatted,
        logoUrl,
      });
    } else {
      // No usable amount — skip rather than render a generic placeholder.
      continue;
    }
    if (out.length >= 4) break;
  }
  return out;
}
