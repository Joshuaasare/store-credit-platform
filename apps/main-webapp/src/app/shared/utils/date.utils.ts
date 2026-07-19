/**
 * Shared date / epoch conversion helpers.
 *
 * The backend stores timestamps (`transaction_date`, etc.) as Unix epoch
 * **seconds** (bigint). These helpers centralize the seconds ⇄ Date math so
 * call sites don't sprinkle `Math.floor(t / 1000)` and `new Date(epoch * 1000)`
 * inline.
 */

/** Convert a Date to Unix epoch seconds (the format the backend stores). */
export function toEpochSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

/**
 * Convert a Unix epoch seconds value back to a Date.
 * Returns `undefined` for null/undefined/0 so callers can treat "no value"
 * uniformly (e.g. when a filter's end bound is unset).
 */
export function fromEpochSeconds(
  epoch: number | null | undefined,
): Date | undefined {
  if (!epoch) return undefined;
  return new Date(epoch * 1000);
}

/**
 * Epoch seconds for Jan 1 of the given date's year (defaults to now).
 * Used by the "This year" filter preset to scope the window from the start
 * of the current calendar year onwards.
 */
export function startOfYearEpoch(date: Date = new Date()): number {
  return toEpochSeconds(new Date(date.getFullYear(), 0, 1));
}