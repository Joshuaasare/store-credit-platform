import {
  Building2,
  Calendar,
  Coins,
  Phone,
  Receipt,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  cn,
  Badge,
} from "@store-credit-platform/web-components";
import { CustomerTransactions } from "@shared/types/api.types";
import { formatEpochDateTime, formatGHS } from "@shared/utils/format";

interface TransactionDetailDialogProps {
  row: CustomerTransactions | null;
  onOpenChange: (open: boolean) => void;
}

const TYPE_META: Record<
  CustomerTransactions["transaction_type"],
  { label: string; chip: string }
> = {
  purchase: {
    label: "Purchase",
    chip: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  credit_issue: {
    label: "Credit issued",
    chip: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  credit_redeem: {
    label: "Credit redeemed",
    chip: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
};

function customerDisplayName(r: CustomerTransactions): string {
  const u = r.customer?.users;
  if (!u) return "";
  const name = `${u.surname}${u.other_names ? " " + u.other_names : ""}`.trim();
  return name || "";
}

const DETAIL_FIELDS: {
  key: string;
  label: string;
  icon: LucideIcon;
  value: (row: CustomerTransactions) => string;
}[] = [
  {
    key: "date",
    label: "Date",
    icon: Calendar,
    value: (r) => formatEpochDateTime(r.transaction_date),
  },
  {
    key: "type",
    label: "Type",
    icon: Receipt,
    value: (r) => TYPE_META[r.transaction_type].label,
  },
  {
    key: "amount",
    label: "Amount",
    icon: Coins,
    value: (r) => formatGHS(r.amount),
  },
  {
    key: "branch",
    label: "Branch",
    icon: Building2,
    value: (r) => r.branch?.name?.trim() || "—",
  },
  {
    key: "customer",
    label: "Customer",
    icon: UserRound,
    value: (r) => customerDisplayName(r),
  },
  {
    key: "phone",
    label: "Customer phone",
    icon: Phone,
    value: (r) => r.customer?.phone ?? "—",
  },
  {
    key: "recorded_by",
    label: "Recorded by",
    icon: UserRound,
    value: (r) => r.recorded_by_user?.surname?.trim() || "—",
  },
];

export function TransactionDetailDialog({
  row,
  onOpenChange,
}: TransactionDetailDialogProps) {
  const open = row !== null;
  const meta = row ? TYPE_META[row.transaction_type] : null;
  const displayName = row ? customerDisplayName(row) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {/* Hero header */}
        <div className="from-primary/10 via-card to-card relative bg-gradient-to-br p-6 pb-5">
          <div
            aria-hidden
            className="bg-primary/15 pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl"
          />
          <div className="relative flex items-start gap-4">
            <div className="from-primary/15 to-primary/5 text-primary ring-primary/20 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-xl font-semibold ring-1">
              {(displayName[0] ?? "?").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 pr-8">
              <h2 className="truncate text-2xl font-semibold tracking-tight">
                {displayName}
              </h2>
              <p className="text-muted-foreground mt-1 truncate text-sm">
                <Phone className="mr-1.5 inline h-3.5 w-3.5 align-text-bottom" />
                {row?.customer?.phone ?? "—"}
              </p>
              {row && meta && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <Badge
                    variant="outline"
                    className={cn("border bg-transparent", meta.chip)}
                  >
                    {meta.label}
                  </Badge>
                  <span className="text-muted-foreground/60">·</span>
                  <span className="text-muted-foreground">
                    {formatEpochDateTime(row.transaction_date)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Amount hero readout */}
          <div className="from-chart-4/10 to-card mt-5 flex items-end justify-between rounded-xl border bg-gradient-to-br p-4">
            <div>
              <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide">
                <span className="bg-chart-4 inline-block h-1.5 w-1.5 rounded-full" />
                Amount
              </div>
              <div className="mt-1.5 text-3xl font-semibold tabular-nums tracking-tight">
                {row ? formatGHS(row.amount) : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-6 p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {DETAIL_FIELDS.map((f) => {
              const Icon = f.icon;
              const value = row ? f.value(row) : "—";
              return (
                <div
                  key={f.key}
                  className="border-muted-foreground/10 bg-muted/20 flex items-start gap-3 rounded-lg border p-3"
                >
                  <span className="bg-muted text-muted-foreground mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-muted-foreground text-[11px] uppercase tracking-wide">
                      {f.label}
                    </div>
                    <div className="mt-0.5 truncate text-sm font-medium">
                      {value}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
