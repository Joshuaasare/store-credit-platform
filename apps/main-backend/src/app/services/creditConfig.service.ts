import { randomUUID } from "crypto";
import { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../utils/supabase.client";
import { Database } from "../types/database.types";
import { QueryFragments } from "../constants/queryFragments";
import { BaseCustomerCredit } from "../schemas/main.schema";
import {
  CreateRunningCreditConfigRequest,
  UpdateRunningCreditConfigRequest,
  RunningCreditConfigGroup,
  CreateFixedCreditConfigRequest,
  UpdateFixedCreditConfigRequest,
  FixedCreditConfigGroup,
} from "../schemas/creditConfig.schema";

// The new customer_credit row stores only the calculated GHS amount plus
// expiry/revocation metadata. We insert via `any` because the typed Insert
// shape from database.types.ts already reflects credit_amount (no longer
// credit_type / credit_precentage / max_credit_amount).

// Migration 20260720000000 adds config_group_id (uuid), cumulative_scope
// (enum), and merchants.credit_stacking_policy. Until that migration is
// applied to dev Supabase and `database.types.ts` is regenerated, the typed
// Row shape does not include those columns — read them through `any` casts.
type RunningConfigRow = Database["public"]["Tables"]["running_credit_config"]["Row"] & {
  config_group_id: string;
  cumulative_scope: "per_branch" | "merchant_wide";
  branch: Database["public"]["Tables"]["branches"]["Row"];
};

type FixedConfigRow = Database["public"]["Tables"]["fixed_credit_config"]["Row"] & {
  config_group_id: string;
  branch: Database["public"]["Tables"]["branches"]["Row"];
};

const RUNNING_CONFIG_COLUMNS = `${QueryFragments.BASE_RUNNING_CREDIT_CONFIG},branch:branches(${QueryFragments.BASE_BRANCH})`;

const FIXED_CONFIG_COLUMNS = `${QueryFragments.BASE_FIXED_CREDIT_CONFIG},branch:branches(${QueryFragments.BASE_BRANCH})`;

function groupRunningRows(rows: RunningConfigRow[]): RunningCreditConfigGroup[] {
  const map = new Map<string, RunningConfigRow>();
  for (const row of rows) {
    const existing = map.get(row.config_group_id);
    if (!existing) {
      map.set(row.config_group_id, row);
    }
  }
  return Array.from(map.values())
    .map((row) => {
      const groupRows = rows.filter((r) => r.config_group_id === row.config_group_id);
      return {
        config_group_id: row.config_group_id,
        branches: groupRows.map((r) => r.branch),
        credit_type: row.credit_type,
        credit_validity: row.credit_validity,
        eligible_window: row.eligible_window,
        fixed_credit_value: row.fixed_credit_value,
        percentage_credit_value: row.percentage_credit_value,
        maximum_allowed_credit: row.maximum_allowed_credit,
        threshold_amount: row.threshold_amount,
        terms: row.terms,
        cumulative_scope: row.cumulative_scope,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    })
    .sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
}

function groupFixedRows(rows: FixedConfigRow[]): FixedCreditConfigGroup[] {
  const map = new Map<string, FixedConfigRow>();
  for (const row of rows) {
    const existing = map.get(row.config_group_id);
    if (!existing) {
      map.set(row.config_group_id, row);
    }
  }
  return Array.from(map.values())
    .map((row) => {
      const groupRows = rows.filter((r) => r.config_group_id === row.config_group_id);
      return {
        config_group_id: row.config_group_id,
        branches: groupRows.map((r) => r.branch),
        credit_type: row.credit_type,
        fixed_credit_value: row.fixed_credit_value,
        percentage_credit_value: row.percentage_credit_value,
        maximum_allowed_credit: row.maximum_allowed_credit,
        start_date: row.start_date,
        end_date: row.end_date,
        terms: row.terms,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    })
    .sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
}

async function fetchRunningGroup(
  groupId: string,
): Promise<RunningCreditConfigGroup> {
  const { data, error } = await supabaseAdmin
    .from("running_credit_config")
    .select(RUNNING_CONFIG_COLUMNS)
    .eq("config_group_id", groupId)
    .is("deleted_at", null);
  if (error) throw new Error(`Failed to fetch group: ${error.message}`);
  const rows = (data ?? []) as unknown as RunningConfigRow[];
  const grouped = groupRunningRows(rows);
  if (grouped.length === 0) throw new Error("Config group not found");
  return grouped[0];
}

async function fetchFixedGroup(groupId: string): Promise<FixedCreditConfigGroup> {
  const { data, error } = await supabaseAdmin
    .from("fixed_credit_config")
    .select(FIXED_CONFIG_COLUMNS)
    .eq("config_group_id", groupId)
    .is("deleted_at", null);
  if (error) throw new Error(`Failed to fetch group: ${error.message}`);
  const rows = (data ?? []) as unknown as FixedConfigRow[];
  const grouped = groupFixedRows(rows);
  if (grouped.length === 0) throw new Error("Config group not found");
  return grouped[0];
}

async function verifyBranchOwnership(
  merchantId: number,
  branchIds: number[],
): Promise<void> {
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

async function getMerchantBranchIds(merchantId: number): Promise<number[]> {
  const { data, error } = await supabaseAdmin
    .from("branches")
    .select("id")
    .eq("merchant_id", merchantId)
    .is("deleted_at", null);
  if (error) throw new Error(`Failed to resolve merchant branches: ${error.message}`);
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
      : payload.maximum_allowed_credit ?? null;
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

function normalizeFixedValues(
  payload: CreateFixedCreditConfigRequest | UpdateFixedCreditConfigRequest,
) {
  const maximum_allowed_credit =
    payload.credit_type === "fixed" &&
    payload.maximum_allowed_credit == null &&
    payload.fixed_credit_value != null
      ? payload.fixed_credit_value
      : payload.maximum_allowed_credit ?? null;
  return {
    credit_type: payload.credit_type,
    fixed_credit_value: payload.fixed_credit_value ?? null,
    percentage_credit_value: payload.percentage_credit_value ?? null,
    maximum_allowed_credit,
    start_date: payload.start_date ?? null,
    end_date: payload.end_date ?? null,
    terms: payload.terms ?? null,
  };
}

export class CreditConfigService {
  // ── Running configs ─────────────────────────────────────

  async listRunningConfigs(merchantId: number): Promise<RunningCreditConfigGroup[]> {
    const { data, error } = await supabaseAdmin
      .from("running_credit_config")
      .select(RUNNING_CONFIG_COLUMNS)
      .is("deleted_at", null)
      .filter("branch.merchant_id", "eq", merchantId)
      .filter("branch.deleted_at", "is", null);
    if (error) throw new Error(`Failed to list running configs: ${error.message}`);
    const rows = (data ?? []) as unknown as RunningConfigRow[];
    return groupRunningRows(rows);
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
    const rows = payload.branch_ids.map((branch_id) => ({
      branch_id,
      config_group_id: groupId,
      ...values,
      is_active: true,
    }));
    const { error } = await supabaseAdmin
      .from("running_credit_config")
      .insert(rows as any[]);
    if (error) throw new Error(`Failed to create running config: ${error.message}`);
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
      .select("id, branch_id")
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
    const added = payload.branch_ids.filter((id) => !existingBranchIds.includes(id));

    const values = normalizeRunningValues(payload);

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
        .update({ ...values } as any)
        .eq("config_group_id", groupId)
        .in("branch_id", kept);
      if (error) throw new Error(`Failed to update branches: ${error.message}`);
    }
    if (added.length > 0) {
      const addRows = added.map((branch_id) => ({
        branch_id,
        config_group_id: groupId,
        ...values,
        is_active: true,
      }));
      const { error } = await supabaseAdmin
        .from("running_credit_config")
        .insert(addRows as any[]);
      if (error) throw new Error(`Failed to add branches: ${error.message}`);
    }

    return fetchRunningGroup(groupId);
  }

  async deleteRunningConfig(merchantId: number, groupId: string): Promise<void> {
    const merchantBranchIds = await getMerchantBranchIds(merchantId);
    const { error } = await supabaseAdmin
      .from("running_credit_config")
      .delete()
      .eq("config_group_id", groupId)
      .in("branch_id", merchantBranchIds);
    if (error) throw new Error(`Failed to delete running config: ${error.message}`);
  }

  async toggleRunningConfigActive(
    merchantId: number,
    groupId: string,
    isActive: boolean,
  ): Promise<RunningCreditConfigGroup> {
    const merchantBranchIds = await getMerchantBranchIds(merchantId);
    const { error } = await supabaseAdmin
      .from("running_credit_config")
      .update({ is_active: isActive } as any)
      .eq("config_group_id", groupId)
      .in("branch_id", merchantBranchIds);
    if (error) throw new Error(`Failed to toggle running config: ${error.message}`);
    return fetchRunningGroup(groupId);
  }

  // ── Fixed configs ───────────────────────────────────────

  async listFixedConfigs(merchantId: number): Promise<FixedCreditConfigGroup[]> {
    const { data, error } = await supabaseAdmin
      .from("fixed_credit_config")
      .select(FIXED_CONFIG_COLUMNS)
      .is("deleted_at", null)
      .filter("branch.merchant_id", "eq", merchantId)
      .filter("branch.deleted_at", "is", null);
    if (error) throw new Error(`Failed to list fixed configs: ${error.message}`);
    const rows = (data ?? []) as unknown as FixedConfigRow[];
    return groupFixedRows(rows);
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
    const rows = payload.branch_ids.map((branch_id) => ({
      branch_id,
      config_group_id: groupId,
      ...values,
      is_active: true,
    }));
    const { error } = await supabaseAdmin
      .from("fixed_credit_config")
      .insert(rows as any[]);
    if (error) throw new Error(`Failed to create fixed config: ${error.message}`);
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
      .select("id, branch_id")
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
    const added = payload.branch_ids.filter((id) => !existingBranchIds.includes(id));

    const values = normalizeFixedValues(payload);

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
        .update({ ...values } as any)
        .eq("config_group_id", groupId)
        .in("branch_id", kept);
      if (error) throw new Error(`Failed to update branches: ${error.message}`);
    }
    if (added.length > 0) {
      const addRows = added.map((branch_id) => ({
        branch_id,
        config_group_id: groupId,
        ...values,
        is_active: true,
      }));
      const { error } = await supabaseAdmin
        .from("fixed_credit_config")
        .insert(addRows as any[]);
      if (error) throw new Error(`Failed to add branches: ${error.message}`);
    }

    return fetchFixedGroup(groupId);
  }

  async deleteFixedConfig(merchantId: number, groupId: string): Promise<void> {
    const merchantBranchIds = await getMerchantBranchIds(merchantId);
    const { error } = await supabaseAdmin
      .from("fixed_credit_config")
      .delete()
      .eq("config_group_id", groupId)
      .in("branch_id", merchantBranchIds);
    if (error) throw new Error(`Failed to delete fixed config: ${error.message}`);
  }

  async toggleFixedConfigActive(
    merchantId: number,
    groupId: string,
    isActive: boolean,
  ): Promise<FixedCreditConfigGroup> {
    const merchantBranchIds = await getMerchantBranchIds(merchantId);
    const { error } = await supabaseAdmin
      .from("fixed_credit_config")
      .update({ is_active: isActive } as any)
      .eq("config_group_id", groupId)
      .in("branch_id", merchantBranchIds);
    if (error) throw new Error(`Failed to toggle fixed config: ${error.message}`);
    return fetchFixedGroup(groupId);
  }
}

export const creditConfigService = new CreditConfigService();

// ── Auto-issuance ──────────────────────────────────────────
//
// Threshold overshoot algorithm (decision 1):
//   - If prior cumulative spend already crossed threshold, the full current
//     purchase is rewardable.
//   - Otherwise, only the slice of the current purchase that pushed (or
//     reached) the threshold counts. We never reward spend below the line.
//   - Null threshold ⇒ 0 (every purchase qualifies); null window ⇒ no
//     lookback (prior = 0); null cap ⇒ uncapped percentage reward.
//
// After the re-architecture:
//   - Prior purchases are read from `customer_purchases` (not the dropped
//     `customer_transactions`).
//   - The calculated GHS amount is stored in `customer_credit.credit_amount`.
//     We no longer denormalize credit_type / percentage / cap onto the row —
//     those stay on the issuing running_credit_config.
//   - Retroactivity (decision 10): the lookback includes purchases made
//     before the config's created_at as long as they fall inside the
//     eligible_window ending at the current purchase's transaction_date.

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
    (merchant as any)?.credit_stacking_policy ?? "stack";

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

  type Plan = { config: any; creditValue: number };
  const plans: Plan[] = [];

  for (const row of configs as any[]) {
    if (row.branch?.deleted_at) continue;

    const threshold = row.threshold_amount ?? 0;
    const windowDays = row.eligible_window;
    const maxCap = row.maximum_allowed_credit;

    let priorCumulative = 0;
    if (windowDays != null) {
      const lowerBound = transactionDateEpoch - windowDays * 86400;
      // Read prior purchases from customer_purchases. The lookback is
      // retroactive: any purchase within the window counts, even if it
      // predates this config's created_at (decision 10).
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
      priorCumulative = (txs ?? []).reduce(
        (s, t) => s + Number((t as any).amount),
        0,
      );
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

  // Insert the calculated GHS amount into customer_credit.credit_amount.
  // The new schema only stores credit_amount + expires_at (epoch) + revocation
  // metadata; the originating config is identified by the branch_id + the
  // merchant's running_credit_config rows.
  const inserts = issued.map(({ config, creditValue }) => ({
    customer_id: customerId,
    branch_id: branchId,
    credit_amount: Number(creditValue),
    expires_at:
      config.credit_validity == null
        ? null
        : transactionDateEpoch + config.credit_validity * 86400,
  }));

  const { data: inserted, error } = await supabase
    .from("customer_credit")
    .insert(inserts as any[])
    .select("*");
  if (error) throw new Error(`credit insert failed: ${error.message}`);
  return (inserted ?? []) as unknown as BaseCustomerCredit[];
}