// All formats use en-GB to match the rest of the app. Time math runs in
// milliseconds — callers pass Unix epoch milliseconds directly.

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

export function formatShortDate(epochMs: number): string {
  if (!Number.isFinite(epochMs)) return "";
  return new Date(epochMs).toLocaleDateString("en-GB", SHORT_DATE_OPTIONS);
}

export function formatShortDayMonth(epochMs: number): string {
  if (!Number.isFinite(epochMs)) return "";
  return new Date(epochMs).toLocaleDateString("en-GB", SHORT_DAY_MONTH_OPTIONS);
}

export function formatLongDate(epochMs: number): string {
  if (!Number.isFinite(epochMs)) return "";
  return new Date(epochMs).toLocaleDateString("en-GB", LONG_DATE_OPTIONS);
}

// Falls back to `formatShortDayMonth` for anything older than yesterday.
export function formatRelativeTimestamp(iso: string | number): string {
  const then = typeof iso === "number" ? iso : new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";

  const now = Date.now();
  const diffMs = now - then;
  if (diffMs < 0) {
    // Future timestamp — show the absolute short form, not a negative-relative string.
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