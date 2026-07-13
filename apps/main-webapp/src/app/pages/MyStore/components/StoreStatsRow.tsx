import { Store, Users, UserRound, Coins } from "lucide-react";
import { Card } from "@store-credit-platform/web-components";
import { MerchantWithStats } from "@shared/types/api.types";

interface StoreStatsRowProps {
  merchant: MerchantWithStats;
}

const STATS = [
  {
    key: "branches",
    label: "Branches",
    icon: Store,
    chip: "bg-chart-1/15 text-chart-1",
    line: "bg-chart-1",
    currency: false,
    value: (m: MerchantWithStats) => m.branch_count,
  },
  {
    key: "staff",
    label: "Staff",
    icon: Users,
    chip: "bg-chart-2/15 text-chart-2",
    line: "bg-chart-2",
    currency: false,
    value: (m: MerchantWithStats) => m.staff_count,
  },
  {
    key: "customers",
    label: "Customers",
    icon: UserRound,
    chip: "bg-chart-3/15 text-chart-3",
    line: "bg-chart-3",
    currency: false,
    value: (m: MerchantWithStats) => m.customer_count,
  },
  {
    key: "issued",
    label: "Credit issued (lifetime)",
    icon: Coins,
    chip: "bg-chart-4/15 text-chart-4",
    line: "bg-chart-4",
    currency: true,
    value: (m: MerchantWithStats) => m.lifetime_credit_issued,
  },
] as const;

export function StoreStatsRow({ merchant }: StoreStatsRowProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {STATS.map((stat, i) => {
        const Icon = stat.icon;
        const raw = stat.value(merchant);
        const display = stat.currency ? formatCedi(raw) : formatStat(raw);
        return (
          <Card
            key={stat.key}
            className="group relative animate-fade-in-up overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:shadow-md motion-reduce:animate-none"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span
              aria-hidden
              className={`absolute inset-x-0 top-0 h-0.5 ${stat.line} opacity-70`}
            />
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.chip}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-semibold tracking-tight tabular-nums">
                  {display}
                </div>
                <div className="text-muted-foreground truncate text-[11px] uppercase tracking-wide">
                  {stat.label}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function formatStat(value: number): string {
  if (value >= 1000) return value.toLocaleString();
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
}

function formatCedi(n: number): string {
  return `GH₵${n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}