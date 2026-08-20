// Backend wraps every response as `{ success: true, data }` or `{ success: false, error }`.
export function isApiError(
  value: unknown,
): value is { success: false; error: string } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { success?: unknown; error?: unknown };
  return candidate.success === false && typeof candidate.error === "string";
}