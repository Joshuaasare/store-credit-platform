import {
  CreateFixedCreditConfigRequest,
  FixedCreditConfig,
  FixedCreditConfigGroup,
  RunningCreditConfig,
  RunningCreditConfigGroup,
  UpdateFixedCreditConfigRequest,
} from "../schemas/creditConfig.schema";
import { storageService, extractPathFromUrl } from "../services/storage.service";

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
        images: row.images as string[] | null,
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

// `images` is jsonb in Postgres → supabase types it as `Json`. The domain type on
// BaseRunningCreditConfig / BaseFixedCreditConfig is `string[] | null`. Coerce at the service
// boundary so composed types match without `as` casts.
export function coerceImages(images: unknown): string[] | null {
  if (!Array.isArray(images)) return null;
  return images.filter((v): v is string => typeof v === "string");
}

// Update path: delete storage objects for images no longer in `newImages`. `existingRows` carry
// the jsonb `images` column (coerced to string[]). Stale = present in existing, absent from new.
// Swallowing the delete error is intentional — orphaned storage objects are non-fatal; the DB
// write still proceeds. Used by running/fixed config update flows.
export async function deleteStaleImages(
  newImages: string[],
  existingRows: { images: unknown }[],
  bucket = "store-assets",
): Promise<void> {
  const newUrls = new Set(newImages);
  const stalePaths: string[] = [];
  for (const row of existingRows) {
    for (const url of coerceImages(row.images) ?? []) {
      if (!newUrls.has(url)) {
        const p = extractPathFromUrl(bucket, url);
        if (p) stalePaths.push(p);
      }
    }
  }
  if (stalePaths.length > 0) {
    try {
      await storageService.deleteFiles(bucket, stalePaths);
    } catch (err) {
      console.warn(`Failed to clean stale promo images: ${err}`);
    }
  }
}

// Delete path: delete storage objects for ALL images across the given rows. Used by
// running/fixed config delete flows when the whole config group is torn down.
export async function deleteImagesForRows(
  existingRows: { images: unknown }[],
  bucket = "store-assets",
): Promise<void> {
  const paths: string[] = [];
  for (const row of existingRows) {
    for (const url of coerceImages(row.images) ?? []) {
      const p = extractPathFromUrl(bucket, url);
      if (p) paths.push(p);
    }
  }
  if (paths.length > 0) {
    try {
      await storageService.deleteFiles(bucket, paths);
    } catch (err) {
      console.warn(`Failed to clean promo images: ${err}`);
    }
  }
}

// Counts offers per branch across a flattened set of (config_group_id, branch_id) rows.
// Each config_group_id is counted once even if it spans multiple branches; the resulting
// count for each branch is the number of distinct groups that branch is part of.
export function summarizeOffersPerBranch(
  rows: { config_group_id: string | null; branch_id: number }[],
): Map<number, number> {
  const byGroup = new Map<string, { count: number; branchIds: Set<number> }>();
  for (const row of rows) {
    const gid = row.config_group_id;
    if (gid == null) continue;
    const existing = byGroup.get(gid);
    if (existing) {
      existing.branchIds.add(row.branch_id);
      continue;
    }
    byGroup.set(gid, {
      count: 1,
      branchIds: new Set([row.branch_id]),
    });
  }
  const perBranch = new Map<number, number>();
  for (const group of byGroup.values()) {
    for (const branchId of group.branchIds) {
      perBranch.set(branchId, (perBranch.get(branchId) ?? 0) + group.count);
    }
  }
  return perBranch;
}
