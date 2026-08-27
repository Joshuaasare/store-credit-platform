import { randomUUID } from "crypto";
import { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../utils/supabase.client";
import { Database } from "../types/database.types";
import { QueryFragments } from "../constants/queryFragments";
import {
  CreateRunningCreditConfigRequest,
  UpdateRunningCreditConfigRequest,
  RunningCreditConfigGroup,
  CreateFixedCreditConfigRequest,
  UpdateFixedCreditConfigRequest,
  FixedCreditConfigGroup,
  FixedCreditConfig,
  RunningCreditConfig,
  RunningCreditConfigUpdate,
  FixedCreditConfigUpdate,
} from "../schemas/creditConfig.schema";
import { BaseCustomerCredit } from "../types/main.types";
import {
  groupFixedRows,
  groupRunningRows,
  normalizeFixedValues,
  deleteStaleImages,
  deleteImagesForRows,
} from "../utils/creditConfig.utils";

async function fetchRunningGroup(groupId: string) {
  const { data, error } = await supabaseAdmin
    .from("running_credit_config")
    .select(
      `${QueryFragments.BASE_RUNNING_CREDIT_CONFIG},
      branch:branches(${QueryFragments.BASE_BRANCH})`,
    )
    .eq("config_group_id", groupId)
    .is("deleted_at", null);

  if (error) throw new Error(`Failed to fetch group: ${error.message}`);
  const rows = data ?? [];
  const grouped = groupRunningRows(rows as RunningCreditConfig[]);
  if (grouped.length === 0) throw new Error("Config group not found");
  return grouped[0];
}

async function fetchFixedGroup(
  groupId: string,
): Promise<FixedCreditConfigGroup> {
  const { data, error } = await supabaseAdmin
    .from("fixed_credit_config")
    .select(
      `${QueryFragments.BASE_FIXED_CREDIT_CONFIG},
      branch:branches(${QueryFragments.BASE_BRANCH})`,
    )
    .eq("config_group_id", groupId)
    .is("deleted_at", null);

  if (error) throw new Error(`Failed to fetch group: ${error.message}`);

  const rows = data ?? [];
  const grouped = groupFixedRows(rows as FixedCreditConfig[]);
  if (grouped.length === 0) throw new Error("Config group not found");
  return grouped[0];
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

async function getMerchantBranchIds(merchantId: number) {
  const { data, error } = await supabaseAdmin
    .from("branches")
    .select("id")
    .eq("merchant_id", merchantId)
    .is("deleted_at", null);
  if (error)
    throw new Error(`Failed to resolve merchant branches: ${error.message}`);
  return (data ?? []).map((b) => b.id);
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
    cumulative_scope: payload.cumulative_scope,
  };
}

export class CreditConfigService {
  async listRunningConfigs(merchantId: number) {
    const { data, error } = await supabaseAdmin
      .from("running_credit_config")
      .select(
        `${QueryFragments.BASE_RUNNING_CREDIT_CONFIG},
        branch:branches!inner(${QueryFragments.BASE_BRANCH})`,
      )
      .is("deleted_at", null)
      .eq("branch.merchant_id", merchantId)
      .is("branch.deleted_at", null);
    if (error)
      throw new Error(`Failed to list running configs: ${error.message}`);
    const rows = data ?? [];
    return groupRunningRows(rows as RunningCreditConfig[]);
  }

  async createRunningConfig(
    merchantId: number,
    payload: CreateRunningCreditConfigRequest,
  ): Promise<RunningCreditConfigGroup> {
    if (!payload.branch_ids || payload.branch_ids.length === 0) {
      throw new Error("Select at least one branch");
    }
    await verifyBranchOwnership(merchantId, payload.branch_ids);
    const groupId = randomUUID();
    const values = normalizeRunningValues(payload);
    const images = payload.images ?? [];
    const rows = payload.branch_ids.map((branch_id) => ({
      branch_id,
      config_group_id: groupId,
      ...values,
      images,
      is_active: true,
    }));
    const { error } = await supabaseAdmin
      .from("running_credit_config")
      .insert(rows);
    if (error)
      throw new Error(`Failed to create running config: ${error.message}`);
    return fetchRunningGroup(groupId);
  }

  async updateRunningConfig(
    merchantId: number,
    groupId: string,
    payload: UpdateRunningCreditConfigRequest,
  ): Promise<RunningCreditConfigGroup> {
    if (!payload.branch_ids || payload.branch_ids.length === 0) {
      throw new Error("Select at least one branch");
    }
    const merchantBranchIds = await getMerchantBranchIds(merchantId);

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("running_credit_config")
      .select("id, branch_id, images")
      .eq("config_group_id", groupId)
      .in("branch_id", merchantBranchIds)
      .is("deleted_at", null);
    if (fetchErr) throw new Error(`Failed to load group: ${fetchErr.message}`);
    if (!existing || existing.length === 0) {
      throw new Error("Config group not found");
    }

    await verifyBranchOwnership(merchantId, payload.branch_ids);

    const existingBranchIds = existing.map((r) => r.branch_id);
    const requestedSet = new Set(payload.branch_ids);
    const removed = existingBranchIds.filter((id) => !requestedSet.has(id));
    const kept = existingBranchIds.filter((id) => requestedSet.has(id));
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
      await deleteStaleImages(payload.images, existing);
    }

    if (removed.length > 0) {
      const { error } = await supabaseAdmin
        .from("running_credit_config")
        .delete()
        .eq("config_group_id", groupId)
        .in("branch_id", removed);
      if (error) throw new Error(`Failed to remove branches: ${error.message}`);
    }
    if (kept.length > 0) {
      const { error } = await supabaseAdmin
        .from("running_credit_config")
        .update(updatePayload)
        .eq("config_group_id", groupId)
        .in("branch_id", kept);
      if (error) throw new Error(`Failed to update branches: ${error.message}`);
    }
    if (added.length > 0) {
      const addRows = added.map((branch_id) => ({
        branch_id,
        config_group_id: groupId,
        ...values,
        images: Array.isArray(payload.images) ? payload.images : [],
        is_active: true,
      }));
      const { error } = await supabaseAdmin
        .from("running_credit_config")
        .insert(addRows);
      if (error) throw new Error(`Failed to add branches: ${error.message}`);
    }

    return fetchRunningGroup(groupId);
  }

  async deleteRunningConfig(
    merchantId: number,
    groupId: string,
  ): Promise<void> {
    const merchantBranchIds = await getMerchantBranchIds(merchantId);

    const { data: rows } = await supabaseAdmin
      .from("running_credit_config")
      .select("images")
      .eq("config_group_id", groupId)
      .in("branch_id", merchantBranchIds)
      .is("deleted_at", null);
    await deleteImagesForRows(rows ?? []);

    const { error } = await supabaseAdmin
      .from("running_credit_config")
      .delete()
      .eq("config_group_id", groupId)
      .in("branch_id", merchantBranchIds);
    if (error)
      throw new Error(`Failed to delete running config: ${error.message}`);
  }

  async toggleRunningConfigActive(
    merchantId: number,
    groupId: string,
    isActive: boolean,
  ): Promise<RunningCreditConfigGroup> {
    const merchantBranchIds = await getMerchantBranchIds(merchantId);
    const { error } = await supabaseAdmin
      .from("running_credit_config")
      .update({ is_active: isActive })
      .eq("config_group_id", groupId)
      .in("branch_id", merchantBranchIds);
    if (error)
      throw new Error(`Failed to toggle running config: ${error.message}`);
    return fetchRunningGroup(groupId);
  }

  async listFixedConfigs(
    merchantId: number,
  ): Promise<FixedCreditConfigGroup[]> {
    const { data, error } = await supabaseAdmin
      .from("fixed_credit_config")
      .select(
        `${QueryFragments.BASE_FIXED_CREDIT_CONFIG},
        branch:branches!inner(${QueryFragments.BASE_BRANCH})`,
      )
      .is("deleted_at", null)
      .eq("branch.merchant_id", merchantId)
      .is("branch.deleted_at", null);

    if (error) {
      throw new Error(`Failed to list fixed configs: ${error.message}`);
    }
    const rows = data ?? [];
    return groupFixedRows(rows as FixedCreditConfig[]);
  }

  async createFixedConfig(
    merchantId: number,
    payload: CreateFixedCreditConfigRequest,
  ): Promise<FixedCreditConfigGroup> {
    if (!payload.branch_ids || payload.branch_ids.length === 0) {
      throw new Error("Select at least one branch");
    }
    await verifyBranchOwnership(merchantId, payload.branch_ids);
    const groupId = randomUUID();
    const values = normalizeFixedValues(payload);
    const images = payload.images ?? [];
    const rows = payload.branch_ids.map((branch_id) => ({
      branch_id,
      config_group_id: groupId,
      ...values,
      images,
      is_active: true,
    }));
    const { error } = await supabaseAdmin
      .from("fixed_credit_config")
      .insert(rows);
    if (error)
      throw new Error(`Failed to create fixed config: ${error.message}`);
    return fetchFixedGroup(groupId);
  }

  async updateFixedConfig(
    merchantId: number,
    groupId: string,
    payload: UpdateFixedCreditConfigRequest,
  ): Promise<FixedCreditConfigGroup> {
    if (!payload.branch_ids || payload.branch_ids.length === 0) {
      throw new Error("Select at least one branch");
    }
    const merchantBranchIds = await getMerchantBranchIds(merchantId);

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("fixed_credit_config")
      .select("id, branch_id, images")
      .eq("config_group_id", groupId)
      .in("branch_id", merchantBranchIds)
      .is("deleted_at", null);
    if (fetchErr) throw new Error(`Failed to load group: ${fetchErr.message}`);
    if (!existing || existing.length === 0) {
      throw new Error("Config group not found");
    }

    await verifyBranchOwnership(merchantId, payload.branch_ids);

    const existingBranchIds = existing.map((r) => r.branch_id);
    const requestedSet = new Set(payload.branch_ids);
    const removed = existingBranchIds.filter((id) => !requestedSet.has(id));
    const kept = existingBranchIds.filter((id) => requestedSet.has(id));
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
      await deleteStaleImages(payload.images, existing);
    }

    if (removed.length > 0) {
      const { error } = await supabaseAdmin
        .from("fixed_credit_config")
        .delete()
        .eq("config_group_id", groupId)
        .in("branch_id", removed);
      if (error) throw new Error(`Failed to remove branches: ${error.message}`);
    }
    if (kept.length > 0) {
      const { error } = await supabaseAdmin
        .from("fixed_credit_config")
        .update(updatePayload)
        .eq("config_group_id", groupId)
        .in("branch_id", kept);
      if (error) throw new Error(`Failed to update branches: ${error.message}`);
    }
    if (added.length > 0) {
      const addRows = added.map((branch_id) => ({
        branch_id,
        config_group_id: groupId,
        ...values,
        images: Array.isArray(payload.images) ? payload.images : [],
        is_active: true,
      }));
      const { error } = await supabaseAdmin
        .from("fixed_credit_config")
        .insert(addRows);
      if (error) throw new Error(`Failed to add branches: ${error.message}`);
    }

    return fetchFixedGroup(groupId);
  }

  async deleteFixedConfig(merchantId: number, groupId: string): Promise<void> {
    const merchantBranchIds = await getMerchantBranchIds(merchantId);

    const { data: rows } = await supabaseAdmin
      .from("fixed_credit_config")
      .select("images")
      .eq("config_group_id", groupId)
      .in("branch_id", merchantBranchIds)
      .is("deleted_at", null);
    await deleteImagesForRows(rows ?? []);

    const { error } = await supabaseAdmin
      .from("fixed_credit_config")
      .delete()
      .eq("config_group_id", groupId)
      .in("branch_id", merchantBranchIds);
    if (error)
      throw new Error(`Failed to delete fixed config: ${error.message}`);
  }

  async toggleFixedConfigActive(
    merchantId: number,
    groupId: string,
    isActive: boolean,
  ): Promise<FixedCreditConfigGroup> {
    const merchantBranchIds = await getMerchantBranchIds(merchantId);
    const { error } = await supabaseAdmin
      .from("fixed_credit_config")
      .update({ is_active: isActive })
      .eq("config_group_id", groupId)
      .in("branch_id", merchantBranchIds);
    if (error)
      throw new Error(`Failed to toggle fixed config: ${error.message}`);
    return fetchFixedGroup(groupId);
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

  const { data: configs } = await supabase
    .from("running_credit_config")
    .select(
      `${QueryFragments.BASE_RUNNING_CREDIT_CONFIG},branch:branches(id,deleted_at)`,
    )
    .eq("branch_id", branchId)
    .eq("is_active", true)
    .is("deleted_at", null);
  if (!configs || configs.length === 0) return [];

  const { data: merchantBranchRows } = await supabase
    .from("branches")
    .select("id")
    .eq("merchant_id", merchantId)
    .is("deleted_at", null);
  const merchantBranchIds = (merchantBranchRows ?? []).map((b) => b.id);

  type Plan = { config: (typeof configs)[number]; creditValue: number };
  const plans: Plan[] = [];

  for (const row of configs) {
    if (row.branch?.deleted_at) continue;

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
