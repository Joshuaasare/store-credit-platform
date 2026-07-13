import { AlertTriangle, Wallet } from "lucide-react";
import { Card } from "@store-credit-platform/web-components";

interface PoolStatusCardProps {
  used: number;
  limit: number | null;
}

function formatCedi(n: number): string {
  return `GH₵${n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function PoolStatusCard({ used, limit }: PoolStatusCardProps) {
  if (limit == null || limit <= 0) {
    return (
      <Card className="relative animate-fade-in-up overflow-hidden p-6 motion-reduce:animate-none">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Wallet className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold">Credit pool</h3>
        </div>
        <p className="text-muted-foreground mt-3 text-xs">
          No limit configured for this merchant.
        </p>
        <div className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
          {formatCedi(used)}
        </div>
        <p className="text-muted-foreground text-xs">issued so far</p>
      </Card>
    );
  }

  const pct = Math.min(100, (used / limit) * 100);
  const over = used > limit;
  const warn = pct > 90 && !over;
  const remaining = Math.max(0, limit - used);

  const state = over ? "over" : warn ? "warn" : "ok";
  const tint =
    state === "over"
      ? "from-destructive/10 via-card to-card"
      : state === "warn"
        ? "from-amber-500/10 via-card to-card"
        : "from-primary/10 via-card to-card";
  const barGradient =
    state === "over"
      ? "from-rose-500 to-destructive"
      : state === "warn"
        ? "from-amber-400 to-amber-600"
        : "from-primary/80 to-primary";
  const pill =
    state === "over"
      ? "bg-destructive/10 text-destructive"
      : "bg-amber-500/10 text-amber-600";

  return (
    <Card
      className={`relative animate-fade-in-up overflow-hidden bg-gradient-to-br ${tint} p-6 motion-reduce:animate-none`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Wallet className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold">Credit pool</h3>
        </div>
        {(warn || over) && (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${pill}`}
          >
            <AlertTriangle className="h-3 w-3" />
            {over ? "Over limit" : "Near limit"}
          </span>
        )}
      </div>

      <div className="mt-5 flex items-baseline gap-2">
        <span className="text-4xl font-semibold tracking-tight tabular-nums">
          {pct.toFixed(0)}
          <span className="text-muted-foreground text-xl">%</span>
        </span>
        <span className="text-muted-foreground text-xs">used</span>
      </div>

      <div className="mt-1 text-sm tabular-nums">
        <span className="font-medium">{formatCedi(used)}</span>
        <span className="text-muted-foreground"> / {formatCedi(limit)}</span>
      </div>

      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {over ? "Over by" : "Remaining"}
        </span>
        <span
          className={`font-semibold tabular-nums ${
            over ? "text-destructive" : "text-foreground"
          }`}
        >
          {formatCedi(over ? used - limit : remaining)}
        </span>
      </div>
    </Card>
  );
}