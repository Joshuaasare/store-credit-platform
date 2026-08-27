import { supabaseAdmin } from "../utils/supabase.client";
import {
  MerchantWithStats,
  UpdateMerchantRequest,
} from "../schemas/merchant.schema";
import { QueryFragments } from "../constants/queryFragments";
import { storageService } from "./storage.service";

export class MerchantService {
  // Returns null when the user has no staff row (no-merchant state).
  async getMerchantIdForUser(
    userId: string,
  ): Promise<{ merchant_id: number; branch_id: number } | null> {
    const { data: staff } = await supabaseAdmin
      .from("staff")
      .select(`id,branches(id,merchants(id))`)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!staff) return null;
    const branch = staff?.branches;
    const merchant = branch?.merchants;
    if (!branch?.id || !merchant?.id) return null;
    return {
      merchant_id: Number(merchant.id),
      branch_id: Number(branch.id),
    };
  }

  async getMyMerchantWithStats(
    merchantId: number,
  ): Promise<MerchantWithStats | null> {
    const { data: merchant, error } = await supabaseAdmin
      .from("merchants")
      .select(QueryFragments.BASE_MERCHANT)
      .eq("id", merchantId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !merchant) return null;

    const { count: branchCount } = await supabaseAdmin
      .from("branches")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchantId)
      .is("deleted_at", null);

    const { count: staffCount } = await supabaseAdmin
      .from("staff")
      .select("id, branch_id!inner(merchant_id)", {
        count: "exact",
        head: true,
      })
      .eq("branch_id.merchant_id", merchantId)
      .is("deleted_at", null);

    // distinct customer count via RPC (the branch_customer junction is gone).
    const { data: custCountRes, error: custCountErr } = await supabaseAdmin.rpc(
      "get_distinct_customer_count",
      {
        p_merchant_id: merchantId,
      },
    );
    if (custCountErr) {
      throw new Error(
        `Failed to load merchant customer count: ${custCountErr.message}`,
      );
    }
    const customerCount = custCountRes == null ? 0 : Number(custCountRes);

    // lifetime_credit_issued = sum of customer_credit.credit_amount (the old customer_transactions.credit_generated column is gone).
    const { data: branchIdRows } = await supabaseAdmin
      .from("branches")
      .select("id")
      .eq("merchant_id", merchantId)
      .is("deleted_at", null);
    const merchantBranchIds = (branchIdRows ?? []).map((b) => b.id);

    let lifetimeCreditIssued = 0;
    if (merchantBranchIds.length > 0) {
      const { data: issuedRows } = await supabaseAdmin
        .from("customer_credit")
        .select("credit_amount")
        .in("branch_id", merchantBranchIds)
        .is("deleted_at", null)
        .is("revoked_at", null);
      lifetimeCreditIssued = (issuedRows ?? []).reduce(
        (sum, r) => sum + Number(r.credit_amount ?? 0),
        0,
      );
    }

    return {
      ...merchant,
      branch_count: branchCount ?? 0,
      staff_count: staffCount ?? 0,
      customer_count: customerCount ?? 0,
      lifetime_credit_issued: lifetimeCreditIssued,
      credit_pool_used: Number(merchant.credit_pool_used ?? 0),
      credit_pool_limit:
        merchant.credit_pool_limit == null
          ? null
          : Number(merchant.credit_pool_limit),
    };
  }

  // Pool columns and is_active are intentionally not editable here.
  async updateMyMerchant(
    merchantId: number,
    payload: UpdateMerchantRequest,
  ): Promise<MerchantWithStats | null> {
    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (payload.name !== undefined) update.name = payload.name;
    if (payload.phone !== undefined) update.phone = payload.phone;
    if (payload.country_code !== undefined)
      update.country_code = payload.country_code;
    if (payload.slug !== undefined) update.slug = payload.slug;
    if (payload.logo_url !== undefined) update.logo_url = payload.logo_url;
    if (payload.cover_photo_url !== undefined)
      update.cover_photo_url = payload.cover_photo_url;

    // Why: delete the previous object so replacing a logo/cover doesn't orphan it in the bucket.
    const { data: current } = await supabaseAdmin
      .from("merchants")
      .select("logo_url, cover_photo_url")
      .eq("id", merchantId)
      .is("deleted_at", null)
      .maybeSingle();

    if (current) {
      if (
        payload.logo_url !== undefined &&
        current.logo_url &&
        payload.logo_url !== current.logo_url
      ) {
        try {
          await storageService.deleteFileByUrl(
            "store-assets",
            current.logo_url,
          );
        } catch (err) {
          console.warn("Failed to delete previous logo:", err);
        }
      }
      if (
        payload.cover_photo_url !== undefined &&
        current.cover_photo_url &&
        payload.cover_photo_url !== current.cover_photo_url
      ) {
        try {
          await storageService.deleteFileByUrl(
            "store-assets",
            current.cover_photo_url,
          );
        } catch (err) {
          console.warn("Failed to delete previous cover photo:", err);
        }
      }
    }

    const { error } = await supabaseAdmin
      .from("merchants")
      .update(update)
      .eq("id", merchantId)
      .is("deleted_at", null);

    if (error) {
      throw new Error(`Failed to update merchant: ${error.message}`);
    }

    return this.getMyMerchantWithStats(merchantId);
  }

  async searchMerchants(query: string) {
    const trimmed = query.trim();
    if (trimmed.length === 0) return [];

    // Escape PostgREST ilike metacharacters so a user-typed "%" doesn't match
    // everything. Order matters: escape backslashes first.
    const escaped = trimmed
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");
    const pattern = `%${escaped}%`;

    const { data, error } = await supabaseAdmin
      .from("merchants")
      .select(QueryFragments.BASE_MERCHANT)
      .eq("is_active", true)
      .ilike("name", pattern)
      .order("name", { ascending: true })
      .limit(20);

    if (error) {
      throw new Error(`merchant search failed: ${error.message}`);
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      logo_url: row.logo_url,
    }));
  }
}

export const merchantService = new MerchantService();
