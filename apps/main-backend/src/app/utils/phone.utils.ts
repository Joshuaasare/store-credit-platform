/**
 * Normalize a phone number to E.164 format with a leading `+`.
 *
 * Handles three input shapes:
 *   - local Ghanaian "0XXXXXXXXX"  → "+233XXXXXXXXX"
 *   - international without "+"    → "+XXXXXXXXXXX"
 *   - already E.164 ("+...")        → unchanged (after whitespace/dash strip)
 *
 * Whitespace and dashes are stripped first. The result is the canonical form
 * stored on `users.phone` and used by every phone lookup (auth OTP, staff
 * directory uniqueness, etc.) so all callers compare against the same shape.
 */
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\s/g, "").replace(/-/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "+233" + cleaned.slice(1);
  }
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}