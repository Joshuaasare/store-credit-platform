import { CustomerTransactions, LeaderboardRow, CustomerListRow } from "@shared/types/api.types";

/**
 * Display name for a customer transactions row.
 *
 * Names live on the customer row directly (`surname` / `other_names`), not on
 * the linked user. Returns the trimmed `surname + " " + other_names`, or an
 * empty string when both are empty — callers render "Unnamed customer"
 * themselves when this is empty.
 */
export function customerDisplayName(r: CustomerTransactions): string {
  const c = r.customer;
  if (!c) return "";
  const surname = c.surname ?? "";
  const otherNames = c.other_names ?? "";
  const name = `${surname}${otherNames ? " " + otherNames : ""}`.trim();
  return name || "";
}

/**
 * 1-2 char initials for a Monogram avatar.
 *
 * Named customer: first letter of first word + first letter of last word from
 * the display name (e.g. "Joshua Asare" → "JA"); single-word names take the
 * first two chars (e.g. "Kojo" → "KO").
 *
 * Unnamed customer: last 2 digits of the phone, so two anonymous customers
 * with different phones still get distinct monograms. Returns "?" if neither
 * is available.
 */
export function customerInitials(r: CustomerTransactions): string {
  const name = customerDisplayName(r);
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  const phone = r.customer?.phone?.replace(/\D/g, "") ?? "";
  if (phone.length >= 2) return phone.slice(-2);
  return "?";
}

/**
 * Initials for a server-resolved customer row (leaderboard or directory).
 * The row carries `customer_name` ("Unnamed customer" when unlinked) and a
 * `user_id` that is null for unlinked customers. Shared by LeaderboardRow
 * and CustomerListRow — both satisfy the structural identity shape.
 */
export function customerRowInitials(
  r: { user_id: string | null; customer_name: string; phone: string | null },
): string {
  if (r.user_id != null) {
    const name = r.customer_name?.trim() ?? "";
    if (name && name !== "Unnamed customer") {
      const parts = name.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
  }
  const phone = r.phone?.replace(/\D/g, "") ?? "";
  if (phone.length >= 2) return phone.slice(-2);
  return "?";
}

/** Back-compat alias — callers on the leaderboard page still use this name. */
export function leaderboardInitials(r: LeaderboardRow): string {
  return customerRowInitials(r);
}

/** Initials for a customer directory row. */
export function customerDirectoryInitials(r: CustomerListRow): string {
  return customerRowInitials(r);
}