import { Staff } from "@shared/types/api.types";

/**
 * Display name for a staff row — `surname + " " + other_names`, trimmed.
 * Returns "Unnamed staff" if both are empty (rare but possible).
 */
export function staffDisplayName(
  s: Pick<Staff, "user">,
): string {
  const surname = s.user.surname ?? "";
  const otherNames = s.user.other_names ?? "";
  const name = `${surname}${otherNames ? " " + otherNames : ""}`.trim();
  return name || "Unnamed staff";
}

/**
 * 1-2 char initials for a staff Monogram avatar. First letter of surname +
 * first letter of first word of other_names; single-word fallback takes the
 * first two chars of surname. Falls back to the last 2 digits of phone when
 * no name is available.
 */
export function staffInitials(
  s: Pick<Staff, "user">,
): string {
  const surname = (s.user.surname ?? "").trim();
  const other = (s.user.other_names ?? "").trim();
  if (surname && other) {
    return (surname[0] + other.split(/\s+/)[0][0]).toUpperCase();
  }
  if (surname) return surname.slice(0, 2).toUpperCase();
  const phone = (s.user.phone ?? "").replace(/\D/g, "");
  if (phone.length >= 2) return phone.slice(-2);
  return "?";
}