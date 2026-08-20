import {
  ApiErrorResponse,
  BaseBranch,
  BaseStaff,
  BaseUserProfile,
  StaffRoleValues,
} from "./main.types";

// Staff management (/staff). A staff member is a users row with one live staff row at a merchant branch; role lives on staff.role. Soft-deleted users are tombstoned + hidden; re-adding the same phone auto-restores the users row.

// Composed nested shape — mirrors the select(...) join. role is non-null on the directory path (null-role rows are filtered out server-side).
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
  // Include disabled users in the result (deleted users stay hidden). Default false.
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

// Full-replace semantics; phone forces a uniqueness check. Optional fields overwrite or null when explicitly null.
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
