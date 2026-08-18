/**
 * Format a phone number for display in a Ghanaian-friendly layout.
 *
 * Why this exists:
 *   - Auth stores the customer's phone in E.164 (`+233XXXXXXXXX`,
 *     country code 233 + 9-digit national number). That's the wire
 *     format Supabase expects on lookup, so we keep it untouched in
 *     the store.
 *   - The header subtitle shows the same phone back to the customer
 *     and we want it to read the way Ghanaians actually say it —
 *     `0XX XXX XXXX` (zero-leading national format, 3-digit carrier
 *     prefix, 3-digit + 4-digit subscriber number).
 *
 * What it does:
 *   - Strips non-digits.
 *   - If the leading country code is `233`, drops it and prepends a
 *     leading `0` so `+233244123456` → `0244123456`.
 *   - If the number already starts with `0`, leaves it alone (just
 *     digit-cleaned).
 *   - For anything else (foreign number, malformed), returns the
 *     raw digit string — we don't want to lie about the format.
 *
 * Layout:
 *   - Groups as `0XX XXX XXXX` (10 digits total). For shorter / longer
 *     digit strings it falls back to plain digits rather than guessing
 *     where the spaces go — a misaligned phone number reads worse
 *     than no spacing.
 */
export function formatGhanaPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return raw;

  let national: string;
  if (digits.startsWith("233") && digits.length >= 12) {
    national = "0" + digits.slice(3);
  } else if (digits.startsWith("0")) {
    national = digits;
  } else {
    return digits;
  }

  if (national.length === 10) {
    return `${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
  }
  return national;
}