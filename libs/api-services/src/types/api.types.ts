/**
 * Auto-generated API Types
 * Generated on: 2026-09-01T14:07:34.779Z
 * 
 * ⚠️ DO NOT EDIT MANUALLY
 * Source: apps/smartschool-api/src/app/types/
 * Script: yarn generate:types
 * 
 * TYPE-FIRST WORKFLOW:
 * 1. Edit types in backend: apps/main-backend/src/app/types/*.types.ts
 * 2. Run: yarn generate:types
 * 3. Backend gets TypeBox schemas (for validation)
 * 4. Frontend gets TypeScript types (for type safety)
 * 5. Everything stays in sync automatically!
 * 
 * NOTE: Shared types from main.types.ts are included first.
 *       API-specific types follow, with imports removed.
 */

// ========================================
// SHARED TYPES (from main.types.ts)
// ========================================
export type StaffRoleValues = "manager" | "cashier";

export type BranchCategoryValues =
  | "electronics"
  | "home_appliances"
  | "furniture"
  | "retail_shops"
  | "restaurants"
  | "schools";

export type CreditTypeValues = "fixed" | "percentage";

export type CumulativeScopeValues = "per_branch" | "merchant_wide";

export type SendSMSMessageParams = {
  phone: string; 
  message: string;
  sender?: string; 
};

export type SendSMSMessageResponse = {
  status: "success";
};

export type SMSMessageErrorReponse = {
  status: "error";
  message: string;
};

export interface BaseMerchant {
  id: number;
  name: string;
  phone: string;
  country_code: string;
  slug: string | null;
  logo_url: string | null;
  cover_photo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface BaseBranch {
  id: number;
  merchant_id: number;
  name: string | null;
  phone: string | null;
  address: string | null;
  city: string;
  country_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  place_label: string | null;
  category: BranchCategoryValues | null;
  purchase_threshold_amount: number | null;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown[];
}

export type TransactionTypeValues =
  | "purchase"
  | "credit_issue"
  | "credit_redeem";

export interface BaseCustomer {
  id: number;
  phone: string | null;
  unique_id: string | null;
  user_id: string | null;
  surname: string | null;
  other_names: string | null;
  avatar_url: string | null;
  created_at: string;
  deleted_at: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  place_label: string | null;
}


export interface CustomerAuthUser {
  id: string;
  phone: string | null;
  customer_id: number;
  surname: string | null;
  other_names: string | null;
  avatar_url: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  place_label: string | null;
}

export interface BaseCustomerTransaction {
  id: number;
  customer_id: number;
  branch_id: number;
  amount: number;
  transaction_date: number;
  transaction_type: TransactionTypeValues;
  created_at: string;
  
}


export interface BaseUserProfile {
  id: string;
  phone: string;
  last_login_at: string | null;
  created_at: string;
  deleted_at: string | null;
}


export interface BaseStaff {
  id: number;
  user_id: string;
  branch_id: number;
  role: StaffRoleValues | null;
  surname: string | null;
  other_names: string | null;
  access_granted: boolean;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}


export interface BaseCustomerCredit {
  id: number;
  customer_id: number;
  branch_id: number;
  credit_amount: number;
  pending_redemption_amount: number | null;
  approved_redemption_amount: number | null;
  redemption_approval_staff_id: number | null;
  expires_at: number | null;
  revoked_at: string | null;
  revoked_by_user_id: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}


export interface BaseCustomerCreditRedemption {
  id: number;
  customer_id: number;
  
