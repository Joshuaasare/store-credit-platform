import { supabaseAdmin } from "../utils/supabase.client";
import { QueryFragments } from "../constants/queryFragments";
import {
  BranchWithAggregates,
  CreateBranchRequest,
  UpdateBranchRequest,
} from "../schemas/branch.schema";
import { BranchWithOffers } from "../types/branch.types";
import { haversineKm, sortByDistance } from "../utils/geo.utils";
import { coerceImages } from "../utils/creditConfig.utils";
import { maxMs } from "../utils/misc.utils";

// Ownership enforced: every read/write verifies the branch belongs to the requesting merchant.
export class BranchService {
  async listBranchesForMerchant(
    merchantId: number,
  ): Promise<BranchWithAggregates[]> {
    const monthStartMs = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    ).getTime();

    const { data: branches, error } = await supabaseAdmin
      .from("branches")
      .select(
        `${QueryFragments.BASE_BRANCH}, staff:staff(id), customer_credit(credit_amount, created_at), customer_purchases(transaction_date), customer_credit_redemptions(created_at)` as const,
      )
      .eq("merchant_id", merchantId)
      .is("deleted_at", null)
      .is("staff.deleted_at", null)
      .is("customer_credit.deleted_at", null)
      .is("customer_credit.revoked_at", null)
      .is("customer_purchases.deleted_at", null)
      .is("customer_credit_redemptions.deleted_at", null)
      .not("customer_credit_redemptions.approved_at", "is", null)
      .order("created_at", { ascending: false });

    if (error || !branches || branches.length === 0) return [];

    const branchIds = branches.map((b) => b.id);

    const customerCountByBranch = new Map<number, number>();
    const custCounts = await Promise.all(
      branchIds.map(async (bid) => {
        const { data, error: err } = await supabaseAdmin.rpc(
          "get_distinct_customer_count",
          { p_merchant_id: merchantId, p_branch_id: bid },
        );
        if (err) {
          throw new Error(
            `Failed to load branch customer count: ${err.message}`,
          );
        }
        return { bid, count: data == null ? 0 : Number(data) };
      }),
    );
    for (const { bid, count } of custCounts) {
      customerCountByBranch.set(bid, count);
    }

