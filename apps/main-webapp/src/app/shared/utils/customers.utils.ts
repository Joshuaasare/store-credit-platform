import { CustomerTransactions, LeaderboardRow, CustomerListRow } from "@shared/types/api.types";

// Names live on the customer row directly (not on the linked user). Returns
// empty string when both are empty — callers render "Unnamed customer".
export function customerDisplayName(r: CustomerTransactions): string {
  const c = r.customer;
  if (!c) return "";
  const surname = c.surname ?? "";
  const otherNames = c.other_names ?? "";
  const name = `${surname}${otherNames ? " " + otherNames : ""}`.trim();
  return name || "";
}

export function customerInitials(r: CustomerTransactions): string {
  const name = customerDisplayName(r);
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  // Unnamed: fall back to last 2 digits of phone so anonymous customers get distinct monograms.
  const phone = r.customer?.phone?.replace(/\D/g, "") ?? "";
  if (phone.length >= 2) return phone.slice(-2);
  return "?";
}

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

// Back-compat alias — leaderboard callers still use this name.
export function leaderboardInitials(r: LeaderboardRow): string {
  return customerRowInitials(r);
}

export function customerDirectoryInitials(r: CustomerListRow): string {
  return customerRowInitials(r);
}