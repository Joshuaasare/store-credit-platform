// Truncates to 60 chars; returns `fallback` (or "") when the slug is empty.
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