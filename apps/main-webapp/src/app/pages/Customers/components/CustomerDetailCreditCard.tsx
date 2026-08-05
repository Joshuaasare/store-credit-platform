import { CalendarClock, Clock, MapPin } from "lucide-react";
import { Card, Badge, cn } from "@store-credit-platform/web-components";
import { CustomerDetailCreditRow } from "@shared/types/api.types";
import { formatEpochDate, formatGHS } from "@shared/utils/format";

interface CustomerDetailCreditCardProps {
  row: CustomerDetailCreditRow;
}

function formatIsoDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * One live credit row on the customer detail page. Shows the credit amount
 * as the headline, redeemed + remaining beneath, and the expiry / issued
 * date / branch as a meta footer.
 *
 * Fully-redeemed credits (remaining = 0) are still listed — they're rendered
 * greyed so the history is visible without being mistaken for spendable
 * credit. Brand voltage: ONE teal accent on the remaining number when > 0.
 */
export function CustomerDetailCreditCard({
  row,
}: CustomerDetailCreditCardProps) {
  const isFullyRedeemed = row.remaining <= 0;
  const isExpired =
    row.expires_at != null && row.expires_at <= Math.floor(Date.now() / 1000);

  return (
    <Card
      className={cn(
        "p-4 transition-colors",
        isFullyRedeemed && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
            Credit amount
          </div>
          <div
            className={cn(
              "mt-0.5 text-xl font-semibold tabular-nums",
              isFullyRedeemed && "text-muted-foreground",
            )}
          >
            {formatGHS(row.credit_amount)}
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "border bg-transparent",
            isFullyRedeemed
              ? "text-muted-foreground"
              : "border-primary/20 text-primary",
          )}
        >
          {isFullyRedeemed ? "Fully redeemed" : "Live"}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3">
        <div>
          <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
            Redeemed
          </div>
          <div className="mt-0.5 text-sm font-medium tabular-nums">
            {formatGHS(row.redeemed_total)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
            Remaining
          </div>
          <div
            className={cn(
              "mt-0.5 text-sm font-semibold tabular-nums",
              !isFullyRedeemed && "text-primary",
            )}
          >
            {formatGHS(row.remaining)}
          </div>
        </div>
      </div>

      <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-[11px]">
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
          <Clock className="h-3 w-3" />
          Issued {formatIsoDate(row.created_at)}
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {row.branch_name?.trim() || `Branch #${row.branch_id}`}
        </span>
      </div>
    </Card>
  );
}