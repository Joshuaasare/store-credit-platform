/**
 * Shared string transformation helpers.
 */

/**
 * Slugify a string for use in URLs / filesystem folder names.
 *
 * Lowercases, strips non-alphanumeric characters (keeping spaces and hyphens),
 * collapses whitespace runs to single hyphens, collapses repeated hyphens, and
 * truncates to 60 characters. If the result is empty, returns `fallback` (or
 * empty string when no fallback is given).
 */
export function slugify(value: string, fallback = ""): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 60) || fallback
  );
}