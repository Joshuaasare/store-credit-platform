// Auth stores E.164 (`+233XXXXXXXXX`) for Supabase lookup; this renders the
// same number back to the customer as `0XX XXX XXXX` — the way Ghanaians say it.
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