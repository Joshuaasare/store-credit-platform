/**
 * Shared date / epoch conversion helpers.
 *
 * The backend stores timestamps (`transaction_date`, etc.) as Unix epoch
 * **milliseconds** (number). These helpers centralize the ms ⇄ Date math so
 * call sites don't sprinkle `getTime()` and `new Date(ms)` inline.
 */

/** Convert a Date to Unix epoch milliseconds (the format the backend stores). */
export function toEpochMs(date: Date): number {
  return date.getTime();
}

/**
 * Convert a Unix epoch milliseconds value back to a Date.
 * Returns `undefined` for null/undefined/0 so callers can treat "no value"
 * uniformly (e.g. when a filter's end bound is unset).
 */
export function fromEpochMs(
  epoch: number | null | undefined,
): Date | undefined {
  if (epoch == null || epoch === 0) return undefined;
  return new Date(epoch);
}

/**
 * Epoch ms for Jan 1 of the given date's year (defaults to now).
 * Used by the "This year" filter preset to scope the window from the start
 * of the current calendar year onwards.
 */
export function startOfYearEpochMs(date: Date = new Date()): number {
  return new Date(date.getFullYear(), 0, 1).getTime();
}

/**
 * Returns a Date clamped to the first day of its month at 00:00:00 local.
 * Used to seed calendar / month-picker views.
 */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}