  merchant_id: number | null;
  amount_redeemed: number;
  approved_at: string | null;
  approved_by_staff_id: number | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  branch_id: number;
  requested_date: number;
  transaction_date: number;
}

export interface BaseRunningCreditConfig {
  click_count: number;
  created_at: string;
  credit_type: CreditTypeValues | null;
  credit_validity: number | null;
  cumulative_scope: CumulativeScopeValues;
  deleted_at: string | null;
  eligible_window: number | null;
  fixed_credit_value: number | null;
  id: number;
  is_active: boolean;
  maximum_allowed_credit: number | null;
  percentage_credit_value: number | null;
  terms: string | null;
  threshold_amount: number | null;
  updated_at: string | null;
  url: string | null;
  images: string[] | null;
}

export interface BaseFixedCreditConfig {
  click_count: number;
  created_at: string;
  deleted_at: string | null;
  description: string | null;
  end_date: number | null;
  id: number;
  images: string[] | null;
  is_active: boolean;
  start_date: number | null;
  terms: string | null;
  title: string | null;
  updated_at: string | null;
  url: string | null;
}

// ========================================
// API-SPECIFIC TYPES
// ========================================
export interface SendOtpRequest {
  phone: string;
}

export interface VerifyOtpRequest {
  phone: string;
  otp: string;
}

export interface AccessTokenPayload {
  sub: string;
  phone: string | null;
  role: StaffRoleValues | null;
  merchant_id: number | null;
  branch_id: number | null;
  staff_id: number | null;
  customer_id: number | null;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  jti: string;
}

export interface AuthUser {
  id: string;
  email: string;
  phone: string | null;
  
  surname: string | null;
  other_names: string | null;
  access_granted: boolean;
  role: StaffRoleValues | null;
  merchant_id: number | null;
  branch_id: number | null;
  
  staff_id: number | null;
}

export interface AuthSession {
  access_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: AuthUser;
}

export interface SendOtpResponse {
  success: true;
  message: string;
}

export interface VerifyOtpResponse {
  success: true;
  message: string;
  data: AuthSession;
}

export interface RefreshTokenResponse {
  success: true;
  message: string;
  data: AuthSession;
}

export interface LogoutResponse {
  success: true;
  message: string;
}

export interface SessionListItem {
  id: string;
  device_fingerprint: string | null;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  is_current: boolean;
}

export interface SessionListResponse {
  success: true;
  data: SessionListItem[];
}

export interface SessionRevokeResponse {
  success: true;
  message: string;
}

export interface GetCurrentUserResponse {
  success: true;
  data: AuthUser;
}

export interface AuthErrorResponse {
  success: false;
  error: string;
  details?: unknown[];
}

export type SendOtpApiResponse = SendOtpResponse | AuthErrorResponse;
export type VerifyOtpApiResponse = VerifyOtpResponse | AuthErrorResponse;
export type RefreshTokenApiResponse = RefreshTokenResponse | AuthErrorResponse;
export type LogoutApiResponse = LogoutResponse | AuthErrorResponse;
export type SessionListApiResponse = SessionListResponse | AuthErrorResponse;
export type SessionRevokeApiResponse =
  | SessionRevokeResponse
  | AuthErrorResponse;
export type GetCurrentUserApiResponse =
  | GetCurrentUserResponse
  | AuthErrorResponse;

export interface CustomerOtpSendRequest {
  phone: string;
}

export interface CustomerOtpVerifyRequest {
  phone: string;
  otp: string;
}

export interface CustomerRegisterRequest {
  pending_token: string;
  surname: string;
  other_names: string;
  latitude?: number | null;
  longitude?: number | null;
  place_id?: string | null;
  place_label?: string | null;
}

export interface CustomerRefreshRequest {
  refresh_token: string;
}

export interface CustomerSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: CustomerAuthUser;
}

export interface CustomerOtpSendResponse {
  success: true;
  message: string;
}

export interface CustomerLoggedInResponse {
  success: true;
  message: string;
  data: {
    status: "logged_in";
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at: number;
    token_type: string;
    user: CustomerAuthUser;
  };
}

export interface CustomerNeedsProfileResponse {
  success: true;
  message: string;
  data: {
    status: "needs_profile";
    pending_token: string;
  };
}

export type CustomerOtpVerifyResponse =
  | CustomerLoggedInResponse
  | CustomerNeedsProfileResponse;

export interface CustomerRegisterResponse {
  success: true;
  message: string;
  data: CustomerSession;
}

export interface CustomerRefreshResponse {
  success: true;
  message: string;
  data: CustomerSession;
}

export interface CustomerLogoutResponse {
  success: true;
  message: string;
}

export interface CustomerGetCurrentUserResponse {
  success: true;
  data: CustomerAuthUser;
}

