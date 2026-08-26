import {
  CreateFixedCreditConfigRequest,
  FixedCreditConfig,
  FixedCreditConfigGroup,
  RunningCreditConfig,
  RunningCreditConfigGroup,
  UpdateFixedCreditConfigRequest,
} from "../schemas/creditConfig.schema";

export function groupRunningRows(
  rows: RunningCreditConfig[],
): RunningCreditConfigGroup[] {
  const map = new Map<string, RunningCreditConfig>();
  for (const row of rows) {
    const existing = map.get(row.config_group_id);
    if (!existing) {
      map.set(row.config_group_id, row);
    }
  }
  return Array.from(map.values())
    .map((row) => {
      const groupRows = rows.filter(
        (r) => r.config_group_id === row.config_group_id,
      );
      return {
        config_group_id: row.config_group_id,
        branches: groupRows.map((r) => r.branch).filter((b) => b != null),
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

export function groupFixedRows(
  rows: FixedCreditConfig[],
): FixedCreditConfigGroup[] {
  const map = new Map<string, FixedCreditConfig>();
  for (const row of rows) {
    if (!row.config_group_id) continue;
    const existing = map.get(row.config_group_id);
    if (!existing) {
      map.set(row.config_group_id, row);
    }
  }
  return Array.from(map.values())
    .map((row) => {
      const groupId = row.config_group_id;
      if (!groupId) return null;
      const groupRows = rows.filter((r) => r.config_group_id === groupId);
      return {
        config_group_id: groupId,
        branches: groupRows.map((r) => r.branch).filter((b) => b != null),
        title: row.title,
        description: row.description,
        images: row.images as string[] | null,
        start_date: row.start_date,
        end_date: row.end_date,
        terms: row.terms,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    })
    .filter((g): g is FixedCreditConfigGroup => g !== null)
    .sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
}

export function normalizeFixedValues(
  payload: CreateFixedCreditConfigRequest | UpdateFixedCreditConfigRequest,
) {
  return {
    title: payload.title ?? null,
    description: payload.description ?? null,
    start_date: payload.start_date ?? null,
    end_date: payload.end_date ?? null,
    terms: payload.terms ?? null,
  };
}
