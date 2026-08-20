// Backend stores timestamps as Unix epoch milliseconds.

export function toEpochMs(date: Date): number {
  return date.getTime();
}

// Returns undefined for null/undefined/0 so callers treat "no value" uniformly.
export function fromEpochMs(
  epoch: number | null | undefined,
): Date | undefined {
  if (epoch == null || epoch === 0) return undefined;
  return new Date(epoch);
}

export function startOfYearEpochMs(date: Date = new Date()): number {
  return new Date(date.getFullYear(), 0, 1).getTime();
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Date pickers return midnight; inclusive `<= end` filters would cut off later
// timestamps, so bump to the last millisecond of the day.
export function endOfDayEpochMs(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  ).getTime();
}