export type CustomerOtpSendApiResponse =
  | CustomerOtpSendResponse
  | AuthErrorResponse;
export type CustomerOtpVerifyApiResponse =
  | CustomerOtpVerifyResponse
  | AuthErrorResponse;
export type CustomerRegisterApiResponse =
  | CustomerRegisterResponse
  | AuthErrorResponse;
export type CustomerRefreshApiResponse =
  | CustomerRefreshResponse
  | AuthErrorResponse;
export type CustomerLogoutApiResponse =
  | CustomerLogoutResponse
  | AuthErrorResponse;
export type CustomerGetCurrentUserApiResponse =
  | CustomerGetCurrentUserResponse
  | AuthErrorResponse;

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

export type RunningCreditConfig = BaseRunningCreditConfig & {
  branches: BaseBranch[];
  favorite_count: number;
};

export type FixedCreditConfig = BaseFixedCreditConfig & {
  branches: BaseBranch[];
  favorite_count: number;
};

export interface CreateRunningCreditConfigRequest {
  branch_ids: number[];
  credit_type: CreditTypeValues | null;
  credit_validity?: number | null;
  eligible_window?: number | null;
  fixed_credit_value?: number | null;
  percentage_credit_value?: number | null;
  maximum_allowed_credit?: number | null;
  threshold_amount?: number | null;
  terms?: string | null;
  url?: string | null;
  cumulative_scope: CumulativeScopeValues;
  images?: string[] | null;
}

export type UpdateRunningCreditConfigRequest = CreateRunningCreditConfigRequest;

export interface RunningCreditConfigUpdate {
  credit_type: CreditTypeValues | null;
  credit_validity: number | null;
  eligible_window: number | null;
  fixed_credit_value: number | null;
  percentage_credit_value: number | null;
  maximum_allowed_credit: number | null;
  threshold_amount: number | null;
  terms: string | null;
  url: string | null;
  cumulative_scope: CumulativeScopeValues;
  images?: string[];
}

export interface CreateFixedCreditConfigRequest {
  branch_ids: number[];
  title?: string | null;
  description?: string | null;
  images?: string[] | null;
  start_date?: number | null;
  end_date?: number | null;
  terms?: string | null;
  url?: string | null;
}

export type UpdateFixedCreditConfigRequest = CreateFixedCreditConfigRequest;

export interface FixedCreditConfigUpdate {
  title: string | null;
  description: string | null;
  start_date: number | null;
  end_date: number | null;
  terms: string | null;
  url: string | null;
  images?: string[];
}

export interface ToggleActiveRequest {
  is_active: boolean;
}

export type FavoritedRunningCreditConfig = RunningCreditConfig & {
  favorited_at: string;
};

export type FavoritedFixedCreditConfig = FixedCreditConfig & {
  favorited_at: string;
};

export interface CustomerFavoritesListResponse {
  success: true;
  data: {
    running: FavoritedRunningCreditConfig[];
    fixed: FavoritedFixedCreditConfig[];
  };
}

export interface FavoritedMerchantSummary {
  id: number;
  name: string | null;
  logo_url: string | null;
}

export type FavoritedConfig =
  | {
      config_type: "running";
      config: FavoritedRunningCreditConfig;
      merchant: FavoritedMerchantSummary | null;
    }
  | {
      config_type: "fixed";
      config: FavoritedFixedCreditConfig;
      merchant: FavoritedMerchantSummary | null;
    };

export interface CustomerFavoritesPage {
  rows: FavoritedConfig[];
  total: number;
  offset: number;
  limit: number;
}

export interface CustomerFavoritesPageResponse {
  success: true;
  data: CustomerFavoritesPage;
}

export interface FavoriteMutationResponse {
  success: true;
}

export type CustomerFavoritesListApiResponse =
  | CustomerFavoritesListResponse
  | ApiErrorResponse;

export type CustomerFavoritesPageApiResponse =
  | CustomerFavoritesPageResponse
  | ApiErrorResponse;

export type FavoriteMutationApiResponse =
  | FavoriteMutationResponse
  | ApiErrorResponse;

export interface ClickMutationResponse {
  success: true;
}

