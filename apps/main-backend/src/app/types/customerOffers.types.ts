import {
  ApiErrorResponse,
  BaseBranch,
  BaseFixedCreditConfig,
  BaseRunningCreditConfig,
} from "./main.types";
import { BranchWithOffers } from "./branch.types";

export interface OfferMerchantSummary {
  id: number;
  name: string | null;
  logo_url: string | null;
}

export type NearbyOfferConfig =
  | (BaseRunningCreditConfig & { favorite_count: number })
  | (BaseFixedCreditConfig & { favorite_count: number });

// One offer = one config, deduped across the branches that run it. The branch
// is the nearest branch offering the config; the merchant summary is surfaced
// so cards can render name + logo without another query.
export type NearbyOfferRow =
  | {
      config_type: "running";
      config: BaseRunningCreditConfig & { favorite_count: number };
      merchant: OfferMerchantSummary | null;
      branch: BaseBranch;
      distance_km: number | null;
    }
  | {
      config_type: "fixed";
      config: BaseFixedCreditConfig & { favorite_count: number };
      merchant: OfferMerchantSummary | null;
      branch: BaseBranch;
      distance_km: number | null;
    };

export interface NearbyOffersFilters {
  lat: number | null;
  lng: number | null;
  limit?: number;
  offset?: number;
}

export interface NearbyOffersPage {
  rows: NearbyOfferRow[];
  total: number;
  offset: number;
  limit: number;
}

export interface NearbyOffersResponse {
  success: true;
  data: NearbyOffersPage;
}

export interface OfferBranchesData {
  config: NearbyOfferConfig;
  branches: BranchWithOffers[];
}

export interface OfferBranchesResponse {
  success: true;
  data: OfferBranchesData;
}

export type NearbyOffersApiResponse = NearbyOffersResponse | ApiErrorResponse;
export type OfferBranchesApiResponse = OfferBranchesResponse | ApiErrorResponse;