    return branches.map((b) => {
      const {
        staff,
        customer_credit: credits,
        customer_purchases: purchases,
        customer_credit_redemptions: redemptions,
        ...branchFields
      } = b;

      const staffCount = staff?.length ?? 0;
      const creditRows = credits ?? [];
      const creditIssuedThisMonth = creditRows
        .filter((c) => new Date(c.created_at).getTime() >= monthStartMs)
        .reduce((sum, c) => sum + Number(c.credit_amount ?? 0), 0);

      const lastCreditMs = maxMs(
        creditRows.map((c) => new Date(c.created_at).getTime()),
      );
      const lastPurchaseMs = maxMs(
        (purchases ?? []).map((p) => Number(p.transaction_date)),
      );
      const lastRedemptionMs = maxMs(
        (redemptions ?? []).map((r) => new Date(r.created_at).getTime()),
      );
      const lastActivityMs = Math.max(
        lastCreditMs,
        lastPurchaseMs,
        lastRedemptionMs,
      );

      return {
        ...branchFields,
        staff_count: staffCount,
        customer_count: customerCountByBranch.get(b.id) ?? 0,
        credit_issued_this_month: creditIssuedThisMonth,
        last_activity_date:
          lastActivityMs > 0 ? new Date(lastActivityMs).toISOString() : null,
      };
    });
  }

  async createBranch(
    merchantId: number,
    payload: CreateBranchRequest,
  ): Promise<BranchWithAggregates> {
    const { data: branch, error } = await supabaseAdmin
      .from("branches")
      .insert({
        merchant_id: merchantId,
        name: payload.name,
        phone: payload.phone ?? null,
        address: payload.address ?? null,
        city: payload.city,
        country_code: payload.country_code,
        is_active: true,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        place_id: payload.place_id ?? null,
      })
      .select(QueryFragments.BASE_BRANCH)
      .single();

    if (error || !branch) {
      throw new Error(
        `Failed to create branch: ${error?.message ?? "unknown"}`,
      );
    }

    return {
      ...branch,
      staff_count: 0,
      customer_count: 0,
      credit_issued_this_month: 0,
      last_activity_date: null,
    };
  }

  // Verifies the branch belongs to the merchant; throws a 403-equivalent on ownership failure.
  async updateBranch(
    branchId: number,
    merchantId: number,
    payload: UpdateBranchRequest,
  ): Promise<BranchWithAggregates> {
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("branches")
      .select("id, merchant_id")
      .eq("id", branchId)
      .is("deleted_at", null)
      .maybeSingle();

    if (lookupError || !existing) {
      throw new Error("Branch not found");
    }
    if (existing.merchant_id !== merchantId) {
      const err = new Error(
        "Forbidden: branch does not belong to your merchant",
      );
      (err as Error & { statusCode?: number }).statusCode = 403;
      throw err;
    }

    const { error } = await supabaseAdmin
      .from("branches")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", branchId);

    if (error) {
      throw new Error(`Failed to update branch: ${error.message}`);
    }

    const all = await this.listBranchesForMerchant(merchantId);
    const updated = all.find((b) => b.id === branchId);
    if (!updated) throw new Error("Branch not found after update");
    return updated;
  }

  async getBranchesByLocation(
    lat: number | null,
    lng: number | null,
  ): Promise<BranchWithOffers[]> {
    const nowMs = Date.now();
    const { data, error } = await supabaseAdmin
      .from("branches")
      .select(
        `${QueryFragments.BASE_BRANCH}, 
        merchant:merchants(${QueryFragments.BASE_MERCHANT}), 
        running_credit_config(${QueryFragments.BASE_RUNNING_CREDIT_CONFIG}), 
        fixed_credit_config(${QueryFragments.BASE_FIXED_CREDIT_CONFIG})` as const,
      )
      .is("deleted_at", null)
      .eq("is_active", true)
      .eq("merchant.is_active", true)
      .eq("running_credit_config.is_active", true)
      .is("running_credit_config.deleted_at", null)
      .eq("fixed_credit_config.is_active", true)
      .is("fixed_credit_config.deleted_at", null)
      .lte("fixed_credit_config.start_date", nowMs)
      .gte("fixed_credit_config.end_date", nowMs);

    if (error) {
      throw new Error(`getBranchesByLocation: ${error.message}`);
    }

    const results: BranchWithOffers[] = [];
    for (const row of data) {
      const running = row?.running_credit_config?.map((c) => ({
        ...c,
        images: coerceImages(c.images),
      }));
      const fixed = row?.fixed_credit_config?.map((c) => ({
        ...c,
        images: coerceImages(c.images),
      }));
      if (running?.length === 0 && fixed?.length === 0) continue;
      const {
        merchant,
        running_credit_config: _r,
        fixed_credit_config: _f,
        ...branchFields
      } = row;
      results.push({
        ...branchFields,
        merchant: merchant ?? null,
        running_configs: running ?? [],
        fixed_configs: fixed ?? [],
        distance_km: haversineKm(lat, lng, row.latitude, row.longitude),
      });
    }

    return sortByDistance(results);
  }

  // Reuses getBranchesByLocation — one query, one composed shape, search is a pure filter on top.
  async searchBranchesByLocation(
    lat: number | null,
    lng: number | null,
    query: string,
  ): Promise<BranchWithOffers[]> {
    const q = query.trim().toLowerCase();
    if (q === "") return [];

    const all = await this.getBranchesByLocation(lat, lng);
    return all.filter((b) => {
      const name = (b.name ?? "").toLowerCase();
      const merchantName = (b.merchant?.name ?? "").toLowerCase();
      const city = (b.city ?? "").toLowerCase();
      return name.includes(q) || merchantName.includes(q) || city.includes(q);
    });
  }
}

export const branchService = new BranchService();
