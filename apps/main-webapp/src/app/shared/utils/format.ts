/**
 * Currency formatting helpers shared across pages.
 *
 * `formatGHS` uses `Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" })`
 * — produces "GH₵1,234.50". Use for any customer-facing cedi amount.
 */

import { fromEpochSeconds } from "./date.utils";

const cediFormatter = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatGHS(amount: number): string {
  if (!Number.isFinite(amount)) return "GH₵0.00";
  return cediFormatter.format(amount);
}

/**
 * Compact cedi formatting for stat cards (no fractional trailing zeros).
 */
export function formatGHSCompact(amount: number): string {
  if (!Number.isFinite(amount)) return "GH₵0";
  return `GH₵${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Generic numeric formatter for stat cards: integers stay bare, large
 * numbers get locale grouping, and small decimals keep up to 2 places.
 */
export function formatStatValue(value: number): string {
  if (value >= 1000) return value.toLocaleString();
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
}

/**
 * Format a Unix epoch (seconds) as a readable date string.
 */
export function formatEpochDate(epochSeconds: number): string {
  const d = fromEpochSeconds(epochSeconds);
  if (!d) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a Unix epoch (seconds) as a readable date + time string.
 */
export function formatEpochDateTime(epochSeconds: number): string {
  const d = fromEpochSeconds(epochSeconds);
  if (!d) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}