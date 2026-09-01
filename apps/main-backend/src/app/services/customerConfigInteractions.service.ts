import { supabaseAdmin } from "../utils/supabase.client";
import { QueryFragments } from "../constants/queryFragments";
import {
  shapeRunningConfig,
  shapeFixedConfig,
} from "../utils/creditConfig.utils";
import {
  CustomerFavoritesPage,
  FavoritedConfig,
  FavoritedFixedCreditConfig,
  FavoritedMerchantSummary,
  FavoritedRunningCreditConfig,
} from "../types/creditConfig.types";

export type ConfigType = "running" | "fixed";

const RUNNING_FAV_SELECT = `created_at, running_credit_config!inner(${QueryFragments.BASE_RUNNING_CREDIT_CONFIG}, branch_running_credit_config(deleted_at, branch:branches!inner(${QueryFragments.BASE_BRANCH}, merchant:merchants(${QueryFragments.BASE_MERCHANT}))))` as const;

const FIXED_FAV_SELECT = `created_at, fixed_credit_config!inner(${QueryFragments.BASE_FIXED_CREDIT_CONFIG}, branch_fixed_credit_config(deleted_at, branch:branches!inner(${QueryFragments.BASE_BRANCH}, merchant:merchants(${QueryFragments.BASE_MERCHANT}))))` as const;

// A config always belongs to one merchant; surface it from the first live
// branch so the Favorites list can show name + logo without another query.
function merchantSummary(
  junctions:
    | {
        deleted_at: string | null;
        branch: {
          merchant: {
            id: number;
            name: string | null;
            logo_url: string | null;
          } | null;
        } | null;
      }[]
    | null,
): FavoritedMerchantSummary | null {
  for (const j of junctions ?? []) {
    if (j?.deleted_at) continue;
    const m = j?.branch?.merchant;
    if (m) return { id: m.id, name: m.name, logo_url: m.logo_url };
  }
  return null;
}

