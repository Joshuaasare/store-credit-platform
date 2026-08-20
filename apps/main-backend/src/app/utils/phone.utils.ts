// Normalizes to E.164 with a leading +: local Ghanaian "0XXXXXXXXX" → "+233XXXXXXXXX", international without "+" → prefixed, already-E.164 → unchanged (after whitespace/dash strip). Stored on users.phone and used by every phone lookup so all callers compare against the same shape.
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