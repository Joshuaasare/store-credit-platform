import { useState } from "react";
import { AlertTriangle, Wallet } from "lucide-react";
import { Card, cn } from "@store-credit-platform/web-components";

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

const R = 52;
const C = 2 * Math.PI * R;

export function PoolStatusCard({ used, limit }: PoolStatusCardProps) {
  const [mode, setMode] = useState<"percent" | "absolute">("percent");

  const hasLimit = limit != null && limit > 0;
  const rawPct = hasLimit ? (used / limit) * 100 : 0;
  const over = hasLimit && used > limit;
  const warn = hasLimit && rawPct > 90 && !over;
  const state = over ? "over" : warn ? "warn" : "ok";
  const pct = Math.min(100, rawPct); // arc capped at full
  const remaining = hasLimit ? Math.max(0, limit - used) : 0;

  const color =
    state === "over"
      ? "hsl(var(--destructive))"
      : state === "warn"
        ? "#f59e0b"
        : "hsl(var(--primary))";
  const lightColor =
    state === "over"
      ? "hsl(var(--destructive) / 0.55)"
      : state === "warn"
        ? "#fcd34d"
        : "hsl(var(--primary) / 0.55)";
  const dotColor =
    state === "over"
      ? "bg-destructive"
      : state === "warn"
        ? "bg-amber-500"
        : "bg-primary";

  const dash = (C * pct) / 100;
  const angle = (-90 + (pct / 100) * 360) * (Math.PI / 180);
  const dx = 60 + R * Math.cos(angle);
  const dy = 60 + R * Math.sin(angle);

  const centerValue =
    !hasLimit || mode === "absolute"
      ? formatCedi(used)
      : `${pct.toFixed(0)}%`;
  const centerCaption =
    !hasLimit
      ? "issued · no limit"
      : mode === "percent"
        ? "used"
        : `of ${formatCedi(limit as number)}`;

  const noteColor =
    state === "over"
      ? "text-destructive"
      : state === "warn"
        ? "text-amber-600"
        : "text-muted-foreground";
  const note = !hasLimit
    ? "No limit configured — pool is uncapped"
    : over
      ? `Over limit by ${formatCedi(used - (limit as number))}`
      : warn
        ? `Near limit · ${formatCedi(remaining)} remaining`
        : `${formatCedi(remaining)} remaining`;

  const wash = !hasLimit
    ? "from-muted/40"
    : over
      ? "from-destructive/[0.07]"
      : warn
        ? "from-amber-500/[0.07]"
        : "from-primary/[0.06]";

  return (
    <Card
      className={cn(
        "animate-fade-in-up bg-gradient-to-br to-card p-6 motion-reduce:animate-none",
        wash,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide">
          <Wallet className="h-3.5 w-3.5" />
          Credit pool
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${
            !hasLimit
              ? "bg-muted text-muted-foreground"
              : state === "over"
                ? "bg-destructive/10 text-destructive"
                : state === "warn"
                  ? "bg-amber-500/10 text-amber-600"
                  : "bg-primary/10 text-primary"
          }`}
        >
          {!hasLimit
            ? "Uncapped"
            : state === "over"
              ? "Over"
              : state === "warn"
                ? "Near limit"
                : "Healthy"}
        </span>
      </div>

      {/* radial ring — click to toggle center value (only when a limit is set) */}
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={() => hasLimit && setMode((m) => (m === "percent" ? "absolute" : "percent"))}
          className="focus-visible:ring-ring group relative rounded-full outline-none focus-visible:ring-2 disabled:cursor-default"
          aria-label="Toggle pool value between percentage and currency"
          title={hasLimit ? "Toggle percentage / currency" : "No limit set"}
          disabled={!hasLimit}
        >
          <svg viewBox="0 0 120 120" className="h-36 w-36" role="img" aria-hidden>
            <defs>
              <linearGradient id="poolArc" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={lightColor} />
                <stop offset="100%" stopColor={color} />
              </linearGradient>
            </defs>
            {/* track — dashed when uncapped to hint "no ceiling" */}
            <circle
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="10"
              strokeDasharray={hasLimit ? undefined : "6 8"}
            />
            {/* progress arc */}
            {pct > 0 && (
              <circle
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke="url(#poolArc)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${C}`}
                transform="rotate(-90 60 60)"
                className="transition-all duration-500"
              />
            )}
            {/* end-of-arc dot with card halo */}
            {pct > 0 && pct < 100 && (
              <>
                <circle cx={dx} cy={dy} r="7.5" fill="hsl(var(--card))" />
                <circle cx={dx} cy={dy} r="5" fill={color} />
              </>
            )}
            {pct >= 100 && (
              <>
                <circle cx="60" cy="8" r="7.5" fill="hsl(var(--card))" />
                <circle cx="60" cy="8" r="5" fill={color} />
              </>
            )}
          </svg>
          {/* center value */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[26px] font-semibold leading-none tracking-tight tabular-nums">
              {centerValue}
            </div>
            <div className="text-muted-foreground mt-1.5 text-[10px] uppercase tracking-wide">
              {centerCaption}
            </div>
          </div>
        </button>
      </div>

      {/* breakdown */}
      <div className="mt-5 space-y-2">
        <Row dot={dotColor} label="Used" value={formatCedi(used)} />
        {hasLimit && (
          <>
            <Row
              dot="bg-muted-foreground/30"
              label="Remaining"
              value={formatCedi(remaining)}
            />
            <Row
              dot="bg-muted-foreground/30"
              label="Limit"
              value={formatCedi(limit as number)}
            />
          </>
        )}
      </div>

      <div className={`mt-4 flex items-center gap-1.5 text-xs ${noteColor}`}>
        {(warn || over) && <AlertTriangle className="h-3.5 w-3.5" />}
        {note}
      </div>
    </Card>
  );
}

function Row({
  dot,
  label,
  value,
}: {
  dot: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="text-muted-foreground flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
        {label}
      </div>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}