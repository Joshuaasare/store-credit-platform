// My Store — merchant + branch API types (source of truth)
// After editing, run `yarn generate:types` to produce merchant.schema.ts
// and to mirror these types into the frontend api.types.ts files.

export interface MerchantBase {
  id: number;
  name: string;
  phone: string;
  country_code: string;
  slug: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MerchantWithStats extends MerchantBase {
  branch_count: number;
  staff_count: number;
  customer_count: number;
  lifetime_credit_issued: number;
  credit_pool_used: number;
  credit_pool_limit: number | null;
}

export interface BranchBase {
  id: number;
  merchant_id: number;
  name: string | null;
  phone: string | null;
  address: string | null;
  city: string;
  country_code: string;
  is_active: boolean;
  created_at: string;
}

export interface BranchWithAggregates extends BranchBase {
  staff_count: number;
  customer_count: number;
  credit_issued_this_month: number;
  last_activity_date: string | null;
}

export interface CreateBranchRequest {
  name: string;
  phone?: string;
  address?: string;
  city: string;
  country_code: string;
}

export interface UpdateBranchRequest {
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  country_code?: string;
}

export interface UpdateMerchantRequest {
  name?: string;
  phone?: string;
  country_code?: string;
  slug?: string | null;
}

// Response shapes

export interface MerchantMeResponse {
  success: true;
  data: MerchantWithStats | null;
}

export interface BranchListResponse {
  success: true;
  data: BranchWithAggregates[];
}

export interface BranchMutationResponse {
  success: true;
  data: BranchWithAggregates;
}

export interface MerchantMutationResponse {
  success: true;
  data: MerchantWithStats;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown[];
}

export type MerchantMeApiResponse = MerchantMeResponse | ApiErrorResponse;
export type BranchListApiResponse = BranchListResponse | ApiErrorResponse;
export type BranchMutationApiResponse = BranchMutationResponse | ApiErrorResponse;
export type MerchantMutationApiResponse = MerchantMutationResponse | ApiErrorResponse;