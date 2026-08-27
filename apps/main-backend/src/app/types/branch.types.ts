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
}

// Branch + its active running/fixed credit configs + nearest distance. Flat shape — branch
// fields at top level, not nested under `branch.`. The frontend can group by config_group_id
// to derive an offers-centric view.
export type BranchWithOffers = BaseBranch & {
  merchant: BaseMerchant | null;
  running_configs: BaseRunningCreditConfig[];
  fixed_configs: BaseFixedCreditConfig[];
  distance_km: number | null;
};

export interface BranchesByLocationResponse {
  success: true;
  data: BranchWithOffers[];
}

export interface NearbyBranchesQuerystring {
  lat: number;
  lng: number;
}

export interface SearchBranchesQuerystring {
  lat: number;
  lng: number;
  q: string;
}

export type BranchListApiResponse = BranchListResponse | ApiErrorResponse;
export type BranchMutationApiResponse =
  | BranchMutationResponse
  | ApiErrorResponse;
export type BranchesByLocationApiResponse =
  | BranchesByLocationResponse
  | ApiErrorResponse;