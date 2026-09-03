import { branchService } from "./branch.service";
import {
  NearbyOfferRow,
  NearbyOffersFilters,
  NearbyOffersPage,
} from "../types/customerOffers.types";
import type { BranchWithOffers } from "../types/branch.types";


const offerKey = (configType: "running" | "fixed", configId: number) =>
  `${configType}:${configId}`;

// Flattens branches (already distance-sorted) into one row per config, deduped
// by (config_type, config_id) — the same config runs at every branch of its
// merchant, so the surviving row carries the nearest offering branch.
function flattenOffers(branches: BranchWithOffers[]): NearbyOfferRow[] {
  const seen = new Set<string>();
  const rows: NearbyOfferRow[] = [];
  for (const b of branches) {
    const merchant = b.merchant
      ? { id: b.merchant.id, name: b.merchant.name, logo_url: b.merchant.logo_url }
      : null;
    const {
      merchant: _m,
      running_configs: _r,
      fixed_configs: _f,
      distance_km: _d,
      ...branch
    } = b;
    for (const config of b.running_configs) {
      const key = offerKey("running", config.id);
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        config_type: "running",
        config,
        merchant,
        branch: { ...branch },
        distance_km: b.distance_km,
      });
    }
    for (const config of b.fixed_configs) {
      const key = offerKey("fixed", config.id);
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        config_type: "fixed",
        config,
        merchant,
        branch: { ...branch },
        distance_km: b.distance_km,
      });
    }
  }
  return rows;
}

// One offer per merchant first (each merchant's nearest offer, in distance
// order), then each merchant's remaining offers appended in the same merchant
// order — so the feed opens with a merchant spread before any merchant doubles.
function rankOffers(rows: NearbyOfferRow[]): NearbyOfferRow[] {
  const firstPass: NearbyOfferRow[] = [];
  const rest = new Map<number, NearbyOfferRow[]>();
  const seenMerchants = new Set<number>();
  for (const row of rows) {
    const merchantId = row.branch.merchant_id;
    if (!seenMerchants.has(merchantId)) {
      seenMerchants.add(merchantId);
      firstPass.push(row);
      continue;
    }
    const bucket = rest.get(merchantId);
    if (bucket) bucket.push(row);
    else rest.set(merchantId, [row]);
  }
  const ranked = [...firstPass];
  for (const merchantId of seenMerchants) {
    const bucket = rest.get(merchantId);
    if (bucket) ranked.push(...bucket);
  }
  return ranked;
}

export class CustomerOffersService {
  async getNearbyOffers(
    filters: NearbyOffersFilters,
  ): Promise<NearbyOffersPage> {
    const { lat, lng, limit = 20, offset = 0 } = filters;
    // The nearby-branch query IS the nearby-offer source; pull every branch in
    // range, then rank + paginate in JS because offers are deduped per config.
    const branchPage = await branchService.getBranchesByLocation({
      lat,
      lng,
      limit: Number.MAX_SAFE_INTEGER,
      offset: 0,
    });
    const ranked = rankOffers(flattenOffers(branchPage.rows));
    return {
      rows: ranked.slice(offset, offset + limit),
      total: ranked.length,
      offset,
      limit,
    };
  }
}

export const customerOffersService = new CustomerOffersService();