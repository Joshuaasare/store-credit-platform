import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import {
  Card,
  Monogram,
  Badge,
  cn,
} from "@store-credit-platform/web-components";
import { CustomerListRow } from "@shared/types/api.types";
import { formatEpochDate, formatGHS } from "@shared/utils/format";
import { customerDirectoryInitials } from "@shared/utils/customers.utils";
import { formatDisplayNumber } from "@shared/utils/ui.utils";

interface CustomerCardProps {
  row: CustomerListRow;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * One customer in the directory grid. Identity (avatar + name/phone) sits
 * on the left, the two money totals (purchases + available credits) anchor
 * the middle, and a live-credit chip + last-activity date sit on the right.
 * The whole card is clickable and navigates to /customers/:customerId.
 *
 * Brand voltage: white card, ink type, ONE teal accent on the available
 * credits number and on hover (border + arrow). Fully-redeemed customers
 * (available_credits = 0) keep the chip greyed, not red.
 */
export function CustomerCard({ row, className, style }: CustomerCardProps) {
  const navigate = useNavigate();

  const isLinked =
    row.user_id != null &&
    row.customer_name &&
    row.customer_name !== "Unnamed customer";
  const primaryLabel = isLinked
    ? row.customer_name
    : (formatDisplayNumber(row.phone) ?? "Unnamed customer");
  const secondaryLabel = isLinked
    ? (formatDisplayNumber(row.phone) ?? null)
    : null;

  const hasCredits = row.live_credit_count > 0;
  const hasActivity = row.last_activity_epoch != null;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/customers/${row.customer_id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/customers/${row.customer_id}`);
        }
      }}
      style={style}
      className={cn(
        "group animate-fade-in-up cursor-pointer p-4 transition-all motion-reduce:animate-none",
        "hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Monogram
          text={customerDirectoryInitials(row)}
          seed={row.user_id ?? row.phone ?? String(row.customer_id)}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold tracking-tight">
            {primaryLabel}
          </div>
          {secondaryLabel && (
            <div className="text-muted-foreground truncate text-xs">
              {secondaryLabel}
            </div>
          )}
          <div className="text-muted-foreground mt-0.5 text-[11px] tabular-nums">
            Customer #{row.customer_id}
          </div>
        </div>
        <ArrowRight className="text-muted-foreground group-hover:text-primary h-4 w-4 shrink-0 transition-colors" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3">
        <div>
          <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
            Total purchases
          </div>
          <div className="mt-0.5 text-base font-semibold tabular-nums">
            {formatGHS(row.total_purchases)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
            Available credits
          </div>
          <div className="text-primary mt-0.5 text-base font-semibold tabular-nums">
            {formatGHS(row.available_credits)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <Badge
          variant="outline"
          className={cn(
            "border bg-transparent",
            hasCredits
              ? "border-primary/20 text-primary"
              : "text-muted-foreground",
          )}
        >
          {row.live_credit_count} live{" "}
          {row.live_credit_count === 1 ? "credit" : "credits"}
        </Badge>
        <div className="text-muted-foreground flex items-center gap-1 text-[11px] tabular-nums">
          <Clock className="h-3 w-3" />
          {hasActivity ? formatEpochDate(row.last_activity_epoch!) : "No activity"}
        </div>
      </div>
    </Card>
  );
}