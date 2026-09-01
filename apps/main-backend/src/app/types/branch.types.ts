import {
  ApiErrorResponse,
  BaseBranch,
  BaseFixedCreditConfig,
  BaseMerchant,
  BaseRunningCreditConfig,
  BranchCategoryValues,
} from "./main.types";

export interface BranchWithAggregates extends BaseBranch {
  staff_count: number;
  customer_count: number;
  credit_issued_this_month: number;
  last_activity_date: string | null;
}

export interface BranchListResponse {
  success: true;
  data: BranchWithAggregates[];
}

export interface BranchMutationResponse {
  success: true;
  data: BranchWithAggregates;
}

export interface CreateBranchRequest {
  name: string;
  phone?: string;
  address?: string;
  city: string;
  country_code: string;
  latitude?: number | null;
  longitude?: number | null;
  place_id?: string | null;
  category?: BranchCategoryValues | null;
  purchase_threshold_amount?: number | null;
}

export interface UpdateBranchRequest {
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  country_code?: string;
  latitude?: number | null;
  longitude?: number | null;
  place_id?: string | null;
  category?: BranchCategoryValues | null;
  purchase_threshold_amount?: number | null;
}

// Branch + its active running/fixed credit configs + nearest distance. Flat shape — branch
// fields at top level, not nested under `branch.`. Configs are sourced through the
// branch_running_credit_config / branch_fixed_credit_config junctions.
export type BranchWithOffers = BaseBranch & {
  merchant: BaseMerchant | null;
  running_configs: (BaseRunningCreditConfig & { favorite_count: number })[];
  fixed_configs: (BaseFixedCreditConfig & { favorite_count: number })[];
  distance_km: number | null;
};

export interface BranchesNearbyFilters {
  lat: number | null;
  lng: number | null;
  category?: BranchCategoryValues[] | null;
  limit?: number;
  offset?: number;
}

export interface BranchesNearbyPage {
  rows: BranchWithOffers[];
  total: number;
  offset: number;
  limit: number;
}

export interface BranchSearchFilters {
  lat: number | null;
  lng: number | null;
  query: string;
  limit?: number;
  offset?: number;
}

export type BranchSearchPage = BranchesNearbyPage;

// category arrives as a single string or a repeated-param array depending on the client;
// the handler normalizes both forms into BranchCategoryValues[].
export interface BranchesNearbyQuerystring {
  lat?: number;
  lng?: number;
  category?: BranchCategoryValues[] | BranchCategoryValues;
  limit?: number;
  offset?: number;
}

export interface BranchSearchQuerystring {
  lat?: number;
  lng?: number;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface BranchesNearbyResponse {
  success: true;
  data: BranchesNearbyPage;
}

export interface BranchSearchResponse {
  success: true;
  data: BranchSearchPage;
}

export type BranchListApiResponse = BranchListResponse | ApiErrorResponse;
export type BranchMutationApiResponse =
  | BranchMutationResponse
  | ApiErrorResponse;
export type BranchesNearbyApiResponse =
  | BranchesNearbyResponse
  | ApiErrorResponse;
export type BranchSearchApiResponse = BranchSearchResponse | ApiErrorResponse;