// Global favorite counts (all customers) keyed by config id. supabase-js has
// no group-by, so one ungrouped query per table and tally in JS.
export async function fetchFavoriteCounts(
  runningIds: number[],
  fixedIds: number[],
): Promise<{ running: Map<number, number>; fixed: Map<number, number> }> {
  const [runningRes, fixedRes] = await Promise.all([
    runningIds.length > 0
      ? supabaseAdmin
          .from("customer_running_config_favorites")
          .select("running_config_id")
          .in("running_config_id", runningIds)
      : Promise.resolve({ data: [], error: null }),
    fixedIds.length > 0
      ? supabaseAdmin
          .from("customer_fixed_config_favorites")
          .select("fixed_config_id")
          .in("fixed_config_id", fixedIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (runningRes.error)
    throw new Error(`Failed to count favorites: ${runningRes.error.message}`);
  if (fixedRes.error)
    throw new Error(`Failed to count favorites: ${fixedRes.error.message}`);
  const running = new Map<number, number>();
  for (const row of runningRes.data) {
    running.set(
      row.running_config_id,
      (running.get(row.running_config_id) ?? 0) + 1,
    );
  }
  const fixed = new Map<number, number>();
  for (const row of fixedRes.data) {
    fixed.set(row.fixed_config_id, (fixed.get(row.fixed_config_id) ?? 0) + 1);
  }
  return { running, fixed };
}

class CustomerConfigInteractionsService {
  // Favoriting is per config, not per branch — the heart toggles the same
  // (customer, config) pair no matter which branch page it was pressed on.
  async addFavorite(
    configType: ConfigType,
    configId: number,
    customerId: number,
  ): Promise<void> {
    if (configType === "running") {
      const { error } = await supabaseAdmin
        .from("customer_running_config_favorites")
        .upsert(
          { customer_id: customerId, running_config_id: configId, deleted_at: null },
          { onConflict: "customer_id,running_config_id" },
        );
      if (error)
        throw new Error(`Failed to favorite config: ${error.message}`);
      return;
    }
    const { error } = await supabaseAdmin
      .from("customer_fixed_config_favorites")
      .upsert(
        { customer_id: customerId, fixed_config_id: configId, deleted_at: null },
        { onConflict: "customer_id,fixed_config_id" },
      );
    if (error)
      throw new Error(`Failed to favorite config: ${error.message}`);
  }

  // Unfavoriting hard-deletes the row — no soft-delete trail.
  async removeFavorite(
    configType: ConfigType,
    configId: number,
    customerId: number,
  ): Promise<void> {
    if (configType === "running") {
      const { error } = await supabaseAdmin
        .from("customer_running_config_favorites")
        .delete()
        .eq("customer_id", customerId)
        .eq("running_config_id", configId);
      if (error)
        throw new Error(`Failed to unfavorite config: ${error.message}`);
      return;
    }
    const { error } = await supabaseAdmin
      .from("customer_fixed_config_favorites")
      .delete()
      .eq("customer_id", customerId)
      .eq("fixed_config_id", configId);
    if (error)
      throw new Error(`Failed to unfavorite config: ${error.message}`);
  }

  // Every tap counts — no dedup. PostgREST can't increment in a PATCH body,
  // so read-modify-write; a lost update under concurrent clicks is acceptable
  // for a link-visit tally.
  async recordClick(configType: ConfigType, configId: number): Promise<void> {
    if (configType === "running") {
      const { data, error: readErr } = await supabaseAdmin
        .from("running_credit_config")
        .select("click_count")
        .eq("id", configId)
        .is("deleted_at", null)
        .maybeSingle();
      if (readErr) throw new Error(`Failed to load config: ${readErr.message}`);
      if (!data) throw new Error("Config not found");
      const { error } = await supabaseAdmin
        .from("running_credit_config")
        .update({ click_count: data.click_count + 1 })
        .eq("id", configId);
      if (error)
        throw new Error(`Failed to record click: ${error.message}`);
      return;
    }
    const { data, error: readErr } = await supabaseAdmin
      .from("fixed_credit_config")
      .select("click_count")
      .eq("id", configId)
      .is("deleted_at", null)
      .maybeSingle();
    if (readErr) throw new Error(`Failed to load config: ${readErr.message}`);
    if (!data) throw new Error("Config not found");
    const { error } = await supabaseAdmin
      .from("fixed_credit_config")
      .update({ click_count: data.click_count + 1 })
      .eq("id", configId);
    if (error)
      throw new Error(`Failed to record click: ${error.message}`);
  }

  async listMyFavorites(customerId: number): Promise<{
    running: FavoritedRunningCreditConfig[];
    fixed: FavoritedFixedCreditConfig[];
  }> {
    const { running, fixed } = await this.fetchAllFavorites(customerId);
    return {
      running: running.map((r) => r.config),
      fixed: fixed.map((r) => r.config),
    };
  }

  // Merged single-list view for the Favorites tab. A customer's favorites are
  // small (manual taps, not traffic), so fetch both tables fully and paginate
  // in JS — avoids a cross-table cursor with independent id sequences.
  async listMyFavoritesPage(
    customerId: number,
    opts: { limit?: number; offset?: number } = {},
  ): Promise<CustomerFavoritesPage> {
    const limit = Math.min(Math.max(1, opts.limit ?? 20), 50);
    const offset = Math.max(0, opts.offset ?? 0);
    const { running, fixed } = await this.fetchAllFavorites(customerId);
    const merged: FavoritedConfig[] = [
      ...running.map((r) => ({
        config_type: "running" as const,
        config: r.config,
        merchant: r.merchant,
      })),
      ...fixed.map((r) => ({
        config_type: "fixed" as const,
        config: r.config,
        merchant: r.merchant,
      })),
    ].sort((a, b) => (a.config.favorited_at < b.config.favorited_at ? 1 : -1));
    return {
      rows: merged.slice(offset, offset + limit),
      total: merged.length,
      offset,
      limit,
    };
  }

  private async fetchAllFavorites(customerId: number): Promise<{
    running: {
      config: FavoritedRunningCreditConfig;
      merchant: FavoritedMerchantSummary | null;
    }[];
    fixed: {
      config: FavoritedFixedCreditConfig;
      merchant: FavoritedMerchantSummary | null;
    }[];
  }> {
    const [runningRes, fixedRes] = await Promise.all([
      supabaseAdmin
        .from("customer_running_config_favorites")
        .select(RUNNING_FAV_SELECT)
        .eq("customer_id", customerId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("customer_fixed_config_favorites")
        .select(FIXED_FAV_SELECT)
        .eq("customer_id", customerId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ]);
    if (runningRes.error)
      throw new Error(`Failed to load favorites: ${runningRes.error.message}`);
    if (fixedRes.error)
      throw new Error(`Failed to load favorites: ${fixedRes.error.message}`);

    const running = runningRes.data.map((row) => ({
      config: {
        ...shapeRunningConfig(row.running_credit_config),
        favorited_at: row.created_at,
      },
      merchant: merchantSummary(
        row.running_credit_config.branch_running_credit_config,
      ),
    }));
    const fixed = fixedRes.data.map((row) => ({
      config: {
        ...shapeFixedConfig(row.fixed_credit_config),
        favorited_at: row.created_at,
      },
      merchant: merchantSummary(
        row.fixed_credit_config.branch_fixed_credit_config,
      ),
    }));
    const counts = await fetchFavoriteCounts(
      running.map((r) => r.config.id),
      fixed.map((r) => r.config.id),
    );
    const withCounts = {
      running: running.map((r) => ({
        ...r,
        config: {
          ...r.config,
          favorite_count: counts.running.get(r.config.id) ?? 0,
        },
      })),
      fixed: fixed.map((r) => ({
        ...r,
        config: {
          ...r.config,
          favorite_count: counts.fixed.get(r.config.id) ?? 0,
        },
      })),
    };
    return withCounts;
  }
}

export const customerConfigInteractionsService =
  new CustomerConfigInteractionsService();