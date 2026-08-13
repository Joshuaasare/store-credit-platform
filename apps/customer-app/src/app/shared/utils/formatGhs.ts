export function formatGhs(n: number): string {
  return `GHS ${n.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
