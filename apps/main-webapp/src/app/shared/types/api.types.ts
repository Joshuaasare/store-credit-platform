/**
 * Auto-generated API Types
 * Generated on: 2026-08-13T04:02:08.722Z
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
  created_at: string;
  deleted_at: string | null;
}






export interface CustomerAuthUser {
  id: string;
  phone: string | null;
  customer_id: number;
  surname: string | null;
  other_names: string | null;
}

export interface BaseCustomerTransaction {
  id: number;
  customer_id: number;
  branch_id: number;
  recorded_by_staff_id: number | null;
  amount: number;
  transaction_date: number;
  transaction_type: TransactionTypeValues;
  created_at: string;
  
  
  
  credit_id?: number | null;
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
  expires_at: number | null;
  revoked_at: string | null;
  revoked_by_user_id: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}












export interface BaseCustomerCreditRedemption {
  id: number;
  credit_id: number;
  customer_id: number;
  branch_id: number;
  amount_redeemed: number;
  approved_at: string | null;
  approved_by_staff_id: number | null;
  recorded_by_staff_id: number | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface BaseRunningCreditConfig {
  id: number;
  config_group_id: string;
  branch_id: number;
  credit_type: CreditTypeValues | null;
  credit_validity: number | null;
  eligible_window: number | null;
  fixed_credit_value: number | null;
  percentage_credit_value: number | null;
  maximum_allowed_credit: number | null;
  threshold_amount: number | null;
  terms: string | null;
  cumulative_scope: CumulativeScopeValues;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface BaseFixedCreditConfig {
  id: number;
  config_group_id: string;
  branch_id: number;
  credit_type: CreditTypeValues | null;
  fixed_credit_value: number | null;
  percentage_credit_value: number | null;
  maximum_allowed_credit: number | null;
  start_date: number | null;
  end_date: number | null;
  terms: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
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
}

export interface UpdateBranchRequest {
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  country_code?: string;
}

export type BranchListApiResponse = BranchListResponse | ApiErrorResponse;
export type BranchMutationApiResponse =
  | BranchMutationResponse
  | ApiErrorResponse;

export interface RunningCreditConfigGroup {
  config_group_id: string;
  branches: BaseBranch[];
  credit_type: CreditTypeValues | null;
  credit_validity: number | null;
  eligible_window: number | null;
  fixed_credit_value: number | null;
  percentage_credit_value: number | null;
  maximum_allowed_credit: number | null;
  threshold_amount: number | null;
  terms: string | null;
  cumulative_scope: CumulativeScopeValues;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

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
  cumulative_scope: CumulativeScopeValues;
}

export type UpdateRunningCreditConfigRequest = CreateRunningCreditConfigRequest;

export interface FixedCreditConfigGroup {
  config_group_id: string;
  branches: BaseBranch[];
  credit_type: CreditTypeValues | null;
  fixed_credit_value: number | null;
  percentage_credit_value: number | null;
  maximum_allowed_credit: number | null;
  start_date: number | null;
  end_date: number | null;
  terms: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface CreateFixedCreditConfigRequest {
  branch_ids: number[];
  credit_type: CreditTypeValues | null;
  fixed_credit_value?: number | null;
  percentage_credit_value?: number | null;
  maximum_allowed_credit?: number | null;
  start_date?: number | null;
  end_date?: number | null;
  terms?: string | null;
}

export type UpdateFixedCreditConfigRequest = CreateFixedCreditConfigRequest;

export interface ToggleActiveRequest {
  is_active: boolean;
}

export interface RunningCreditConfigListResponse {
  success: true;
  data: RunningCreditConfigGroup[];
}

export interface RunningCreditConfigMutationResponse {
  success: true;
  data: RunningCreditConfigGroup;
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
  data: FixedCreditConfigGroup[];
}

export interface FixedCreditConfigMutationResponse {
  success: true;
  data: FixedCreditConfigGroup;
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

export interface CustomerCreditWithBranch extends BaseCustomerCredit {

  branch: BaseBranch & { merchant: BaseMerchant };

  redeemed_total: number;

  remaining: number;
  
  status: CustomerCreditStatus;
  
  credit_type: CustomerCreditType;
}

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

export type RedemptionStatus = "pending" | "approved" | "rejected";

export interface RedemptionCustomer extends BaseCustomer {
  users: BaseUserProfile | null;
}

export interface RedemptionRow extends BaseCustomerCreditRedemption {
  customer: RedemptionCustomer | null;
  branch: BaseBranch | null;
  credit: BaseCustomerCredit | null;
  remaining: number;
}

export interface RedemptionsFilters {
  
  status: RedemptionStatus;
  branch_id?: number | null;
  limit?: number;
  offset?: number;
}

export interface RedemptionsPage {
  rows: RedemptionRow[];
  total: number;
  offset: number;
  limit: number;
}

export type RedemptionsQuerystring = RedemptionsFilters;

export interface RedemptionsResponse {
  success: true;
  data: RedemptionsPage;
}

export interface RedemptionMutationResponse {
  success: true;
  data: RedemptionRow;
}

export type RedemptionsApiResponse = RedemptionsResponse | ApiErrorResponse;
export type RedemptionMutationApiResponse =
  | RedemptionMutationResponse
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
  recorded_by_staff: BaseStaff | null;
  approved_by_staff: BaseStaff | null;
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

