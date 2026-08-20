import type { CustomerCreditsApiResponse } from "@store-credit-platform/api-services";
import { formatGhs } from "../../shared/utils/formatGhs";

// Each live credit is an offer entry point. De-duplicated by merchant name,
// capped at 4 so the grid stays a tight 2-up.
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
      continue;
    }
    if (out.length >= 4) break;
  }
  return out;
}
