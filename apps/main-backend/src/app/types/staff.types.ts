import {
  ApiErrorResponse,
  BaseBranch,
  BaseStaff,
  BaseUserProfile,
  StaffRoleValues,
} from "./main.types";

// ────────────────────────────────────────────────────────────────────────────
// Staff management (/staff) — list + create + edit + delete + access toggle
// ────────────────────────────────────────────────────────────────────────────
// A "staff member" in the directory is a `users` row that has one live
// `staff` row at one of the merchant's branches. The role lives directly on
// `staff.role` (single role per staff member). The directory is merchant-
// scoped: a user is visible to a manager iff the user has a non-deleted
// `staff` row at one of the manager's branches.
//
// The returned shape is the nested join: `Staff extends BaseStaff` with
// `user: BaseUserProfile` and `branch: BaseBranch` joined. A column added to
// BASE_USER_PROFILE or BASE_BRANCH auto-propagates here and to every consumer.
// `is_self` is NOT synthesized server-side — the frontend computes
// `row.user.id === currentUserId` itself.
//
// Soft delete: `deleteStaff` tombstones the `users` row + every linked
// `staff` row. A tombstoned user is blocked at verifyOtp (deleted_at IS NULL
// check) and is hidden from the directory by default. Re-adding the same
// phone auto-restores the existing `users` row (clears `deleted_at`,
// refreshes profile fields) and creates a fresh `staff` row — old
// tombstoned staff rows stay tombstoned for audit history.

// Composed nested shape — mirrors the `select(...)` join. `role` is non-null
// on the directory path (rows with null role are filtered out server-side).
export interface Staff extends BaseStaff {
  user: BaseUserProfile;
  branch: BaseBranch;
}

export interface StaffListFilters {
  // Substring match on surname, other_names, or phone. Empty/null disables.
  search?: string | null;
  // Limit to a specific branch of the merchant. null = all branches.
  branch_id?: number | null;
  // Filter by role. null = all roles.
  role?: StaffRoleValues | null;
  // Include soft-deleted / disabled users in the result set. Default false
  // (excludes both deleted and disabled). When true, the directory returns
  // disabled users too (deleted users stay hidden — they're tombstoned).
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

// Full-replace semantics on edit. `phone` is editable (forces a phone-unique
// check against other users). All optional fields overwrite prior values
// when provided, or null when explicitly null.
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
