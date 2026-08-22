import { ApiErrorResponse, BaseBranch } from "./main.types";

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
}

export type BranchListApiResponse = BranchListResponse | ApiErrorResponse;
export type BranchMutationApiResponse =
  | BranchMutationResponse
  | ApiErrorResponse;
