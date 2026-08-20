export function formatBranchLabel(
  branchName: string | null | undefined,
  city: string | null | undefined,
  fallback = "Branch",
): string {
  const name = branchName?.trim();
  const c = city?.trim();
  if (name && c) return `${name} · ${c}`;
  if (name) return name;
  if (c) return c;
  return fallback;
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
