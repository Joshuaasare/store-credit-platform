import {
  Building2,
  CalendarDays,
  Clock,
  Globe,
  MapPin,
  Phone,
  Users,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  cn,
} from "@store-credit-platform/web-components";
import { BranchWithAggregates } from "@shared/types/api.types";
import { getCountryByCode } from "@shared/utils/countries";

interface BranchDetailDialogProps {
  branch: BranchWithAggregates | null;
  onOpenChange: (open: boolean) => void;
}

function formatCedi(n: number): string {
  return `GH₵${n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

const MINI_STATS: {
  key: string;
  label: string;
  icon: LucideIcon;
  dot: string;
  gradient: string;
  chip: string;
  value: (b: BranchWithAggregates) => string;
}[] = [
  {
    key: "staff",
    label: "Staff",
    icon: Users,
    dot: "bg-chart-2",
    gradient: "from-chart-2/[0.07]",
    chip: "bg-chart-2/10 text-chart-2",
    value: (b) => b.staff_count.toLocaleString(),
  },
  {
    key: "customers",
    label: "Customers",
    icon: UserRound,
    dot: "bg-chart-3",
    gradient: "from-chart-3/[0.07]",
    chip: "bg-chart-3/10 text-chart-3",
    value: (b) => b.customer_count.toLocaleString(),
  },
  {
    key: "since",
    label: "Since",
    icon: CalendarDays,
    dot: "bg-chart-1",
    gradient: "from-chart-1/[0.07]",
    chip: "bg-chart-1/10 text-chart-1",
    value: (b) => String(new Date(b.created_at).getFullYear()),
  },
];

const DETAIL_FIELDS: {
  key: string;
  label: string;
  icon: LucideIcon;
  value: (b: BranchWithAggregates, countryName: string) => string;
}[] = [
  { key: "address", label: "Address", icon: MapPin, value: (b) => b.address ?? "—" },
  { key: "phone", label: "Phone", icon: Phone, value: (b) => b.phone ?? "—" },
  {
    key: "country",
    label: "Country",
    icon: Globe,
    value: (_b, countryName) => countryName,
  },
  {
    key: "last",
    label: "Last activity",
    icon: Clock,
    value: (b) =>
      b.last_activity_date
        ? formatDistanceToNow(new Date(b.last_activity_date), { addSuffix: true })
        : "No activity yet",
  },
];

export function BranchDetailDialog({ branch, onOpenChange }: BranchDetailDialogProps) {
  const open = branch !== null;
  const country = branch ? getCountryByCode(branch.country_code as any) : undefined;
  const countryName = country ? `${country.name} ${country.flag}` : branch?.country_code ?? "—";
  const displayName = branch?.name?.trim() || "Unnamed branch";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {/* Hero header — gradient, avatar, name, status, credit readout */}
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
                <Building2 className="mr-1.5 inline h-3.5 w-3.5 align-text-bottom" />
                {branch?.city}
                {country ? ` · ${country.flag}` : ""}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-medium",
                    branch?.is_active
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-muted-foreground/20 bg-muted/40 text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-1.5 w-1.5 rounded-full",
                      branch?.is_active ? "bg-emerald-500" : "bg-muted-foreground/50",
                    )}
                  />
                  {branch?.is_active ? "Active" : "Inactive"}
                </span>
                <span className="text-muted-foreground/60">·</span>
                <span className="text-muted-foreground">
                  {branch ? `Since ${new Date(branch.created_at).getFullYear()}` : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Credit issued this month — hero readout */}
          <div className="from-chart-4/10 to-card mt-5 flex items-end justify-between rounded-xl border bg-gradient-to-br p-4">
            <div>
              <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide">
                <span className="bg-chart-4 inline-block h-1.5 w-1.5 rounded-full" />
                Credit issued this month
              </div>
              <div className="mt-1.5 text-3xl font-semibold tracking-tight tabular-nums">
                {branch ? formatCedi(branch.credit_issued_this_month) : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-6 p-6">
          {/* Mini stat row */}
          <div className="grid grid-cols-3 gap-3">
            {MINI_STATS.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.key}
                  className={cn(
                    "bg-gradient-to-br to-card rounded-xl border p-3.5",
                    s.gradient,
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("rounded-md p-1.5", s.chip)}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} />
                  </div>
                  <div className="mt-2.5 text-lg font-semibold leading-none tabular-nums">
                    {branch ? s.value(branch) : "—"}
                  </div>
                  <div className="text-muted-foreground mt-1 text-[11px]">{s.label}</div>
                </div>
              );
            })}
          </div>

          {/* Detail fields */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {DETAIL_FIELDS.map((f) => {
              const Icon = f.icon;
              const value = branch ? f.value(branch, countryName) : "—";
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
                    <div className="mt-0.5 truncate text-sm font-medium">{value}</div>
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