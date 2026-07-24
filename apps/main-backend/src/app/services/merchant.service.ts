import { supabaseAdmin } from "../utils/supabase.client";
import {
  MerchantWithStats,
  UpdateMerchantRequest,
} from "../schemas/merchant.schema";
import { QueryFragments } from "../constants/queryFragments";

/**
 * Merchant service — handles "my merchant" resolution and aggregates.
 * All reads/writes are scoped to a verified merchant_id (resolved upstream
 * from the JWT or staff lookup).
 */
export class MerchantService {
  /**
   * Resolve the merchant_id for a user via staff → branches → merchants.
   * Returns null when the user has no staff row (no-merchant state).
   */
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
    const branch = (staff as any)?.branches;
    const merchant = branch?.merchants;
    if (!branch?.id || !merchant?.id) return null;
    return {
      merchant_id: Number(merchant.id),
      branch_id: Number(branch.id),
    };
  }

  /**
   * Fetch the merchant row plus the 4 stats + pool for the My Store hero/stats.
   */
  async getMyMerchantWithStats(
    merchantId: number,
  ): Promise<MerchantWithStats | null> {
    const { data: merchant, error } = await supabaseAdmin
      .from("merchants")
      .select(QueryFragments.BASE_MERCHART)
      .eq("id", merchantId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !merchant) return null;

    // branch_count
    const { count: branchCount } = await supabaseAdmin
      .from("branches")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchantId)
      .is("deleted_at", null);

    // staff_count — staff joined to branches of this merchant
    const { count: staffCount } = await supabaseAdmin
      .from("staff")
      .select("id, branch_id!inner(merchant_id)", {
        count: "exact",
        head: true,
      })
      .eq("branch_id.merchant_id", merchantId)
      .is("deleted_at", null);

    // customer_count — distinct customers who have transacted across this
    // merchant's branches (server-side aggregate via RPC).
    const { data: custCountRes, error: custCountErr } =
      await supabaseAdmin.rpc("get_distinct_customer_count", {
        p_merchant_id: merchantId,
      });
    if (custCountErr) {
      throw new Error(
        `Failed to load merchant customer count: ${custCountErr.message}`,
      );
    }
    const customerCount =
      custCountRes == null ? 0 : Number(custCountRes as unknown);

    // lifetime_credit_issued — sum of customer_credit.credit_amount across
    // the merchant's branches. The old customer_transactions.credit_generated
    // column is gone after the re-architecture; customer_credit now stores the
    // calculated GHS amount directly.
    const { data: branchIdRows } = await supabaseAdmin
      .from("branches")
      .select("id")
      .eq("merchant_id", merchantId)
      .is("deleted_at", null);
    const merchantBranchIds = (branchIdRows ?? []).map((b) => (b as any).id);

    let lifetimeCreditIssued = 0;
    if (merchantBranchIds.length > 0) {
      const { data: issuedRows } = await supabaseAdmin
        .from("customer_credit")
        .select("credit_amount")
        .in("branch_id", merchantBranchIds)
        .is("deleted_at", null)
        .is("revoked_at", null);
      lifetimeCreditIssued = (issuedRows ?? []).reduce(
        (sum, r) => sum + Number((r as any).credit_amount ?? 0),
        0,
      );
    }

    return {
      id: merchant.id,
      name: merchant.name,
      phone: merchant.phone,
      country_code: merchant.country_code,
      slug: merchant.slug,
      logo_url: merchant.logo_url,
      cover_photo_url: merchant.cover_photo_url,
      is_active: merchant.is_active,
      created_at: merchant.created_at,
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

  /**
   * Update editable fields on the merchant profile.
   * Pool columns and is_active are intentionally not editable here.
   */
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
}

export const merchantService = new MerchantService();
