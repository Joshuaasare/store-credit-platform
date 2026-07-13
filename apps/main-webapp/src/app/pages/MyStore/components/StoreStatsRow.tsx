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
    dot: "bg-chart-1",
    currency: false,
    value: (m: MerchantWithStats) => m.branch_count,
  },
  {
    key: "staff",
    label: "Staff",
    icon: Users,
    dot: "bg-chart-2",
    currency: false,
    value: (m: MerchantWithStats) => m.staff_count,
  },
  {
    key: "customers",
    label: "Customers",
    icon: UserRound,
    dot: "bg-chart-3",
    currency: false,
    value: (m: MerchantWithStats) => m.customer_count,
  },
  {
    key: "issued",
    label: "Credit issued (lifetime)",
    icon: Coins,
    dot: "bg-chart-4",
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
            className="group animate-fade-in-up p-5 transition-colors hover:border-primary/30 motion-reduce:animate-none"
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
              <Icon className="text-muted-foreground/40 h-4 w-4" />
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