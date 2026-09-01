import { supabaseAdmin } from "../utils/supabase.client";
import { QueryFragments } from "../constants/queryFragments";
import {
  BranchWithAggregates,
  CreateBranchRequest,
  UpdateBranchRequest,
} from "../schemas/branch.schema";
import {
  BranchesNearbyFilters,
  BranchesNearbyPage,
  BranchSearchFilters,
  BranchSearchPage,
  BranchWithOffers,
} from "../types/branch.types";
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
        category: payload.category ?? null,
        purchase_threshold_amount: payload.purchase_threshold_amount ?? null,
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
    filters: BranchesNearbyFilters,
  ): Promise<BranchesNearbyPage> {
    const { lat, lng, category, limit = 20, offset = 0 } = filters;
    const nowMs = Date.now();
    // Fixed config end_date is "through the end of the expiry day". Legacy rows
    // stored at midnight would drop out of the feed at 00:00 of their expiry
    // day; comparing end_date against UTC start-of-today keeps them in for the
    // whole day. Equivalent to `now <= endOfDay(end_date)` for both legacy
    // midnight and normalized 23:59 data, without a backfill.
    const now = new Date(nowMs);
    const startOfTodayMs = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    let query = supabaseAdmin
      .from("branches")
      .select(
        `${QueryFragments.BASE_BRANCH},
        merchant:merchants(${QueryFragments.BASE_MERCHANT}),
        branch_running_credit_config(deleted_at,running_credit_config:running_credit_config!inner(${QueryFragments.BASE_RUNNING_CREDIT_CONFIG})),
        branch_fixed_credit_config(deleted_at,fixed_credit_config:fixed_credit_config!inner(${QueryFragments.BASE_FIXED_CREDIT_CONFIG}))` as const,
      )
      .is("deleted_at", null)
      .eq("is_active", true)
      .eq("merchant.is_active", true)
      .is("branch_running_credit_config.deleted_at", null)
      .eq("branch_running_credit_config.running_credit_config.is_active", true)
      .is("branch_running_credit_config.running_credit_config.deleted_at", null)
      .is("branch_fixed_credit_config.deleted_at", null)
      .eq("branch_fixed_credit_config.fixed_credit_config.is_active", true)
      .is("branch_fixed_credit_config.fixed_credit_config.deleted_at", null);
    if (category && category.length > 0) {
      query = query.in("category", category);
    }
    const { data, error } = await query;

    if (error) {
      throw new Error(`getBranchesByLocation: ${error.message}`);
    }

    const results: BranchWithOffers[] = [];
    for (const row of data) {
      const running = (row?.branch_running_credit_config ?? [])
        .filter((j) => !j?.deleted_at)
        .map((j) => ({
          ...j.running_credit_config,
          images: coerceImages(j.running_credit_config.images),
        }));
      // Filter the active window in JS so null start/end ("perpetual" promos)
      // count as unbounded — DB-level `.lte`/`.gte` exclude nulls, which would
      // drop perpetual configs from the feed. end_date is "through the end of
      // the expiry day", so compare against UTC start-of-today (see above).
      const fixed = (row?.branch_fixed_credit_config ?? [])
        .filter((j) => !j?.deleted_at)
        .map((j) => ({
          ...j.fixed_credit_config,
          images: coerceImages(j.fixed_credit_config.images),
        }))
        .filter((c) => {
          const started = c.start_date == null || c.start_date <= nowMs;
          const notEnded = c.end_date == null || c.end_date >= startOfTodayMs;
          return started && notEnded;
        });
      if (running?.length === 0 && fixed?.length === 0) continue;
      const {
        merchant,
        branch_running_credit_config: _r,
        branch_fixed_credit_config: _f,
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

    const shaped = sortByDistance(results);
    return {
      rows: shaped.slice(offset, offset + limit),
      total: shaped.length,
      offset,
      limit,
    };
  }

  // Search overrides category (mutually exclusive modes). Reuses the nearby query
  // then applies a JS filter on name / merchant.name / city.
  async searchBranchesByLocation(
    filters: BranchSearchFilters,
  ): Promise<BranchSearchPage> {
    const { lat, lng, query: q, limit = 20, offset = 0 } = filters;
    const trimmed = q.trim().toLowerCase();
    if (trimmed === "") {
      return { rows: [], total: 0, offset, limit };
    }
    const all = await this.getBranchesByLocation({
      lat,
      lng,
      limit: Number.MAX_SAFE_INTEGER,
      offset: 0,
    });
    const filtered = all.rows.filter((b) => {
      const name = (b.name ?? "").toLowerCase();
      const merchantName = (b.merchant?.name ?? "").toLowerCase();
      const city = (b.city ?? "").toLowerCase();
      return (
        name.includes(trimmed) ||
        merchantName.includes(trimmed) ||
        city.includes(trimmed)
      );
    });
    return {
      rows: filtered.slice(offset, offset + limit),
      total: filtered.length,
      offset,
      limit,
    };
  }
}

export const branchService = new BranchService();
