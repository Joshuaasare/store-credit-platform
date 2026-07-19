// My Store — merchant + branch API types (source of truth)
// After editing, run `yarn generate:types` to produce merchant.schema.ts
// and to mirror these types into the frontend api.types.ts files.

import { ApiErrorResponse, BaseMerchant } from "./main.types";

export interface MerchantWithStats extends BaseMerchant {
  branch_count: number;
  staff_count: number;
  customer_count: number;
  lifetime_credit_issued: number;
  credit_pool_used: number;
  credit_pool_limit: number | null;
}

export interface UpdateMerchantRequest {
  name?: string;
  phone?: string;
  country_code?: string;
  slug?: string | null;
  logo_url?: string | null;
  cover_photo_url?: string | null;
}

export interface MerchantMutationResponse {
  success: true;
  data: MerchantWithStats;
}

// Response shapes

export interface MerchantMeResponse {
  success: true;
  data: MerchantWithStats | null;
}

export type MerchantMeApiResponse = MerchantMeResponse | ApiErrorResponse;

export type MerchantMutationApiResponse =
  | MerchantMutationResponse
  | ApiErrorResponse;
