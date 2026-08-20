import { supabaseAdmin } from "../utils/supabase.client";
import { AccessTokenPayload } from "../schemas/auth.schema";
import { randomUUID } from "crypto";
import {
  Staff,
  StaffListFilters,
  StaffListPage,
  CreateStaffRequest,
  UpdateStaffRequest,
} from "../schemas/staff.schema";
import { QueryFragments } from "../constants/queryFragments";
import { splitSearchTerm } from "../utils/misc.utils";
import { normalizePhone } from "../utils/phone.utils";

export class StaffService {
  private static readonly DEFAULT_LIMIT = 50;

  async listStaff(
    manager: AccessTokenPayload,
    filters: StaffListFilters,
  ): Promise<StaffListPage> {
    const merchantId = await this.resolveMerchantId(manager);
    const limit = filters.limit ?? StaffService.DEFAULT_LIMIT;
    const offset = filters.offset ?? 0;
    // Disabled users (access_granted = false) stay visible in the directory — deletion is the only thing that hides a row. include_disabled is a no-op kept for back-compat with the querystring schema.
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
      .is("branch.deleted_at", null);

    if (filters.branch_id != null) {
      query = query.eq("branch_id", filters.branch_id);
    }
    if (filters.role != null) {
      query = query.eq("role", filters.role);
    }
    if (search) {
      const termParts = splitSearchTerm(search);
      for (const part of termParts) {
        query = query.or(`surname.ilike.%${part}%,other_names.ilike.%${part}%`);
      }
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      throw new Error(`Failed to load staff: ${error.message}`);
    }

    return {
      rows: data,
      total: count ?? data.length,
      offset,
      limit,
    };
  }

