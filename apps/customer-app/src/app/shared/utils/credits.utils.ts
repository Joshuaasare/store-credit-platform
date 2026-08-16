/**
 * Credit-related helpers for the customer app.
 *
 * Time math runs in milliseconds internally; callers pass the backend's
 * Unix epoch milliseconds (the unit `customer_credit.expires_at` is stored
 * as) directly.
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Render a relative-time phrase for the credit urgency line.
 *
 *   - "in 2 days", "in 5 hours", "in 30 minutes", "in 1 month"
 *   - Falls back to a formatted absolute date when the gap is over a
 *     year ("on 14 Aug 2027") so the line never reads as "in 60 months".
 *   - Returns `"soon"` when the expiry is in the past or within 60s.
 *   - Returns `null` when `expiresAtMs` is null so the caller can fall
 *     back to the lifetime-credit copy.
 *
 *   `expiresAtMs` is a Unix epoch in **MILLISECONDS** (matches how the
 *   backend stores `customer_credit.expires_at`).
 */
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

/**
 * Wrap a `formatExpiryDistance` phrase as a verb so the chip reads as
 * "Expires …" instead of a noun phrase ("in 2 days").
 *
 *   - "soon"          → "Expires soon"
 *   - "in 2 days"     → "Expires in 2 days"
 *   - "on 14 Aug 2027"→ "Expires on 14 Aug 2027"
 *   - any other       → "Expires <phrase>"
 */
export function wrapExpiryPhrase(phrase: string | null): string {
  if (phrase === null) return "Expires soon";
  if (phrase === "soon") return "Expires soon";
  return `Expires ${phrase}`;
}

export type CreditStatusTone = "neutral" | "warning" | "success" | "error";

export interface CreditStatusChip {
  label: string;
  tone: CreditStatusTone;
  /** Maps to `theme.colors.*` — caller resolves to a colour at render time. */
  bgToken: "warningSurface" | "successSurface";
  fgToken: "warning" | "success" | "error";
}

/**
 * Status chip for a single customer-side redemption row. Mirrors the
 * shape of `CreditStatusChip` so a redemption row can use the same chip
 * renderer with no per-row colour math.
 *
 *   - "pending"  → warning / amber (the request is in flight, waiting on
 *                  merchant approval — neutral attention, not error)
 *   - "approved" → success / green (the merchant has accepted)
 *   - "rejected" → error / red (the merchant has declined)
 *
 * The `bgToken` / `fgToken` pair maps directly to `theme.colors.*` so the
 * row render code just resolves the tokens via `useThemeTokens().colors`.
 */
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

/**
 * Compute the status chip for a single credit row. Five states, keyed
 * off the remaining/expiry window:
 *
 *   - "Lifetime"  → `expires_at === null`
 *   - "Active"    → > 30 days remaining
 *   - "Expiring"  → ≤ 30 days remaining (amber)
 *   - "Soon"      → ≤ 7 days remaining, or already past (amber)
 *   - "Expired"   → expiry in the past (red)
 *
 * Returns `tone` + `bgToken` / `fgToken` so the row's render code can
 * stay free of colour math — it just resolves the tokens against
 * `useThemeTokens().colors`.
 */
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