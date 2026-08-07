import { supabaseAdmin } from "../utils/supabase.client";
import { AccessTokenPayload } from "../schemas/auth.schema";
import { randomUUID } from "crypto";
import {
  StaffUser,
  StaffListFilters,
  StaffListPage,
  StaffRole,
  CreateStaffRequest,
  UpdateStaffRequest,
} from "../schemas/staff.schema";
import { QueryFragments } from "../constants/queryFragments";
import { splitSearchTerm } from "../utils/misc.utils";

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

/**
 * Staff service — directory listing + CRUD for the per-branch staff model.
 *
 * Each "staff member" is a `users` row with one live `staff` row at one of the
 * merchant's branches. The role lives directly on `staff.role` (single role
 * per staff member). All reads/writes are scoped to a verified merchant_id
 * resolved upstream from the JWT, and every mutation enforces three
 * invariants:
 *
 *   1. Self-protection: a manager cannot change their own role, access, or
 *      delete themselves.
 *   2. Last-manager guard: a manager cannot remove manager-role / disable /
 *      delete the last active manager in the merchant.
 *   3. Branch ownership: any branch_id referenced in a payload must belong to
 *      the merchant (the security boundary).
 *
 * Soft delete tombstones `users` + every linked `staff` row; the phone is
 * NOT freed. Re-adding the same phone auto-restores the existing `users` row
 * (clears deleted_at, refreshes profile fields) and creates a fresh staff
 * row — old tombstoned staff rows stay tombstoned for audit history.
 */
export class StaffService {
  private static readonly DEFAULT_LIMIT = 50;

  // ── Reads ───────────────────────────────────────────────────────────────

  /**
   * List staff for the merchant in a single joined query — `staff` inner-
   * joined to `branches` (merchant scope) and `users` (excludes tombstoned
   * users). The role is read directly from `staff.role`.
   *
   * Filters applied server-side: branch_id, search (ILIKE on users
   * surname/other_names/phone via embedded `.or()`), and role (top-level
   * `staff.role`). Pagination via `.range()` + `count: "exact"`.
   *
   * Note: the model assumes one staff row per user (single-branch rule). If a
   * user ever has two `staff` rows at two branches, they'd appear twice here
   * — that's a constraint violation worth surfacing, not silently collapsing.
   */
  async listStaff(
    manager: AccessTokenPayload,
    filters: StaffListFilters,
  ): Promise<StaffListPage> {
    const merchantId = await this.resolveMerchantId(manager);
    const limit = filters.limit ?? StaffService.DEFAULT_LIMIT;
    const offset = filters.offset ?? 0;
    // Disabled users (access_granted = false) are always visible in the
    // directory — they're alive, just blocked from login. The
    // include_disabled flag is a no-op kept for back-compat with the
    // querystring schema; deletion is the only thing that hides a row.
    void filters.include_disabled;

    const search = filters.search?.trim() ?? "";

    let query = supabaseAdmin
      .from("staff")
      .select(
        `${QueryFragments.BASE_STAFF},
         branch:branches!inner(${QueryFragments.BASE_BRANCH}),
         user:users!inner(${QueryFragments.BASE_USER_PROFILE})`,
        { count: "exact" },
      )
      .eq("branch.merchant_id", merchantId)
      .is("deleted_at", null)
      .is("user.deleted_at", null)
      .is("branch.deleted_at", null)
      .not("role", "is", null)
      .order("user.access_granted", {
        ascending: false,
        referencedTable: "users",
      })
      .order("user.surname", { ascending: true, referencedTable: "users" })
      .order("id", { ascending: true });

    if (filters.branch_id != null) {
      query = query.eq("branch_id", filters.branch_id);
    }
    if (filters.role != null) {
      query = query.eq("role", filters.role);
    }
    if (search) {
      const termParts = splitSearchTerm(search);
      for (const part of termParts) {
        query = query.or(
          `user.surname.ilike.%${part}%,user.other_names.ilike.%${part}%,user.phone.ilike.%${part}%`,
        );
      }
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      throw new Error(`Failed to load staff: ${error.message}`);
    }

    const rows = (data ?? [])
      .map((row) => {
        const user = row.user;
        const branch = row.branch;
        const role = row.role as StaffRole | null;
        if (role == null) return null; // no role → data bug, skip
        return {
          id: user.id,
          phone: user.phone,
          surname: user.surname ?? "",
          other_names: user.other_names ?? null,
          access_granted: user.access_granted ?? false,
          role,
          branch_id: row.branch_id,
          branch_name: branch?.name ?? null,
          address: row.address ?? null,
          notes: row.notes ?? null,
          last_login_at: user.last_login_at ?? null,
          created_at: row.created_at,
          is_self: user.id === manager.sub,
        };
      })
      .filter((r): r is StaffUser => r !== null);

    return {
      rows,
      total: count ?? rows.length,
      offset,
      limit,
    };
  }

