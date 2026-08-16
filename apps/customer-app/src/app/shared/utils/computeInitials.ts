export function computeInitials(fullName: string): string {
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "··";
  const first = parts[0];
  if (parts.length === 1 && first) {
    return first.slice(0, 2).toUpperCase();
  }
  const last = parts[parts.length - 1];
  if (!first || !last) return "··";
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}
