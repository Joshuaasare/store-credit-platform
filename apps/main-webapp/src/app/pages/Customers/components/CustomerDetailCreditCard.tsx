import { useState } from "react";
import { CalendarClock, ChevronDown, MapPin } from "lucide-react";
import {
  Card,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  cn,
} from "@store-credit-platform/web-components";
import { CustomerDetailCreditRow } from "@shared/types/api.types";
import { formatEpochDate, formatGHS, formatIsoDate } from "@shared/utils/format";

interface CustomerDetailCreditCardProps {
  row: CustomerDetailCreditRow;
}

export function CustomerDetailCreditCard({
  row,
}: CustomerDetailCreditCardProps) {
  const [open, setOpen] = useState(false);
  const isFullyRedeemed = row.remaining <= 0;
  const isExpired =
    row.expires_at != null && row.expires_at <= Math.floor(Date.now());
  // Clamp 0–1 so a rounding overshoot on `redeemed_total` can't render >100%.
  const creditAmount = Number(row.credit_amount) || 0;
  const redeemedTotal = Number(row.redeemed_total) || 0;
  const fillRatio =
    creditAmount > 0
      ? Math.max(0, Math.min(1, redeemedTotal / creditAmount))
      : 0;
  const fillPercent = Math.round(fillRatio * 100);
  const showProgressBar = fillPercent > 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card
        className={cn(
          "p-0 transition-colors",
          isFullyRedeemed && "opacity-60",
        )}
      >
        <CollapsibleTrigger
          className={cn(
            "flex w-full items-start justify-between gap-3 p-4 text-left",
            "transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex h-9 items-center justify-center rounded-lg px-3 text-base font-semibold tabular-nums",
                  isFullyRedeemed
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary/10 text-primary",
                )}
              >
                {formatGHS(row.remaining)}
              </span>
              <span className="text-muted-foreground text-xs">
                of {formatGHS(row.credit_amount)}
              </span>
            </div>
            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                {row.expires_at == null
                  ? "Lifetime"
                  : `Expires ${formatEpochDate(row.expires_at)}`}
                {isExpired && row.expires_at != null && (
                  <span className="text-destructive">· Expired</span>
                )}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {row.branch.name?.trim() || `Branch #${row.branch_id}`}
              </span>
            </div>
          </div>
          <ChevronDown
            className={cn(
              "text-muted-foreground mt-2.5 h-4 w-4 shrink-0 transition-transform",
              open && "rotate-180",
            )}
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t px-4 pb-4 pt-3">
            {showProgressBar && (
              <div
                className="bg-muted h-1.5 overflow-hidden rounded-full"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={fillPercent}
                aria-label={`${fillPercent}% redeemed`}
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width]",
                    isFullyRedeemed ? "bg-muted-foreground" : "bg-primary",
                  )}
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-muted-foreground text-xs">Redeemed</div>
                <div className="mt-0.5 text-sm font-medium tabular-nums">
                  {formatGHS(row.redeemed_total)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Issued</div>
                <div className="text-muted-foreground mt-0.5 text-xs">
                  {formatIsoDate(row.created_at)}
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
