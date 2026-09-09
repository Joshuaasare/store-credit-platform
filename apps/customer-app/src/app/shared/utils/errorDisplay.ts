// Fetch failures surface as either a fetch-level network error or the raw
// backend error string from apiService. Neither is user-facing copy — we
// classify and always answer with friendly guidance instead.
const NETWORK_HINTS = [
  "network request failed",
  "failed to fetch",
  "load failed",
  "networkerror",
  "socket",
  "timed out",
  "timeout",
  "internet connection",
];

export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return NETWORK_HINTS.some((hint) => msg.includes(hint));
}

export function friendlyErrorMessage(error: unknown, fallback: string): string {
  return isNetworkError(error)
    ? "You seem to be offline. Check your connection and try again."
    : fallback;
}