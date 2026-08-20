// Time math runs in milliseconds; callers pass the backend's Unix epoch
// milliseconds (the unit `customer_credit.expires_at` is stored as) directly.

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Falls back to an absolute date over a year out so the line never reads
// "in 60 months". `expiresAtMs` is a Unix epoch in MILLISECONDS.
export function formatExpiryDistance(
  expiresAtMs: number | null,
): string | null {
  if (expiresAtMs === null) return null;

  const diffMs = expiresAtMs - Date.now();
  if (diffMs <= 0) return "soon";

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / MS_PER_DAY);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years >= 1) {
    const absolute = new Date(expiresAtMs).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `on ${absolute}`;
  }
  if (months >= 1) return `in ${months} month${months === 1 ? "" : "s"}`;
  if (days >= 1) return `in ${days} day${days === 1 ? "" : "s"}`;
  if (hours >= 1) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

// Wraps a distance phrase as "Expires ..." so the chip reads as a verb.
export function wrapExpiryPhrase(phrase: string | null): string {
  if (phrase === null) return "Expires soon";
  if (phrase === "soon") return "Expires soon";
  return `Expires ${phrase}`;
}

export type CreditStatusTone = "neutral" | "warning" | "success" | "error";

export interface CreditStatusChip {
  label: string;
  tone: CreditStatusTone;
  bgToken: "warningSurface" | "successSurface";
  fgToken: "warning" | "success" | "error";
}

export type RedemptionStatus = "pending" | "approved" | "rejected";

export interface RedemptionStatusChip {
  label: string;
  tone: CreditStatusTone;
  bgToken: "warningSurface" | "successSurface" | "errorSurface";
  fgToken: "warning" | "success" | "error";
}

export function redemptionStatusChip(
  status: RedemptionStatus,
): RedemptionStatusChip {
  switch (status) {
    case "pending":
      return {
        label: "Pending",
        tone: "warning",
        bgToken: "warningSurface",
        fgToken: "warning",
      };
    case "approved":
      return {
        label: "Approved",
        tone: "success",
        bgToken: "successSurface",
        fgToken: "success",
      };
    case "rejected":
      return {
        label: "Rejected",
        tone: "error",
        bgToken: "errorSurface",
        fgToken: "error",
      };
  }
}

// Five states keyed off the remaining/expiry window:
// Lifetime (no expiry) · Active (>30d) · Expiring (≤30d) · Soon (≤7d) · Expired.
export function creditStatusChip(
  expiresAtMs: number | null,
): CreditStatusChip {
  if (expiresAtMs === null) {
    return {
      label: "Lifetime",
      tone: "success",
      bgToken: "successSurface",
      fgToken: "success",
    };
  }

  const msUntilExpiry = expiresAtMs - Date.now();

  if (msUntilExpiry <= 0) {
    return {
      label: "Expired",
      tone: "error",
      bgToken: "warningSurface",
      fgToken: "error",
    };
  }

  const phrase = formatExpiryDistance(expiresAtMs);

  if (msUntilExpiry <= MS_PER_DAY * 7) {
    return {
      label: wrapExpiryPhrase(phrase),
      tone: "warning",
      bgToken: "warningSurface",
      fgToken: "warning",
    };
  }

  if (msUntilExpiry <= MS_PER_DAY * 30) {
    return {
      label: wrapExpiryPhrase(phrase),
      tone: "warning",
      bgToken: "warningSurface",
      fgToken: "warning",
    };
  }

  return {
    label: "Active",
    tone: "success",
    bgToken: "successSurface",
    fgToken: "success",
  };
}