export type ClickMutationApiResponse = ClickMutationResponse | ApiErrorResponse;

export interface RunningCreditConfigListResponse {
  success: true;
  data: RunningCreditConfig[];
}

export interface RunningCreditConfigMutationResponse {
  success: true;
  data: RunningCreditConfig;
}

export interface RunningCreditConfigDeleteResponse {
  success: true;
  data: null;
}

export type RunningCreditConfigListApiResponse =
  | RunningCreditConfigListResponse
  | ApiErrorResponse;

export type RunningCreditConfigMutationApiResponse =
  | RunningCreditConfigMutationResponse
  | ApiErrorResponse;

export type RunningCreditConfigDeleteApiResponse =
  | RunningCreditConfigDeleteResponse
  | ApiErrorResponse;

export interface FixedCreditConfigListResponse {
  success: true;
  data: FixedCreditConfig[];
}

export interface FixedCreditConfigMutationResponse {
  success: true;
  data: FixedCreditConfig;
}

export interface FixedCreditConfigDeleteResponse {
  success: true;
  data: null;
}

export type FixedCreditConfigListApiResponse =
  | FixedCreditConfigListResponse
  | ApiErrorResponse;

export type FixedCreditConfigMutationApiResponse =
  | FixedCreditConfigMutationResponse
  | ApiErrorResponse;

export type FixedCreditConfigDeleteApiResponse =
  | FixedCreditConfigDeleteResponse
  | ApiErrorResponse;

export interface CustomerCreditWithRemaining extends BaseCustomerCredit {
  remaining: number;
  redeemed_total: number;
}

export type CustomerOtpVerifyServiceResponse = {
  status: "logged_in";
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: CustomerAuthUser;
} | {
  status: "needs_profile";
  pending_token: string;
};

export type CustomerRegisterServiceResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: CustomerAuthUser;
};

export type CustomerRefreshServiceResponse = CustomerRegisterServiceResponse;

export type CustomerActivityKind = "credit_issued" | "credit_redeemed";

export interface CustomerActivityIssued {
  kind: "credit_issued";
  id: number;
  amount: number;
  merchant: BaseMerchant;
  branch: BaseBranch;
  created_at: string;
  credit_id: number;
}

export interface CustomerActivityRedeemed {
  kind: "credit_redeemed";
  id: number;
  amount: number;
  merchant: BaseMerchant;
  branch: BaseBranch;
  created_at: string;
  credit_id: number;
  
  purchase_id: number | null;
}

export type CustomerActivity =
  | CustomerActivityIssued
  | CustomerActivityRedeemed;

export interface CustomerActivitiesPage {
  items: CustomerActivity[];
  
  nextCursor: number | null;
}

export interface CustomerActivitiesResponse {
  success: true;
  data: CustomerActivitiesPage;
}

export type CustomerActivitiesApiResponse =
  | CustomerActivitiesResponse
  | ApiErrorResponse;

export type CustomerCreditStatus = "live" | "expired" | "revoked";

export type CustomerCreditType = "running" | "fixed" | null;

export type CustomerCreditWithBranch = BaseCustomerCredit & {
  branch: BaseBranch & { merchant: BaseMerchant };
  redeemed_total: number;
  pending_total: number;
  remaining: number;
  status: CustomerCreditStatus;
  credit_type: CustomerCreditType;
};

export interface CustomerCredits {
  live: CustomerCreditWithBranch[];
  expired: CustomerCreditWithBranch[];
}

export interface CustomerCreditsResponse {
  success: true;
  data: CustomerCredits;
}

export type CustomerCreditsApiResponse =
  | CustomerCreditsResponse
  | ApiErrorResponse;

export interface CustomerPhoneChangeSendOtpRequest {
  newPhone: string;
}

export interface CustomerPhoneChangeSendOtpResponse {
  success: true;
  data: { message: string };
}

export type CustomerPhoneChangeSendOtpApiResponse =
  | CustomerPhoneChangeSendOtpResponse
  | ApiErrorResponse;

export interface CustomerPhoneChangeVerifyRequest {
  newPhone: string;
  otp: string;
}

