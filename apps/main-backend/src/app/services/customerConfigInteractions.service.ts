import { supabaseAdmin } from "../utils/supabase.client";
import { QueryFragments } from "../constants/queryFragments";
import {
  shapeRunningConfig,
  shapeFixedConfig,
} from "../utils/creditConfig.utils";
import {
  FavoritedFixedCreditConfig,
  FavoritedRunningCreditConfig,
} from "../types/creditConfig.types";

export type ConfigType = "running" | "fixed";

const RUNNING_FAV_SELECT = `created_at, running_credit_config!inner(${QueryFragments.BASE_RUNNING_CREDIT_CONFIG}, branch_running_credit_config(deleted_at, branch:branches!inner(${QueryFragments.BASE_BRANCH})))` as const;

const FIXED_FAV_SELECT = `created_at, fixed_credit_config!inner(${QueryFragments.BASE_FIXED_CREDIT_CONFIG}, branch_fixed_credit_config(deleted_at, branch:branches!inner(${QueryFragments.BASE_BRANCH})))` as const;

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

  async listMyFavorites(customerId: number): Promise<{
    running: FavoritedRunningCreditConfig[];
    fixed: FavoritedFixedCreditConfig[];
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

    const running: FavoritedRunningCreditConfig[] = runningRes.data.map(
      (row) => ({
        ...shapeRunningConfig(row.running_credit_config),
        favorited_at: row.created_at,
      }),
    );
    const fixed: FavoritedFixedCreditConfig[] = fixedRes.data.map((row) => ({
      ...shapeFixedConfig(row.fixed_credit_config),
      favorited_at: row.created_at,
    }));
    return { running, fixed };
  }
}

export const customerConfigInteractionsService =
  new CustomerConfigInteractionsService();