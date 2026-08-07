import { ApiErrorResponse, UserRoleValues } from "./main.types";

// ────────────────────────────────────────────────────────────────────────────
// Staff management (/staff) — list + create + edit + delete + access toggle
// ────────────────────────────────────────────────────────────────────────────
// A "staff member" in the directory is a `users` row that has one live
// `staff` row at one of the merchant's branches. The role lives directly on
// `staff.role` (single role per staff member). The directory is merchant-
// scoped: a user is visible to a manager iff the user has a non-deleted
// `staff` row at one of the manager's branches.
//
// Soft delete: `deleteStaff` tombstones the `users` row + every linked
// `staff` row. A tombstoned user is blocked at verifyOtp (deleted_at IS NULL
// check) and is hidden from the directory by default. Re-adding the same
// phone auto-restores the existing `users` row (clears `deleted_at`,
// refreshes profile fields) and creates a fresh `staff` row — old
// tombstoned staff rows stay tombstoned for audit history.

export type StaffRole = UserRoleValues;

export interface StaffUser {
  id: string;
  phone: string;
  surname: string;
  other_names: string | null;
  access_granted: boolean;
  role: StaffRole;
  branch_id: number;
  branch_name: string | null;
  address: string | null;
  notes: string | null;
  last_login_at: string | null;
  created_at: string;
  // True when this row is the calling manager — surfaced so the UI can hide
  // self-destructive actions (delete / role change / access toggle).
  is_self: boolean;
}

export interface StaffListFilters {
  // Substring match on surname, other_names, or phone. Empty/null disables.
  search?: string | null;
  // Limit to a specific branch of the merchant. null = all branches.
  branch_id?: number | null;
  // Filter by role. null = all roles.
  role?: StaffRole | null;
  // Include soft-deleted / disabled users in the result set. Default false
  // (excludes both deleted and disabled). When true, the directory returns
  // disabled users too (deleted users stay hidden — they're tombstoned).
  include_disabled?: boolean | null;
  limit?: number;
  offset?: number;
}

export interface StaffListPage {
  rows: StaffUser[];
  total: number;
  offset: number;
  limit: number;
}

export type StaffListQuerystring = StaffListFilters;

export interface CreateStaffRequest {
  phone: string;
  surname: string;
  other_names?: string | null;
  role: StaffRole;
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
  role?: StaffRole;
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
  data: StaffUser;
}

export interface StaffDeleteResponse {
  success: true;
  data: { id: string };
}

export type StaffListApiResponse = StaffListResponse | ApiErrorResponse;
export type StaffMutationApiResponse = StaffMutationResponse | ApiErrorResponse;
export type StaffAccessApiResponse = StaffMutationApiResponse;
export type StaffDeleteApiResponse = StaffDeleteResponse | ApiErrorResponse;