export interface CustomerPhoneChangeVerifyResult {
  phoneVerifiedToken: string;
}

export interface CustomerPhoneChangeVerifyResponse {
  success: true;
  data: CustomerPhoneChangeVerifyResult;
}

export type CustomerPhoneChangeVerifyApiResponse =
  | CustomerPhoneChangeVerifyResponse
  | ApiErrorResponse;

export interface CustomerProfileUpdateRequest {
  surname?: string;
  other_names?: string;
  avatar_url?: string | null;
  newPhone?: string;
  phoneVerifiedToken?: string;
  latitude?: number | null;
  longitude?: number | null;
  place_id?: string | null;
  place_label?: string | null;
}

export interface CustomerUpdate {
  surname?: string;
  other_names?: string;
  avatar_url?: string | null;
  phone?: string;
  latitude?: number | null;
  longitude?: number | null;
  place_id?: string | null;
  place_label?: string | null;
  updated_at?: string;
}

export interface CustomerProfileUpdateResponse {
  success: true;
  data: { user: CustomerAuthUser };
}

export type CustomerProfileUpdateApiResponse =
  | CustomerProfileUpdateResponse
  | ApiErrorResponse;

export interface CustomerMerchantBranchesResponse {
  success: true;
  data: BaseBranch[];
}

export type CustomerMerchantBranchesApiResponse =
  | CustomerMerchantBranchesResponse
  | ApiErrorResponse;

export interface CustomerPendingRedemption {
  id: number;
  branch_id: number;
  amount_redeemed: number;
  created_at: string;
  branch: { id: number; name: string | null } | null;
  redemption_code: number;
  requested_date: number;
}

export interface CustomerPendingRedemptionResponse {
  success: true;
  data: CustomerPendingRedemption | null;
}

export type CustomerPendingRedemptionApiResponse =
  | CustomerPendingRedemptionResponse
  | ApiErrorResponse;

export interface CustomerRedemptionRequestBody {
  amount: number;
  branchId: number;
}

export interface CustomerRedemptionRequestResult {
  audit_id: number;
  redemption_code: number;
  requested_date: number;
  branch_id: number;
  amount_redeemed: number;
  requested_at: string;
}

export interface CustomerRedemptionRequestMutationResponse {
  success: true;
  data: CustomerRedemptionRequestResult;
}

export type CustomerRedemptionRequestMutationApiResponse =
  | CustomerRedemptionRequestMutationResponse
  | ApiErrorResponse;

export interface CustomerRedemptionCancelResult {
  cancelled: boolean;
}

export interface CustomerRedemptionCancelResponse {
  success: true;
  data: CustomerRedemptionCancelResult;
}

export type CustomerRedemptionCancelApiResponse =
  | CustomerRedemptionCancelResponse
  | ApiErrorResponse;

export interface CustomerApprovedRedemption {
  id: number;
  branch_id: number;
  amount_redeemed: number;
  branch: { id: number; name: string | null } | null;
  approved_at: number;
}

export interface CustomerApprovedRedemptionPage {
  items: CustomerApprovedRedemption[];
  nextCursor: number | null;
}

export interface CustomerApprovedRedemptionResponse {
  success: true;
  data: CustomerApprovedRedemptionPage;
}

export type CustomerApprovedRedemptionApiResponse =
  | CustomerApprovedRedemptionResponse
  | ApiErrorResponse;

export interface CustomerApprovedRedemptionQuerystring {
  cursor?: string | number;
  limit?: number;
}

export type LeaderboardSort =
  | "purchases"
  | "credits_issued"
  | "credits_redeemed";

export interface LeaderboardRow {
  customer_id: number;
  phone: string | null;
  user_id: string | null;
  customer_name: string;
  branch_id: number | null;
  total_purchases: number;
  total_credits_issued: number;
  total_credits_redeemed: number;
  transaction_count: number;
}

export interface LeaderboardFilters {
  sort?: LeaderboardSort;
  branch_id?: number | null;
  start?: number | null;
  end?: number | null;
  limit?: number;
  offset?: number;
}

export interface LeaderboardPage {
  rows: LeaderboardRow[];
  total: number;
  offset: number;
  limit: number;
}

