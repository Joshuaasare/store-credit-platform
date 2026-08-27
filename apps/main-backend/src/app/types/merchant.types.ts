// Source of truth — after editing, run `yarn generate:types` to produce merchant.schema.ts and mirror into the frontend api.types.ts.

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

export interface MerchantMeResponse {
  success: true;
  data: MerchantWithStats | null;
}

export type MerchantMeApiResponse = MerchantMeResponse | ApiErrorResponse;

export type MerchantMutationApiResponse =
  | MerchantMutationResponse
  | ApiErrorResponse;

export interface MerchantSearchResult {
  id: number;
  name: string;
  slug: string | null;
  logo_url: string | null;
}

export interface CustomerMerchantSearchResponse {
  success: true;
  data: MerchantSearchResult[];
}

export type CustomerMerchantSearchApiResponse =
  | CustomerMerchantSearchResponse
  | ApiErrorResponse;