  // Branch must belong to the merchant. If a soft-deleted users row with the same phone exists, auto-restore it (clear deleted_at, refresh name + access) and create a fresh staff row carrying the role. If a live users row with the same phone exists, returns 409. Names + access_granted live on staff, not users.
  async createStaff(
    manager: AccessTokenPayload,
    payload: CreateStaffRequest,
  ): Promise<Staff> {
    const merchantId = await this.resolveMerchantId(manager);
    await this.assertBranchOwned(payload.branch_id, merchantId);

    const phone = normalizePhone(payload.phone);
    const accessGranted = payload.access_granted ?? true;

    const { data: existing, error: existErr } = await supabaseAdmin
      .from("users")
      .select("id, deleted_at")
      .eq("phone", phone)
      .maybeSingle();
    if (existErr) {
      throw new Error(`Failed to check existing phone: ${existErr.message}`);
    }

    if (existing && existing.deleted_at === null) {
      throw new Error("A staff member with this phone already exists");
    }

    // existing && existing.deleted_at != null → auto-restore path (upsert clears deleted_at). existing == null → fresh insert.
    const newUserId = existing?.id ?? randomUUID();

    const { error: createUserErr } = await supabaseAdmin.from("users").upsert(
      {
        id: newUserId,
        phone,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (createUserErr) {
      throw new Error(`Failed to create user: ${createUserErr.message}`);
    }

    // Insert the staff row with role + name + access carried directly (old tombstoned staff rows stay tombstoned).
    const { error: staffInsertErr } = await supabaseAdmin.from("staff").insert({
      user_id: newUserId,
      branch_id: payload.branch_id,
      role: payload.role,
      surname: payload.surname,
      other_names: payload.other_names ?? null,
      access_granted: accessGranted,
      address: payload.address ?? null,
      notes: payload.notes ?? null,
    });
    if (staffInsertErr) {
      throw new Error(`Failed to create staff row: ${staffInsertErr.message}`);
    }

    return (await this.fetchStaffUser(manager, newUserId))!;
  }

  // Full-replace semantics. Self-protection: a manager cannot change their own role or access_granted. Last-manager guard: a manager cannot demote/disable the last manager. Phone collisions return 409.
  async updateStaff(
    manager: AccessTokenPayload,
    userId: string,
    payload: UpdateStaffRequest,
  ): Promise<Staff> {
    const merchantId = await this.resolveMerchantId(manager);
    const current = await this.fetchStaffUser(manager, userId);
    const {
      role,
      access_granted,
      branch_id,
      surname,
      other_names,
      address,
      notes,
      phone,
    } = payload;
    if (!current) {
      throw new Error("Staff member not found");
    }

    const roleChanging = !!role && role !== current.role;
    const accessChanging =
      !!access_granted && access_granted !== current.access_granted;

    if (userId === manager.sub && (roleChanging || accessChanging)) {
      throw new Error("You cannot change your own role or access");
    }

    if (
      current.role === "manager" &&
      current.access_granted &&
      ((roleChanging && role !== "manager") ||
        (accessChanging && payload.access_granted === false))
    ) {
      await this.assertNotLastManager(merchantId, userId);
    }

    if (branch_id != null && branch_id !== current.branch_id) {
      await this.assertBranchOwned(branch_id, merchantId);
    }

    const normalizedPhone = phone ? normalizePhone(phone) : null;
    if (normalizedPhone != null && normalizedPhone !== current.user.phone) {
      const { data: conflict } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("phone", normalizedPhone)
        .neq("id", userId)
        .is("deleted_at", null)
        .maybeSingle();
      if (conflict) {
        throw new Error("Another staff member already uses this phone");
      }
    }

    // users row carries phone only — names + access live on staff.
    const userUpdate: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (normalizedPhone != null) userUpdate.phone = normalizedPhone;
    const { error: userErr } = await supabaseAdmin
      .from("users")
      .update(userUpdate)
      .eq("id", userId)
      .is("deleted_at", null);
    if (userErr) {
      throw new Error(`Failed to update user: ${userErr.message}`);
    }

    const staffUpdate: Record<string, unknown> = {};
    if (branch_id != null) staffUpdate.branch_id = branch_id;
    if (roleChanging) staffUpdate.role = role;
    if (access_granted != null) staffUpdate.access_granted = access_granted;
    if (surname != null) staffUpdate.surname = surname;
    if (other_names !== undefined) staffUpdate.other_names = other_names;
    if (address !== undefined) staffUpdate.address = address;
    if (notes !== undefined) staffUpdate.notes = notes;
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

  // Reuses updateStaff so self-protection + last-manager guard both apply.
  async setStaffAccess(
    manager: AccessTokenPayload,
    userId: string,
    accessGranted: boolean,
  ): Promise<Staff> {
    return this.updateStaff(manager, userId, { access_granted: accessGranted });
  }

  // Tombstones users + every linked staff row. Self-protection + last-manager guard apply. The phone is NOT freed — re-adding it later auto-restores the same user row.
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

    if (current.role === "manager" && current.access_granted) {
      await this.assertNotLastManager(merchantId, userId);
    }

    const nowIso = new Date().toISOString();
    const branchIds = await this.merchantBranchIds(merchantId);

    // Tombstone staff rows first so a re-add race can't resurrect them.
    const { error: staffErr } = await supabaseAdmin
      .from("staff")
      .update({ deleted_at: nowIso })
      .eq("user_id", userId)
      .is("deleted_at", null)
      .in("branch_id", branchIds);
    if (staffErr) {
      throw new Error(`Failed to tombstone staff rows: ${staffErr.message}`);
    }

    // Tombstone the user row last — also blocks login (verifyOtp checks deleted_at IS NULL).
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
    const mid = data?.branches?.merchant_id;
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
    return (data ?? []).map((b) => b.id);
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

    if (error || !data?.id) {
      throw new Error("Branch does not belong to your merchant");
    }
  }

  // Counts active managers in the merchant excluding the target user. Dotted-column filters (user.deleted_at, branch.merchant_id) infer natively — no `as any` per the supabase-query-conventions skill. Count 0 → target is the last manager, operation blocked.
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
      .eq("access_granted", true)
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

  // Re-fetches a single Staff by user_id (merchant-scoped via manager). `.not("role", "is", null)` guarantees role is non-null at runtime; `as const` on the select string narrows the typed builder so role resolves to its enum union and the result lands directly on the composed Staff shape without an `as` cast. Returns null when the user has no live staff row at the merchant's branches or is tombstoned.
  private async fetchStaffUser(
    manager: AccessTokenPayload,
    userId: string,
  ): Promise<Staff | null> {
    const merchantId = await this.resolveMerchantId(manager);

    const { data, error } = await supabaseAdmin
      .from("staff")
      .select(
        `${QueryFragments.BASE_STAFF},
         branch:branches!inner(${QueryFragments.BASE_BRANCH}),
         user:users!inner(${QueryFragments.BASE_USER_PROFILE})` as const,
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

    return data;
  }
}

export const staffService = new StaffService();