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
  return (
    !!value &&
    typeof value === "object" &&
    (value as any).success === false &&
    typeof (value as any).error === "string"
  );
}