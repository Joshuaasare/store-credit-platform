import {
  CreateFixedCreditConfigRequest,
  UpdateFixedCreditConfigRequest,
} from "../schemas/creditConfig.schema";
import { storageService, extractPathFromUrl } from "../services/storage.service";
import {
  BaseBranch,
  BaseFixedCreditConfig,
  BaseRunningCreditConfig,
} from "../types/main.types";

type RunningConfigRow = Omit<BaseRunningCreditConfig, "images"> & {
  images: unknown;
  branch_running_credit_config?:
    | {
        deleted_at: string | null;
        branch: BaseBranch | null;
      }[]
    | null;
};

type FixedConfigRow = Omit<BaseFixedCreditConfig, "images"> & {
  images: unknown;
  branch_fixed_credit_config?:
    | {
        deleted_at: string | null;
        branch: BaseBranch | null;
      }[]
    | null;
};

export function shapeRunningConfig(
  row: RunningConfigRow,
): BaseRunningCreditConfig & { branches: BaseBranch[] } {
  const branches: BaseBranch[] = [];
  for (const j of row.branch_running_credit_config ?? []) {
    if (j?.deleted_at) continue;
    if (j?.branch && j.branch.deleted_at == null) branches.push(j.branch);
  }
  return {
    id: row.id,
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
    deleted_at: row.deleted_at,
    images: coerceImages(row.images),
    branches,
  };
}

export function shapeFixedConfig(
  row: FixedConfigRow,
): BaseFixedCreditConfig & { branches: BaseBranch[] } {
  const branches: BaseBranch[] = [];
  for (const j of row.branch_fixed_credit_config ?? []) {
    if (j?.deleted_at) continue;
    if (j?.branch && j.branch.deleted_at == null) branches.push(j.branch);
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    start_date: row.start_date,
    end_date: row.end_date,
    terms: row.terms,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    images: coerceImages(row.images),
    branches,
  };
}

// Bump an epoch-ms timestamp to 23:59:59.999 UTC of its calendar day. Fixed
// config end_date is semantically "through the end of the expiry day" — callers
// (webapp date picker) may pass midnight, so coerce here for forward defense.
// Idempotent: an already-end-of-day value maps to itself.
export function endOfDayUtcEpochMs(epochMs: number): number {
  const d = new Date(epochMs);
  return Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    23,
    59,
    59,
    999,
  );
}

// Epoch 0 (Jan 1 1970) and non-finite values mean "no date" — legacy rows stored
// 0, and endOfDayUtcEpochMs(0) would otherwise mint a fake 1970 window.
export function epochMsOrNull(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function normalizeFixedValues(
  payload: CreateFixedCreditConfigRequest | UpdateFixedCreditConfigRequest,
) {
  const end = epochMsOrNull(payload.end_date);
  return {
    title: payload.title ?? null,
    description: payload.description ?? null,
    start_date: epochMsOrNull(payload.start_date),
    end_date: end != null ? endOfDayUtcEpochMs(end) : null,
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

// Delete path: delete storage objects for ALL images on the given config row.
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