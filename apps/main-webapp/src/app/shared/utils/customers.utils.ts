import { CustomerTransactions } from "@shared/types/api.types";

/**
 * Display name for a customer transactions row.
 *
 * Returns `users.surname + " " + users.other_names` when the customer is
 * linked to a user (i.e. has logged into the mobile app), otherwise an empty
 * string — callers render "Unnamed customer" themselves when this is empty.
 */
export function customerDisplayName(r: CustomerTransactions): string {
  const u = r.customer?.users;
  if (!u) return "";
  const name = `${u.surname}${u.other_names ? " " + u.other_names : ""}`.trim();
  return name || "";
}