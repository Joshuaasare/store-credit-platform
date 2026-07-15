/**
 * Currency formatting helpers shared across pages.
 *
 * `formatGHS` uses `Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" })`
 * — produces "GH₵1,234.50". Use for any customer-facing cedi amount.
 */

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
 * Format a Unix epoch (seconds) as a readable date string.
 */
export function formatEpochDate(epochSeconds: number): string {
  if (!epochSeconds) return "—";
  return new Date(epochSeconds * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a Unix epoch (seconds) as a readable date + time string.
 */
export function formatEpochDateTime(epochSeconds: number): string {
  if (!epochSeconds) return "—";
  return new Date(epochSeconds * 1000).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}