export interface LeaderboardStats {
  total_customers: number;
  total_purchases: number;
  total_credits_issued: number;
}

export type LeaderboardQuerystring = LeaderboardFilters;

export interface LeaderboardResponse {
  success: true;
  data: LeaderboardPage;
}

export interface LeaderboardStatsResponse {
  success: true;
  data: LeaderboardStats;
}

export type LeaderboardApiResponse = LeaderboardResponse | ApiErrorResponse;
export type LeaderboardStatsApiResponse =
  | LeaderboardStatsResponse
  | ApiErrorResponse;

export interface CustomerListFilters {
  
  branch_id?: number | null;
  
  search?: string | null;
  limit?: number;
  offset?: number;
}

export interface CustomerListRow {
  customer_id: number;
  user_id: string | null;
  phone: string | null;
  user: BaseUserProfile | null;
  customer_name: string;
  total_purchases: number;
  available_credits: number;
  live_credit_count: number;
  last_activity_epoch: number | null;
}

export interface CustomerListPage {
  rows: CustomerListRow[];
  total: number;
  offset: number;
  limit: number;
}

export type CustomerListQuerystring = CustomerListFilters;

export interface CustomerListResponse {
  success: true;
  data: CustomerListPage;
}

export interface CustomerDetailCreditRow extends BaseCustomerCredit {
  redeemed_total: number;
  pending_total: number;
  remaining: number;
  branch: BaseBranch;
}

export interface CustomerDetail {
  customer_id: number;
  user_id: string | null;
  phone: string | null;
  user: BaseUserProfile | null;
  customer_name: string;
  
  total_purchases: number;
  available_credits: number;
  live_credit_count: number;
  last_activity_epoch: number | null;
  credits: CustomerDetailCreditRow[];
}

export interface CustomerDetailResponse {
  success: true;
  data: CustomerDetail;
}

export type CustomerListApiResponse = CustomerListResponse | ApiErrorResponse;
export type CustomerDetailApiResponse = CustomerDetailResponse | ApiErrorResponse;

export type MerchantWithStats = BaseMerchant & {
  branch_count: number;
  staff_count: number;
  customer_count: number;
  lifetime_credit_issued: number;
  credit_pool_used: number;
  credit_pool_limit: number | null;
};

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

export interface MerchantPendingRequest
  extends BaseCustomerCreditRedemption {
  branch: BaseBranch | null;
  customer: (BaseCustomer & { users: BaseUserProfile | null }) | null;
  merchant: BaseMerchant;
}

export interface MerchantPendingRequestsPage {
  rows: MerchantPendingRequest[];
  total: number;
  offset: number;
  limit: number;
}

export interface MerchantApprovedRedemption extends BaseCustomerCreditRedemption {
  customer: BaseCustomer & { users: BaseUserProfile | null };
  merchant: BaseMerchant;
  approved_by_staff: BaseStaff | null;
  branch: BaseBranch | null;
}

export interface MerchantRejectedRedemption extends BaseCustomerCreditRedemption {
  customer: BaseCustomer & { users: BaseUserProfile | null };
  merchant: BaseMerchant;
  branch: BaseBranch | null;
}

export interface MerchantRedemptionActionBody {
  redemption_code: number;
  redemption_id: number;
}

export interface MerchantPendingRequestFilters {
  branch_id?: number | null;
  limit?: number;
  offset?: number;
}

export interface MerchantAuditFeedFilters {
  branch_id?: number | null;
  limit?: number;
  offset?: number;
}

export interface MerchantAuditFeedPage<T> {
  rows: T[];
  total: number;
  offset: number;
  limit: number;
}

export type MerchantPendingRequestsQuerystring = MerchantPendingRequestFilters;
export type MerchantApprovedRedemptionsQuerystring = MerchantAuditFeedFilters;
export type MerchantRejectedRedemptionsQuerystring = MerchantAuditFeedFilters;

export interface MerchantPendingRequestsResponse {
  success: true;
  data: MerchantPendingRequestsPage;
}

export interface MerchantApprovedRedemptionsResponse {
  success: true;
  data: MerchantAuditFeedPage<MerchantApprovedRedemption>;
}

