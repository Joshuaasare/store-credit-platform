import { supabaseAdmin } from "../utils/supabase.client";
import { QueryFragments } from "../constants/queryFragments";
import { branchService } from "./branch.service";
import { fetchFavoriteCounts } from "./customerConfigInteractions.service";
import { shapeFixedConfig, shapeRunningConfig } from "../utils/creditConfig.utils";
import {
  NearbyOfferRow,
  NearbyOffersFilters,
  NearbyOffersPage,
  OfferBranchesData,
} from "../types/customerOffers.types";
import type { BranchWithOffers } from "../types/branch.types";
import { BaseFixedCreditConfig, BaseRunningCreditConfig } from "../types/main.types";

export type CustomerOfferConfigType = "running" | "fixed";

const offerKey = (configType: CustomerOfferConfigType, configId: number) =>
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

  async getOfferBranches(
    configType: CustomerOfferConfigType,
    configId: number,
    lat: number | null,
    lng: number | null,
  ): Promise<OfferBranchesData> {
    const config =
      configType === "running"
        ? await this.loadRunningConfig(configId)
        : await this.loadFixedConfig(configId);
    const all = await branchService.getBranchesByLocation({
      lat,
      lng,
      limit: Number.MAX_SAFE_INTEGER,
      offset: 0,
    });
    const branches = all.rows.filter((b) =>
      configType === "running"
        ? b.running_configs.some((c) => c.id === configId)
        : b.fixed_configs.some((c) => c.id === configId),
    );
    return { config, branches };
  }

  private async loadRunningConfig(
    configId: number,
  ): Promise<BaseRunningCreditConfig & { favorite_count: number }> {
    const { data, error } = await supabaseAdmin
      .from("running_credit_config")
      .select(QueryFragments.BASE_RUNNING_CREDIT_CONFIG)
      .eq("id", configId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(`Failed to load offer: ${error.message}`);
    if (!data) throw new Error("Offer not found");
    const counts = await fetchFavoriteCounts([configId], []);
    const { branches: _branches, ...config } = shapeRunningConfig(data);
    return { ...config, favorite_count: counts.running.get(configId) ?? 0 };
  }

  private async loadFixedConfig(
    configId: number,
  ): Promise<BaseFixedCreditConfig & { favorite_count: number }> {
    const { data, error } = await supabaseAdmin
      .from("fixed_credit_config")
      .select(QueryFragments.BASE_FIXED_CREDIT_CONFIG)
      .eq("id", configId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(`Failed to load offer: ${error.message}`);
    if (!data) throw new Error("Offer not found");
    const counts = await fetchFavoriteCounts([], [configId]);
    const { branches: _branches, ...config } = shapeFixedConfig(data);
    return { ...config, favorite_count: counts.fixed.get(configId) ?? 0 };
  }
}

export const customerOffersService = new CustomerOffersService();