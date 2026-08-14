/**
 * Currency formatting helper for the customer app.
 *
 * Uses `Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" })`
 * — produces the canonical "GH₵1,234.50" string with the GHS-prefixed cedi
 * sign. Matches the webapp's `formatGHS` so the same amount reads identically
 * across both surfaces.
 */

const cediFormatter = new Intl.NumberFormat("en-GH", {
  style: "currency",
  currency: "GHS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatGhs(amount: number): string {
  if (!Number.isFinite(amount)) return "GH₵0.00";
  return cediFormatter.format(amount);
}