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
