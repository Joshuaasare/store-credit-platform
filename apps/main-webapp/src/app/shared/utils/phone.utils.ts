// `users.phone` is canonical E.164 (`+233XXXXXXXXX`); local 0XX form is what
// staff read and type. These helpers let the webapp format/normalize without
// reaching across apps for the same logic.
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

// Strip non-digit noise and force a leading `+`; local `0XXXXXXXXX` becomes
// `+233XXXXXXXXX`. Used on submit so typed and scanned values share the same
// shape before hitting the backend.
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
