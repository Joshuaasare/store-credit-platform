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
    const [
      { data: merchant, error },
      { data: custCountRes, error: custCountErr },
    ] = await Promise.all([
      supabaseAdmin
        .from("merchants")
        .select(
          `${QueryFragments.BASE_MERCHANT}, branches:branches(id, staff:staff(id), customer_credit(credit_amount))` as const,
        )
        .eq("id", merchantId)
        .is("deleted_at", null)
        .is("branches.deleted_at", null)
        .is("branches.staff.deleted_at", null)
        .is("branches.customer_credit.deleted_at", null)
        .is("branches.customer_credit.revoked_at", null)
        .maybeSingle(),
      supabaseAdmin.rpc("get_distinct_customer_count", {
        p_merchant_id: merchantId,
      }),
    ]);

    if (error || !merchant) return null;
    if (custCountErr) {
      throw new Error(
        `Failed to load merchant customer count: ${custCountErr.message}`,
      );
    }

    const { branches, ...merchantFields } = merchant;
    const branchRows = branches ?? [];
    const branchCount = branchRows.length;
    const staffCount = branchRows.reduce(
      (sum, b) => sum + (b.staff?.length ?? 0),
      0,
    );
    const lifetimeCreditIssued = branchRows
      .flatMap((b) => b.customer_credit ?? [])
      .reduce((sum, c) => sum + Number(c.credit_amount ?? 0), 0);
    const customerCount = custCountRes == null ? 0 : Number(custCountRes);

    return {
      ...merchantFields,
      branch_count: branchCount,
      staff_count: staffCount,
      customer_count: customerCount,
      lifetime_credit_issued: lifetimeCreditIssued,
      credit_pool_used: Number(merchantFields.credit_pool_used ?? 0),
      credit_pool_limit: Number(merchantFields.credit_pool_limit),
    };
  }

  // Pool columns and is_active are intentionally not editable here.
  async updateMyMerchant(
    merchantId: number,
    payload: UpdateMerchantRequest,
  ): Promise<MerchantWithStats | null> {
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
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
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
