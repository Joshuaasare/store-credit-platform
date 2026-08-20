import { Staff } from "@shared/types/api.types";

// Names live on the staff row directly (not on the user).
export function staffDisplayName(
  s: Pick<Staff, "surname" | "other_names">,
): string {
  const surname = s.surname ?? "";
  const otherNames = s.other_names ?? "";
  const name = `${surname}${otherNames ? " " + otherNames : ""}`.trim();
  return name || "Unnamed staff";
}

export function staffInitials(
  s: Pick<Staff, "surname" | "other_names" | "user">,
): string {
  const surname = (s.surname ?? "").trim();
  const other = (s.other_names ?? "").trim();
  if (surname && other) {
    return (surname[0] + other.split(/\s+/)[0][0]).toUpperCase();
  }
  if (surname) return surname.slice(0, 2).toUpperCase();
  const phone = (s.user.phone ?? "").replace(/\D/g, "");
  if (phone.length >= 2) return phone.slice(-2);
  return "?";
}