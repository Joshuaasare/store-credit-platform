import { supabaseAdmin } from "../utils/supabase.client";
import {
  MerchantWithStats,
  UpdateMerchantRequest,
} from "../schemas/merchant.schema";
import { QueryFragments } from "../constants/queryFragments";

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