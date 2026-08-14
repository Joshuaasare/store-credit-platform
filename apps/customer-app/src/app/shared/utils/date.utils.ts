/**
 * Date / time formatting helpers for the customer app.
 *
 * All formats use en-GB to match the rest of the app (e.g. "14 Aug 2025").
 * Time math runs in milliseconds — callers that hold Unix epoch SECONDS
 * (the customer-credit `expires_at` is the canonical example) must
 * multiply by 1000 before passing to these helpers.
 */

const SHORT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

const SHORT_DAY_MONTH_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
};

const LONG_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

/**
 * Short absolute date — "14 Aug 2025". Used by credit rows and the
 * merchant header for issued-on dates and similar.
 */
export function formatShortDate(epochMs: number): string {
  if (!Number.isFinite(epochMs)) return "";
  return new Date(epochMs).toLocaleDateString("en-GB", SHORT_DATE_OPTIONS);
}

/**
 * Short date without year — "14 Aug". Used by recent-activity rows
 * where the year is implied (the row is always from the current year).
 */
export function formatShortDayMonth(epochMs: number): string {
  if (!Number.isFinite(epochMs)) return "";
  return new Date(epochMs).toLocaleDateString("en-GB", SHORT_DAY_MONTH_OPTIONS);
}

/**
 * Long absolute date — "14 August 2025". Used by urgency fallbacks
 * for far-future expiry (> 1 year out) where the relative phrase
 * would be unhelpful.
 */
export function formatLongDate(epochMs: number): string {
  if (!Number.isFinite(epochMs)) return "";
  return new Date(epochMs).toLocaleDateString("en-GB", LONG_DATE_OPTIONS);
}

/**
 * Compact "X ago" timestamp for recent-activity rows. Falls back to
 * `formatShortDayMonth` for anything older than yesterday so the row
 * stays one line.
 *
 *   - < 60s        → "Just now"
 *   - < 60min      → "5m ago"
 *   - < 24h        → "2h ago"
 *   - yesterday    → "Yesterday"
 *   - older        → "14 Aug" (year omitted — always the current year)
 */
export function formatRelativeTimestamp(iso: string | number): string {
  const then = typeof iso === "number" ? iso : new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";

  const now = Date.now();
  const diffMs = now - then;
  if (diffMs < 0) {
    // Future timestamp — display the absolute short form rather than a
    // confusing negative-relative string.
    return formatShortDayMonth(then);
  }

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const thenDate = new Date(then);
  const nowDate = new Date(now);
  const isYesterday =
    thenDate.getFullYear() === nowDate.getFullYear() &&
    thenDate.getMonth() === nowDate.getMonth() &&
    nowDate.getDate() - thenDate.getDate() === 1;
  if (isYesterday) return "Yesterday";

  return formatShortDayMonth(then);
}