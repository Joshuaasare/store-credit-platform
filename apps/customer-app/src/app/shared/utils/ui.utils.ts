/**
 * Small UI-text helpers shared across screens.
 *
 * Keep this file lean — these helpers compose strings that show up
 * in more than one place (e.g. branch headers, fallbacks). Anything
 * screen-specific should stay in that screen's `lib/` directory.
 */

/**
 * Compose a branch label — "Branch Name · City". Falls back gracefully
 * when either field is null/empty:
 *
 *   - both present       → "Accra · Ring Road"
 *   - branch only        → "Accra"
 *   - city only          → "Ring Road"
 *   - neither            → "Branch"
 *
 * Useful for merchant-detail headers and credit section titles.
 */
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
