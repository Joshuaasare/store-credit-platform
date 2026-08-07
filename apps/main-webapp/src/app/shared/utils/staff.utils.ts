import { StaffUser } from "@shared/types/api.types";

/**
 * Display name for a staff row — `surname + " " + other_names`, trimmed.
 * Returns "Unnamed staff" if both are empty (rare but possible).
 */
export function staffDisplayName(s: Pick<StaffUser, "surname" | "other_names">): string {
  const name = `${s.surname ?? ""}${s.other_names ? " " + s.other_names : ""}`.trim();
  return name || "Unnamed staff";
}

/**
 * 1-2 char initials for a staff Monogram avatar. First letter of surname +
 * first letter of first word of other_names; single-word fallback takes the
 * first two chars of surname. Falls back to the last 2 digits of phone when
 * no name is available.
 */
export function staffInitials(
  s: Pick<StaffUser, "surname" | "other_names" | "phone">,
): string {
  const surname = (s.surname ?? "").trim();
  const other = (s.other_names ?? "").trim();
  if (surname && other) {
    return (surname[0] + other.split(/\s+/)[0][0]).toUpperCase();
  }
  if (surname) return surname.slice(0, 2).toUpperCase();
  const phone = (s.phone ?? "").replace(/\D/g, "");
  if (phone.length >= 2) return phone.slice(-2);
  return "?";
}