export interface MerchantRejectedRedemptionsResponse {
  success: true;
  data: MerchantAuditFeedPage<MerchantRejectedRedemption>;
}

export interface MerchantRedemptionMutationResponse {
  success: true;
  data: {
    audit_id: number;
    amount_redeemed: number;
  };
}

export type MerchantPendingRequestsApiResponse =
  | MerchantPendingRequestsResponse
  | ApiErrorResponse;
export type MerchantApprovedRedemptionsApiResponse =
  | MerchantApprovedRedemptionsResponse
  | ApiErrorResponse;
export type MerchantRejectedRedemptionsApiResponse =
  | MerchantRejectedRedemptionsResponse
  | ApiErrorResponse;
export type MerchantRedemptionMutationApiResponse =
  | MerchantRedemptionMutationResponse
  | ApiErrorResponse;

export interface Staff extends BaseStaff {
  user: BaseUserProfile;
  branch: BaseBranch;
}

export interface StaffListFilters {
  
  search?: string | null;
  
  branch_id?: number | null;
  
  role?: StaffRoleValues | null;
  
  include_disabled?: boolean | null;
  limit?: number;
  offset?: number;
}

export interface StaffListPage {
  rows: Staff[];
  total: number;
  offset: number;
  limit: number;
}

export type StaffListQuerystring = StaffListFilters;

export interface CreateStaffRequest {
  phone: string;
  surname: string;
  other_names?: string | null;
  role: StaffRoleValues;
  branch_id: number;
  access_granted?: boolean;
  address?: string | null;
  notes?: string | null;
}

export interface UpdateStaffRequest {
  phone?: string;
  surname?: string;
  other_names?: string | null;
  role?: StaffRoleValues | null;
  branch_id?: number;
  access_granted?: boolean;
  address?: string | null;
  notes?: string | null;
}

export interface StaffUpdate {
  branch_id?: number;
  role?: StaffRoleValues | null;
  access_granted?: boolean;
  surname?: string | null;
  other_names?: string | null;
  address?: string | null;
  notes?: string | null;
  updated_at?: string;
}

export interface UserUpdate {
  phone?: string;
  updated_at: string;
}

export interface SetStaffAccessRequest {
  access_granted: boolean;
}

export interface StaffListResponse {
  success: true;
  data: StaffListPage;
}

export interface StaffMutationResponse {
  success: true;
  data: Staff;
}

export interface StaffDeleteResponse {
  success: true;
  data: { id: string };
}

export type StaffListApiResponse = StaffListResponse | ApiErrorResponse;
export type StaffMutationApiResponse = StaffMutationResponse | ApiErrorResponse;
export type StaffAccessApiResponse = StaffMutationApiResponse;
export type StaffDeleteApiResponse = StaffDeleteResponse | ApiErrorResponse;

export interface CustomerWithUser extends BaseCustomer {
  users: BaseUserProfile | null;
}

export interface CustomerTransactions extends BaseCustomerTransaction {
  customer: CustomerWithUser;
  branch: BaseBranch;
  recorded_by_staff?: BaseStaff | null;
  approved_by_staff?: BaseStaff | null;
}

export type TransactionTypeFilter =
  | "all"
  | "purchase"
  | "credit_issue"
  | "credit_redeem";

export interface TransactionsFilters {
  type?: TransactionTypeFilter;
  branch_id?: number | null;
  start?: number | null;
  end?: number | null;
  limit?: number;
  offset?: number;
}

export interface TransactionsPage {
  rows: CustomerTransactions[];
  total: number;
  offset: number;
  limit: number;
}

export interface CreatePurchaseRequest {
  phone: string;
  amount: number;
  branch_id?: number | null;
}

export type TransactionsQuerystring = TransactionsFilters;

export interface TransactionsResponse {
  success: true;
  data: TransactionsPage;
}

export interface CreatePurchaseResponse {
  success: true;
  data: CustomerTransactions;
}

export type TransactionsApiResponse = TransactionsResponse | ApiErrorResponse;
export type CreatePurchaseApiResponse =
  | CreatePurchaseResponse
  | ApiErrorResponse;

