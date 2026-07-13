import { AlertTriangle } from "lucide-react";
import { Card } from "@store-credit-platform/web-components";

interface PoolStatusCardProps {
  used: number;
  limit: number | null;
}

export function PoolStatusCard({ used, limit }: PoolStatusCardProps) {
  // No limit configured → show "no cap" state.
  if (limit == null || limit <= 0) {
    return (
      <Card className="animate-fade-in-up motion-reduce:animate-none p-6">
        <h3 className="text-sm font-semibold">Credit pool</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          No limit configured for this merchant.
        </p>
        <div className="mt-4 text-2xl font-semibold tabular-nums">
          {used.toLocaleString()} <span className="text-muted-foreground text-sm font-normal">used</span>
        </div>
      </Card>
    );
  }

  const pct = Math.min(100, (used / limit) * 100);
  const over = used > limit;
  const warn = pct > 90 && !over;

  const barColor = over
    ? "bg-destructive"
    : warn
      ? "bg-amber-500"
      : "bg-primary";

  return (
    <Card className="animate-fade-in-up motion-reduce:animate-none p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Credit pool</h3>
        {(warn || over) && (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
              over
                ? "bg-destructive/10 text-destructive"
                : "bg-amber-500/10 text-amber-600"
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {over ? "Over limit" : "Near limit"}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums">
          {used.toLocaleString()}
        </span>
        <span className="text-muted-foreground text-sm">
          / {limit.toLocaleString()}
        </span>
      </div>

      <div className="bg-muted mt-3 h-2 w-full overflow-hidden rounded-full">
        <div
          className={`${barColor} h-full rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        {pct.toFixed(0)}% of pool used
      </p>
    </Card>
  );
}