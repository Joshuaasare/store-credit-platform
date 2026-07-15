import { Store, Users, UserRound, Coins } from "lucide-react";
import { Card, cn } from "@store-credit-platform/web-components";
import { MerchantWithStats } from "@shared/types/api.types";

interface StoreStatsRowProps {
  merchant: MerchantWithStats;
}

const STATS = [
  {
    key: "branches",
    label: "Branches",
    icon: Store,
    dot: "bg-chart-1",
    gradient: "from-chart-1/[0.07]",
    chip: "bg-chart-1/10 text-chart-1",
    hoverBorder: "hover:border-chart-1/40",
    currency: false,
    value: (m: MerchantWithStats) => m.branch_count,
  },
  {
    key: "staff",
    label: "Staff",
    icon: Users,
    dot: "bg-chart-2",
    gradient: "from-chart-2/[0.07]",
    chip: "bg-chart-2/10 text-chart-2",
    hoverBorder: "hover:border-chart-2/40",
    currency: false,
    value: (m: MerchantWithStats) => m.staff_count,
  },
  {
    key: "customers",
    label: "Customers",
    icon: UserRound,
    dot: "bg-chart-3",
    gradient: "from-chart-3/[0.07]",
    chip: "bg-chart-3/10 text-chart-3",
    hoverBorder: "hover:border-chart-3/40",
    currency: false,
    value: (m: MerchantWithStats) => m.customer_count,
  },
  {
    key: "issued",
    label: "Credit issued (lifetime)",
    icon: Coins,
    dot: "bg-chart-4",
    gradient: "from-chart-4/[0.07]",
    chip: "bg-chart-4/10 text-chart-4",
    hoverBorder: "hover:border-chart-4/40",
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
            className={cn(
              "group animate-fade-in-up bg-gradient-to-br to-card p-5 transition-all motion-reduce:animate-none",
              stat.gradient,
              stat.hoverBorder,
            )}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[28px] font-semibold leading-none tracking-tight tabular-nums">
                  {display}
                </div>
                <div className="text-muted-foreground mt-2.5 flex items-center gap-1.5 text-xs">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${stat.dot}`} />
                  {stat.label}
                </div>
              </div>
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-105",
                  stat.chip,
                )}
              >
                <Icon className="h-4 w-4" />
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