import { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../utils/supabase.client";
import { Database } from "../types/database.types";
import { QueryFragments } from "../constants/queryFragments";
import {
  CreateRunningCreditConfigRequest,
  UpdateRunningCreditConfigRequest,
  CreateFixedCreditConfigRequest,
  UpdateFixedCreditConfigRequest,
  FixedCreditConfig,
  RunningCreditConfig,
  RunningCreditConfigUpdate,
  FixedCreditConfigUpdate,
} from "../schemas/creditConfig.schema";
import { BaseCustomerCredit } from "../types/main.types";
import { fetchFavoriteCounts } from "./customerConfigInteractions.service";
import {
  normalizeFixedValues,
  normalizeUrl,
  shapeFixedConfig,
  shapeRunningConfig,
  deleteStaleImages,
  deleteImagesForRows,
} from "../utils/creditConfig.utils";

const RUNNING_SELECT = `${QueryFragments.BASE_RUNNING_CREDIT_CONFIG},
branch_running_credit_config!inner(deleted_at,branch:branches!inner(${QueryFragments.BASE_BRANCH}))` as const;

const FIXED_SELECT = `${QueryFragments.BASE_FIXED_CREDIT_CONFIG},
branch_fixed_credit_config!inner(deleted_at,branch:branches!inner(${QueryFragments.BASE_BRANCH}))` as const;

async function fetchRunningConfig(configId: number): Promise<RunningCreditConfig> {
  const { data, error } = await supabaseAdmin
    .from("running_credit_config")
    .select(RUNNING_SELECT)
    .eq("id", configId)
    .is("deleted_at", null)
    .is("branch_running_credit_config.deleted_at", null)
    .is("branch_running_credit_config.branch.deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch config: ${error.message}`);
  if (!data) throw new Error("Config not found");
  const shaped = shapeRunningConfig(data);
  const counts = await fetchFavoriteCounts([shaped.id], []);
  return { ...shaped, favorite_count: counts.running.get(shaped.id) ?? 0 };
}

async function fetchFixedConfig(configId: number): Promise<FixedCreditConfig> {
  const { data, error } = await supabaseAdmin
    .from("fixed_credit_config")
    .select(FIXED_SELECT)
    .eq("id", configId)
    .is("deleted_at", null)
    .is("branch_fixed_credit_config.deleted_at", null)
    .is("branch_fixed_credit_config.branch.deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch config: ${error.message}`);
  if (!data) throw new Error("Config not found");
  const shaped = shapeFixedConfig(data);
  const counts = await fetchFavoriteCounts([], [shaped.id]);
  return { ...shaped, favorite_count: counts.fixed.get(shaped.id) ?? 0 };
}

async function verifyBranchOwnership(merchantId: number, branchIds: number[]) {
  if (branchIds.length === 0) return;
  const { data, error } = await supabaseAdmin
    .from("branches")
    .select("id")
    .in("id", branchIds)
    .eq("merchant_id", merchantId)
    .is("deleted_at", null);
  if (error) throw new Error(`Branch ownership check failed: ${error.message}`);
  if ((data ?? []).length !== branchIds.length) {
    throw new Error("Some branches do not belong to your merchant");
  }
}

async function verifyConfigOwnership(
  merchantId: number,
  table: "running_credit_config" | "fixed_credit_config",
  configId: number,
): Promise<void> {
  const junctionTable =
    table === "running_credit_config"
      ? "branch_running_credit_config"
      : "branch_fixed_credit_config";
  const fkCol =
    table === "running_credit_config"
      ? "running_credit_config_id"
      : "fixed_credit_config_id";
  const { data, error } = await supabaseAdmin
    .from(junctionTable)
    .select(`branch:branches(id,merchant_id,deleted_at)`)
    .eq(fkCol, configId)
    .is("deleted_at", null);
  if (error) throw new Error(`Failed to verify config ownership: ${error.message}`);
  const rows = data ?? [];
  const owned = rows.some(
    (r) =>
      r.branch != null &&
      r.branch.merchant_id === merchantId &&
      r.branch.deleted_at == null,
  );
  if (!owned) throw new Error("Config not found");
}

function normalizeRunningValues(
  payload: CreateRunningCreditConfigRequest | UpdateRunningCreditConfigRequest,
) {
  const maximum_allowed_credit =
    payload.credit_type === "fixed" &&
    payload.maximum_allowed_credit == null &&
    payload.fixed_credit_value != null
      ? payload.fixed_credit_value
      : (payload.maximum_allowed_credit ?? null);
  return {
    credit_type: payload.credit_type,
    credit_validity: payload.credit_validity ?? null,
    eligible_window: payload.eligible_window ?? null,
    fixed_credit_value: payload.fixed_credit_value ?? null,
    percentage_credit_value: payload.percentage_credit_value ?? null,
    maximum_allowed_credit,
    threshold_amount: payload.threshold_amount ?? null,
    terms: payload.terms ?? null,
    url: normalizeUrl(payload.url),
    cumulative_scope: payload.cumulative_scope,
  };
}

export class CreditConfigService {
  async listRunningConfigs(merchantId: number): Promise<RunningCreditConfig[]> {
    const { data, error } = await supabaseAdmin
      .from("running_credit_config")
      .select(RUNNING_SELECT)
      .is("deleted_at", null)
      .is("branch_running_credit_config.deleted_at", null)
      .is("branch_running_credit_config.branch.deleted_at", null)
      .eq("branch_running_credit_config.branch.merchant_id", merchantId)
      .eq("branch_running_credit_config.branch.is_active", true);
    if (error)
      throw new Error(`Failed to list running configs: ${error.message}`);
    const rows = data ?? [];
    const shaped = rows.map((row) => shapeRunningConfig(row));
    const counts = await fetchFavoriteCounts(
      shaped.map((c) => c.id),
      [],
    );
    const byId = new Map<number, RunningCreditConfig>();
    for (const c of shaped) {
      byId.set(c.id, { ...c, favorite_count: counts.running.get(c.id) ?? 0 });
    }
    return Array.from(byId.values()).sort((a, b) =>
      b.created_at > a.created_at ? 1 : -1,
    );
  }

  async createRunningConfig(
    merchantId: number,
    payload: CreateRunningCreditConfigRequest,
  ): Promise<RunningCreditConfig> {
    if (!payload.branch_ids || payload.branch_ids.length === 0) {
      throw new Error("Select at least one branch");
    }
    await verifyBranchOwnership(merchantId, payload.branch_ids);
    const values = normalizeRunningValues(payload);
    const images = payload.images ?? [];
    const { data: inserted, error } = await supabaseAdmin
      .from("running_credit_config")
      .insert({ ...values, images, is_active: true })
      .select("id")
      .single();
    if (error)
      throw new Error(`Failed to create running config: ${error.message}`);
    const configId = inserted.id;
    const junctionRows = payload.branch_ids.map((branch_id) => ({
      branch_id,
      running_credit_config_id: configId,
    }));
    const { error: jErr } = await supabaseAdmin
      .from("branch_running_credit_config")
      .insert(junctionRows);
    if (jErr)
      throw new Error(`Failed to link branches: ${jErr.message}`);
    return fetchRunningConfig(configId);
  }

  async updateRunningConfig(
    merchantId: number,
    configId: number,
    payload: UpdateRunningCreditConfigRequest,
  ): Promise<RunningCreditConfig> {
    if (!payload.branch_ids || payload.branch_ids.length === 0) {
      throw new Error("Select at least one branch");
    }
    await verifyConfigOwnership(merchantId, "running_credit_config", configId);
    await verifyBranchOwnership(merchantId, payload.branch_ids);

    const { data: existingJunctions, error: jErr } = await supabaseAdmin
      .from("branch_running_credit_config")
      .select("branch_id")
      .eq("running_credit_config_id", configId)
      .is("deleted_at", null);
    if (jErr) throw new Error(`Failed to load junction rows: ${jErr.message}`);
    const existingBranchIds = (existingJunctions ?? []).map((r) => r.branch_id);

    const { data: existingConfig, error: cfgErr } = await supabaseAdmin
      .from("running_credit_config")
      .select("images")
      .eq("id", configId)
      .is("deleted_at", null)
      .maybeSingle();
    if (cfgErr) throw new Error(`Failed to load config: ${cfgErr.message}`);
    if (!existingConfig) throw new Error("Config not found");

    const requestedSet = new Set(payload.branch_ids);
    const removed = existingBranchIds.filter((id) => !requestedSet.has(id));
    const added = payload.branch_ids.filter(
      (id) => !existingBranchIds.includes(id),
    );

    const values = normalizeRunningValues(payload);

    // Why: only diff images when payload explicitly provides an array; null = "leave existing alone".
    const updatePayload: RunningCreditConfigUpdate = {
      ...values,
      ...(Array.isArray(payload.images) ? { images: payload.images } : {}),
    };
    if (Array.isArray(payload.images)) {
      await deleteStaleImages(payload.images, [existingConfig]);
    }

    const { error: updErr } = await supabaseAdmin
      .from("running_credit_config")
      .update(updatePayload)
      .eq("id", configId)
      .is("deleted_at", null);
    if (updErr) throw new Error(`Failed to update config: ${updErr.message}`);

    if (removed.length > 0) {
      const { error } = await supabaseAdmin
        .from("branch_running_credit_config")
        .update({ deleted_at: new Date().toISOString() })
        .eq("running_credit_config_id", configId)
        .in("branch_id", removed)
        .is("deleted_at", null);
      if (error) throw new Error(`Failed to remove branches: ${error.message}`);
    }
    if (added.length > 0) {
      const addRows = added.map((branch_id) => ({
        branch_id,
        running_credit_config_id: configId,
      }));
      const { error } = await supabaseAdmin
        .from("branch_running_credit_config")
        .insert(addRows);
      if (error) throw new Error(`Failed to add branches: ${error.message}`);
    }

    return fetchRunningConfig(configId);
  }

  async deleteRunningConfig(merchantId: number, configId: number): Promise<void> {
    await verifyConfigOwnership(merchantId, "running_credit_config", configId);

    const { data: cfg } = await supabaseAdmin
      .from("running_credit_config")
      .select("images")
      .eq("id", configId)
      .is("deleted_at", null)
      .maybeSingle();
    if (cfg) await deleteImagesForRows([cfg]);

    const { error: jErr } = await supabaseAdmin
      .from("branch_running_credit_config")
      .update({ deleted_at: new Date().toISOString() })
      .eq("running_credit_config_id", configId)
      .is("deleted_at", null);
    if (jErr) throw new Error(`Failed to soft-delete junction rows: ${jErr.message}`);

    const { error } = await supabaseAdmin
      .from("running_credit_config")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", configId)
      .is("deleted_at", null);
    if (error)
      throw new Error(`Failed to delete running config: ${error.message}`);
  }

  async toggleRunningConfigActive(
    merchantId: number,
    configId: number,
    isActive: boolean,
  ): Promise<RunningCreditConfig> {
    await verifyConfigOwnership(merchantId, "running_credit_config", configId);
    const { error } = await supabaseAdmin
      .from("running_credit_config")
      .update({ is_active: isActive })
      .eq("id", configId)
      .is("deleted_at", null);
    if (error)
      throw new Error(`Failed to toggle running config: ${error.message}`);
    return fetchRunningConfig(configId);
  }

  async listFixedConfigs(merchantId: number): Promise<FixedCreditConfig[]> {
    const { data, error } = await supabaseAdmin
      .from("fixed_credit_config")
      .select(FIXED_SELECT)
      .is("deleted_at", null)
      .is("branch_fixed_credit_config.deleted_at", null)
      .is("branch_fixed_credit_config.branch.deleted_at", null)
      .eq("branch_fixed_credit_config.branch.merchant_id", merchantId)
      .eq("branch_fixed_credit_config.branch.is_active", true);
    if (error) {
      throw new Error(`Failed to list fixed configs: ${error.message}`);
    }
    const rows = data ?? [];
    const shaped = rows.map((row) => shapeFixedConfig(row));
    const counts = await fetchFavoriteCounts(
      [],
      shaped.map((c) => c.id),
    );
    const byId = new Map<number, FixedCreditConfig>();
    for (const c of shaped) {
      byId.set(c.id, { ...c, favorite_count: counts.fixed.get(c.id) ?? 0 });
    }
    return Array.from(byId.values()).sort((a, b) =>
      b.created_at > a.created_at ? 1 : -1,
    );
  }

  async createFixedConfig(
    merchantId: number,
    payload: CreateFixedCreditConfigRequest,
  ): Promise<FixedCreditConfig> {
    if (!payload.branch_ids || payload.branch_ids.length === 0) {
      throw new Error("Select at least one branch");
    }
    await verifyBranchOwnership(merchantId, payload.branch_ids);
    const values = normalizeFixedValues(payload);
    const images = payload.images ?? [];
    const { data: inserted, error } = await supabaseAdmin
      .from("fixed_credit_config")
      .insert({ ...values, images, is_active: true })
      .select("id")
      .single();
    if (error)
      throw new Error(`Failed to create fixed config: ${error.message}`);
    const configId = inserted.id;
    const junctionRows = payload.branch_ids.map((branch_id) => ({
      branch_id,
      fixed_credit_config_id: configId,
    }));
    const { error: jErr } = await supabaseAdmin
      .from("branch_fixed_credit_config")
      .insert(junctionRows);
    if (jErr)
      throw new Error(`Failed to link branches: ${jErr.message}`);
    return fetchFixedConfig(configId);
  }

  async updateFixedConfig(
    merchantId: number,
    configId: number,
    payload: UpdateFixedCreditConfigRequest,
  ): Promise<FixedCreditConfig> {
    if (!payload.branch_ids || payload.branch_ids.length === 0) {
      throw new Error("Select at least one branch");
    }
    await verifyConfigOwnership(merchantId, "fixed_credit_config", configId);
    await verifyBranchOwnership(merchantId, payload.branch_ids);

    const { data: existingJunctions, error: jErr } = await supabaseAdmin
      .from("branch_fixed_credit_config")
      .select("branch_id")
      .eq("fixed_credit_config_id", configId)
      .is("deleted_at", null);
    if (jErr) throw new Error(`Failed to load junction rows: ${jErr.message}`);
    const existingBranchIds = (existingJunctions ?? []).map((r) => r.branch_id);

    const { data: existingConfig, error: cfgErr } = await supabaseAdmin
      .from("fixed_credit_config")
      .select("images")
      .eq("id", configId)
      .is("deleted_at", null)
      .maybeSingle();
    if (cfgErr) throw new Error(`Failed to load config: ${cfgErr.message}`);
    if (!existingConfig) throw new Error("Config not found");

    const requestedSet = new Set(payload.branch_ids);
    const removed = existingBranchIds.filter((id) => !requestedSet.has(id));
    const added = payload.branch_ids.filter(
      (id) => !existingBranchIds.includes(id),
    );

    const values = normalizeFixedValues(payload);

    // Why: only diff images when payload explicitly provides an array; null = "leave existing alone".
    const updatePayload: FixedCreditConfigUpdate = {
      ...values,
      ...(Array.isArray(payload.images) ? { images: payload.images } : {}),
    };
    if (Array.isArray(payload.images)) {
      await deleteStaleImages(payload.images, [existingConfig]);
    }

    const { error: updErr } = await supabaseAdmin
      .from("fixed_credit_config")
      .update(updatePayload)
      .eq("id", configId)
      .is("deleted_at", null);
    if (updErr) throw new Error(`Failed to update config: ${updErr.message}`);

    if (removed.length > 0) {
      const { error } = await supabaseAdmin
        .from("branch_fixed_credit_config")
        .update({ deleted_at: new Date().toISOString() })
        .eq("fixed_credit_config_id", configId)
        .in("branch_id", removed)
        .is("deleted_at", null);
      if (error) throw new Error(`Failed to remove branches: ${error.message}`);
    }
    if (added.length > 0) {
      const addRows = added.map((branch_id) => ({
        branch_id,
        fixed_credit_config_id: configId,
      }));
      const { error } = await supabaseAdmin
        .from("branch_fixed_credit_config")
        .insert(addRows);
      if (error) throw new Error(`Failed to add branches: ${error.message}`);
    }

    return fetchFixedConfig(configId);
  }

  async deleteFixedConfig(merchantId: number, configId: number): Promise<void> {
    await verifyConfigOwnership(merchantId, "fixed_credit_config", configId);

    const { data: cfg } = await supabaseAdmin
      .from("fixed_credit_config")
      .select("images")
      .eq("id", configId)
      .is("deleted_at", null)
      .maybeSingle();
    if (cfg) await deleteImagesForRows([cfg]);

    const { error: jErr } = await supabaseAdmin
      .from("branch_fixed_credit_config")
      .update({ deleted_at: new Date().toISOString() })
      .eq("fixed_credit_config_id", configId)
      .is("deleted_at", null);
    if (jErr) throw new Error(`Failed to soft-delete junction rows: ${jErr.message}`);

    const { error } = await supabaseAdmin
      .from("fixed_credit_config")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", configId)
      .is("deleted_at", null);
    if (error)
      throw new Error(`Failed to delete fixed config: ${error.message}`);
  }

  async toggleFixedConfigActive(
    merchantId: number,
    configId: number,
    isActive: boolean,
  ): Promise<FixedCreditConfig> {
    await verifyConfigOwnership(merchantId, "fixed_credit_config", configId);
    const { error } = await supabaseAdmin
      .from("fixed_credit_config")
      .update({ is_active: isActive })
      .eq("id", configId)
      .is("deleted_at", null);
    if (error)
      throw new Error(`Failed to toggle fixed config: ${error.message}`);
    return fetchFixedConfig(configId);
  }
}

export const creditConfigService = new CreditConfigService();

// Threshold overshoot: full purchase rewardable if prior cumulative already crossed threshold, else only the overshoot slice. Null threshold=0, null window=no lookback, null cap=uncapped. Lookback is retroactive (includes purchases before the config's created_at).
export async function issueRunningCreditsForPurchase(
  supabase: SupabaseClient<Database>,
  merchantId: number,
  customerId: number,
  branchId: number,
  purchaseAmount: number,
  transactionDateEpoch: number,
): Promise<BaseCustomerCredit[]> {
  if (!(purchaseAmount > 0)) return [];

  const { data: merchant } = await supabase
    .from("merchants")
    .select("credit_stacking_policy")
    .eq("id", merchantId)
    .maybeSingle();
  const policy: "stack" | "best_only" =
    merchant?.credit_stacking_policy ?? "stack";

  const { data: junctionRows } = await supabase
    .from("branch_running_credit_config")
    .select(
      `running_credit_config:running_credit_config!inner(${QueryFragments.BASE_RUNNING_CREDIT_CONFIG})`,
    )
    .eq("branch_id", branchId)
    .is("deleted_at", null)
    .eq("running_credit_config.is_active", true)
    .is("running_credit_config.deleted_at", null);
  const configs = (junctionRows ?? []).map((r) => r.running_credit_config);
  if (configs.length === 0) return [];

  const { data: merchantBranchRows } = await supabase
    .from("branches")
    .select("id")
    .eq("merchant_id", merchantId)
    .is("deleted_at", null);
  const merchantBranchIds = (merchantBranchRows ?? []).map((b) => b.id);

  type Plan = { config: (typeof configs)[number]; creditValue: number };
  const plans: Plan[] = [];

  for (const row of configs) {
    const threshold = row.threshold_amount ?? 0;
    const windowDays = row.eligible_window;
    const maxCap = row.maximum_allowed_credit;

    let priorCumulative = 0;
    if (windowDays != null) {
      // transaction_date is epoch MS — windowDays * 86_400_000 converts days→ms. * 86400 (s/day) was a units miss that shrank the lookback to ~windowDays ms (credits never issued).
      const lowerBound = transactionDateEpoch - windowDays * 86_400_000;
      let q = supabase
        .from("customer_purchases")
        .select("amount")
        .eq("customer_id", customerId)
        .is("deleted_at", null)
        .lt("transaction_date", transactionDateEpoch)
        .gte("transaction_date", lowerBound);
      if (row.cumulative_scope === "per_branch") {
        q = q.eq("branch_id", branchId);
      } else {
        q = q.in("branch_id", merchantBranchIds);
      }
      const { data: txs } = await q;
      priorCumulative = (txs ?? []).reduce((s, t) => s + Number(t.amount), 0);
    }

    let rewardable: number;
    if (priorCumulative >= threshold) {
      rewardable = purchaseAmount;
    } else {
      const overshoot = priorCumulative + purchaseAmount - threshold;
      rewardable = Math.max(0, Math.min(purchaseAmount, overshoot));
    }
    if (!(rewardable > 0)) continue;

    let creditValue: number;
    if (row.credit_type === "percentage") {
      const pct = row.percentage_credit_value ?? 0;
      creditValue = (rewardable * pct) / 100;
    } else {
      creditValue = row.fixed_credit_value ?? 0;
    }
    if (maxCap != null && creditValue > maxCap) creditValue = maxCap;
    if (!(creditValue > 0)) continue;

    plans.push({ config: row, creditValue });
  }

  if (plans.length === 0) return [];

  let issued: Plan[] = plans;
  if (policy === "best_only") {
    issued = [plans.reduce((a, b) => (b.creditValue > a.creditValue ? b : a))];
  }

  // credit_validity is in DAYS; transaction_date is epoch MS — multiply by 86_400_000 (ms/day). * 86400 (s/day) was the same units miss as the lookback above.
  const inserts = issued.map(({ config, creditValue }) => ({
    customer_id: customerId,
    branch_id: branchId,
    credit_amount: Number(creditValue),
    transaction_date: transactionDateEpoch,
    expires_at:
      config.credit_validity == null
        ? null
        : transactionDateEpoch + config.credit_validity * 86_400_000,
  }));

  const { data: inserted, error } = await supabase
    .from("customer_credit")
    .insert(inserts)
    .select("*");
  if (error) throw new Error(`credit insert failed: ${error.message}`);
  return inserted ?? [];
}