  // ── Create ──────────────────────────────────────────────────────────────

  /**
   * Create a staff member — phone + name + role + branch. Branch must belong
   * to the merchant. If a soft-deleted `users` row with the same phone
   * exists, auto-restore it (clear deleted_at, refresh name + access) and
   * create a fresh staff row carrying the role. If a live `users` row with
   * the same phone exists, return 409.
   */
  async createStaff(
    manager: AccessTokenPayload,
    payload: CreateStaffRequest,
  ): Promise<StaffUser> {
    const merchantId = await this.resolveMerchantId(manager);
    await this.assertBranchOwned(payload.branch_id, merchantId);

    const phone = payload.phone.trim();
    const accessGranted = payload.access_granted ?? true;

    // 1. Look up existing users by phone (live OR soft-deleted).
    const { data: existing, error: existErr } = await supabaseAdmin
      .from("users")
      .select("id, deleted_at")
      .eq("phone", phone)
      .maybeSingle();
    if (existErr) {
      throw new Error(`Failed to check existing phone: ${existErr.message}`);
    }

    let userId: string;

    if (existing) {
      if (existing.deleted_at == null) {
        throw new Error("A staff member with this phone already exists");
      }
      // Auto-restore path — refresh the tombstoned user row.
      const { error: restoreErr } = await supabaseAdmin
        .from("users")
        .update({
          surname: payload.surname,
          other_names: payload.other_names ?? null,
          access_granted: accessGranted,
          deleted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (restoreErr) {
        throw new Error(`Failed to restore user: ${restoreErr.message}`);
      }
      userId = existing.id as string;
    } else {
      // Fresh insert — generate the uuid here since database.types.ts marks
      // `id` as required on Insert (the DB would default it, but the generated
      // type doesn't reflect that).
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("users")
        .insert({
          id: randomUUID(),
          phone,
          surname: payload.surname,
          other_names: payload.other_names ?? null,
          access_granted: accessGranted,
        })
        .select("id")
        .single();
      if (insertErr) {
        throw new Error(`Failed to create user: ${insertErr.message}`);
      }
      userId = (inserted as any).id as string;
    }

    // 2. Insert staff row with the role carried directly on the row (the
    //    old tombstoned staff rows stay tombstoned).
    const { error: staffInsertErr } = await supabaseAdmin.from("staff").insert({
      user_id: userId,
      branch_id: payload.branch_id,
      role: payload.role,
      address: payload.address ?? null,
      notes: payload.notes ?? null,
    });
    if (staffInsertErr) {
      throw new Error(`Failed to create staff row: ${staffInsertErr.message}`);
    }

    return (await this.fetchStaffUser(manager, userId))!;
  }

  // ── Update ──────────────────────────────────────────────────────────────

  /**
   * Edit a staff member — full-replace semantics. Phone is editable; if it
   * collides with another live user, returns 409. Self-protection: a manager
   * cannot change their own role or access_granted. Last-manager guard: a
   * manager cannot demote / disable the last manager.
   */
  async updateStaff(
    manager: AccessTokenPayload,
    userId: string,
    payload: UpdateStaffRequest,
  ): Promise<StaffUser> {
    const merchantId = await this.resolveMerchantId(manager);
    const current = await this.fetchStaffUser(manager, userId);
    if (!current) {
      throw new Error("Staff member not found");
    }

    const roleChanging = payload.role != null && payload.role !== current.role;
    const accessChanging =
      payload.access_granted != null &&
      payload.access_granted !== current.access_granted;

    // Self-protection: cannot change own role or own access.
    if (userId === manager.sub && (roleChanging || accessChanging)) {
      throw new Error("You cannot change your own role or access");
    }

    // Last-manager guard: demoting or disabling the only active manager.
    if (
      current.role === "manager" &&
      current.access_granted &&
      ((roleChanging && payload.role !== "manager") ||
        (accessChanging && payload.access_granted === false))
    ) {
      await this.assertNotLastManager(merchantId, userId);
    }

    // Branch ownership when branch changes.
    if (payload.branch_id != null && payload.branch_id !== current.branch_id) {
      await this.assertBranchOwned(payload.branch_id, merchantId);
    }

    // Phone uniqueness check when phone changes.
    if (payload.phone != null && payload.phone !== current.phone) {
      const { data: conflict } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("phone", payload.phone.trim())
        .neq("id", userId)
        .is("deleted_at", null)
        .maybeSingle();
      if (conflict) {
        throw new Error("Another staff member already uses this phone");
      }
    }

    // 1. Update users row.
    const userUpdate: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (payload.surname != null) userUpdate.surname = payload.surname;
    if (payload.other_names !== undefined)
      userUpdate.other_names = payload.other_names;
    if (payload.phone != null) userUpdate.phone = payload.phone.trim();
    if (payload.access_granted != null)
      userUpdate.access_granted = payload.access_granted;
    const { error: userErr } = await supabaseAdmin
      .from("users")
      .update(userUpdate)
      .eq("id", userId)
      .is("deleted_at", null);
    if (userErr) {
      throw new Error(`Failed to update user: ${userErr.message}`);
    }

    // 2. Update staff row when branch / role / address / notes change.
    const staffUpdate: Record<string, unknown> = {};
    if (payload.branch_id != null) staffUpdate.branch_id = payload.branch_id;
    if (roleChanging) staffUpdate.role = payload.role;
    if (payload.address !== undefined) staffUpdate.address = payload.address;
    if (payload.notes !== undefined) staffUpdate.notes = payload.notes;
    if (Object.keys(staffUpdate).length > 0) {
      staffUpdate.updated_at = new Date().toISOString();
      const { error: staffErr } = await supabaseAdmin
        .from("staff")
        .update(staffUpdate)
        .eq("user_id", userId)
        .is("deleted_at", null);
      if (staffErr) {
        throw new Error(`Failed to update staff row: ${staffErr.message}`);
      }
    }

    return (await this.fetchStaffUser(manager, userId))!;
  }

  // ── Access toggle ─────────────────────────────────────────────────────────

  /**
   * Toggle access_granted for a staff member. Reuses updateStaff so
   * self-protection + last-manager guard both apply.
   */
  async setStaffAccess(
    manager: AccessTokenPayload,
    userId: string,
    accessGranted: boolean,
  ): Promise<StaffUser> {
    return this.updateStaff(manager, userId, { access_granted: accessGranted });
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  /**
   * Soft delete — tombstones `users` + every linked `staff` row. The role
   * lives on the staff row, so tombstoning staff carries the role away with
   * it. Self-protection + last-manager guard apply. The phone is NOT freed;
   * re-adding it later auto-restores the same user row.
   */
  async deleteStaff(
    manager: AccessTokenPayload,
    userId: string,
  ): Promise<{ id: string }> {
    const merchantId = await this.resolveMerchantId(manager);
    const current = await this.fetchStaffUser(manager, userId);
    if (!current) {
      throw new Error("Staff member not found");
    }

    if (userId === manager.sub) {
      throw new Error("You cannot delete your own account");
    }

    // Last-manager guard.
    if (current.role === "manager" && current.access_granted) {
      await this.assertNotLastManager(merchantId, userId);
    }

    const nowIso = new Date().toISOString();
    const branchIds = await this.merchantBranchIds(merchantId);

    // Tombstone staff rows first (so a re-add race doesn't resurrect them).
    const { error: staffErr } = await supabaseAdmin
      .from("staff")
      .update({ deleted_at: nowIso })
      .eq("user_id", userId)
      .is("deleted_at", null)
      .in("branch_id", branchIds);
    if (staffErr) {
      throw new Error(`Failed to tombstone staff rows: ${staffErr.message}`);
    }

    // Tombstone the user row last — also blocks login (verifyOtp checks
    // deleted_at IS NULL).
    const { error: userErr } = await supabaseAdmin
      .from("users")
      .update({ deleted_at: nowIso, updated_at: nowIso })
      .eq("id", userId)
      .is("deleted_at", null);
    if (userErr) {
      throw new Error(`Failed to delete user: ${userErr.message}`);
    }

    return { id: userId };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private async resolveMerchantId(
    manager: AccessTokenPayload,
  ): Promise<number> {
    if (manager.merchant_id != null) return manager.merchant_id;
    const { data } = await supabaseAdmin
      .from("staff")
      .select("branches(merchant_id)")
      .eq("user_id", manager.sub)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    const mid = (data as any)?.branches?.merchant_id;
    if (mid == null) {
      throw new Error("Forbidden: no merchant assigned to this user");
    }
    return Number(mid);
  }

  private async merchantBranchIds(merchantId: number): Promise<number[]> {
    const { data, error } = await supabaseAdmin
      .from("branches")
      .select("id")
      .eq("merchant_id", merchantId)
      .is("deleted_at", null);
    if (error) return [];
    return (data ?? []).map((b: any) => Number(b.id));
  }

  private async assertBranchOwned(
    branchId: number,
    merchantId: number,
  ): Promise<void> {
    const { data, error } = await supabaseAdmin
      .from("branches")
      .select("id")
      .eq("id", branchId)
      .eq("merchant_id", merchantId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error || !data) {
      throw new Error("Branch does not belong to your merchant");
    }
  }

  /**
   * Count active managers in the merchant excluding the target user — a single
   * joined query: `staff` inner-joined to `branches` (merchant scope) and
   * `users` (live + access granted), filtered to `role = 'manager'`. If the
   * count is 0, the target is the last manager and the operation is blocked.
   *
   * Dotted-column filters (`user.access_granted`, `user.deleted_at`,
   * `branch.merchant_id`) infers natively — no `as any` per the
   * supabase-query-conventions skill.
   */
  private async assertNotLastManager(
    merchantId: number,
    userId: string,
  ): Promise<void> {
    const { count, error } = await supabaseAdmin
      .from("staff")
      .select("id", { count: "exact", head: true })
      .eq("role", "manager")
      .neq("user_id", userId)
      .is("deleted_at", null)
      .eq("user.access_granted", true)
      .is("user.deleted_at", null)
      .eq("branch.merchant_id", merchantId)
      .is("branch.deleted_at", null);

    if (error) {
      throw new Error(`Failed to load managers for guard: ${error.message}`);
    }
    if ((count ?? 0) === 0) {
      throw new Error("At least one manager must remain");
    }
  }

  /**
   * Re-fetch a single StaffUser by user_id (merchant-scoped via manager) in
   * one joined query — `staff` inner-joined to `branches` (merchant scope)
   * and `users` (excludes tombstoned users). The role is read directly from
   * `staff.role`. Returns null if the user has no live staff row at the
   * merchant's branches, no role, or is tombstoned.
   */
  private async fetchStaffUser(
    manager: AccessTokenPayload,
    userId: string,
  ): Promise<StaffUser | null> {
    const merchantId = await this.resolveMerchantId(manager);

    const { data, error } = await supabaseAdmin
      .from("staff")
      .select(
        `${QueryFragments.BASE_STAFF},
         branch:branches!inner(id, name, merchant_id),
         user:users!inner(${QueryFragments.BASE_USER_PROFILE})`,
      )
      .eq("user_id", userId)
      .eq("branch.merchant_id", merchantId)
      .is("deleted_at", null)
      .is("user.deleted_at", null)
      .not("role", "is", null)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;

    const role = data.role as StaffRole | null;
    if (role == null) return null;

    const user = data.user;
    const branch = data.branch;
    return {
      id: user.id as string,
      phone: user.phone as string,
      surname: (user.surname as string | null) ?? "",
      other_names: (user.other_names as string | null) ?? null,
      access_granted: (user.access_granted as boolean) ?? false,
      role,
      branch_id: Number(data.branch_id),
      branch_name: (branch?.name as string | null) ?? null,
      address: (data.address as string | null) ?? null,
      notes: (data.notes as string | null) ?? null,
      last_login_at: (user.last_login_at as string | null) ?? null,
      created_at: data.created_at as string,
      is_self: (user.id as string) === manager.sub,
    };
  }
}

export const staffService = new StaffService();
