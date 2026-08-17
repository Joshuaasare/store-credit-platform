/**
 * Type guard for the `{ success: false, error }` API error envelope.
 *
 * The backend wraps every response in either `{ success: true, data }` or
 * `{ success: false, error }`. Use this in stores/mutations to discriminate
 * the envelope before reading `.data` or throwing `.error`.
 */
export function isApiError(
  value: unknown,
): value is { success: false; error: string } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { success?: unknown; error?: unknown };
  return candidate.success === false && typeof candidate.error === "string";
}