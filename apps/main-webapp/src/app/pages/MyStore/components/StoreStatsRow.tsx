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
    value: (m: MerchantWithStats) => m.branch_count,
  },
  {
    key: "staff",
    label: "Staff",
    icon: Users,
    value: (m: MerchantWithStats) => m.staff_count,
  },
  {
    key: "customers",
    label: "Customers",
    icon: UserRound,
    value: (m: MerchantWithStats) => m.customer_count,
  },
  {
    key: "issued",
    label: "Credit issued (lifetime)",
    icon: Coins,
    value: (m: MerchantWithStats) => m.lifetime_credit_issued,
  },
] as const;

export function StoreStatsRow({ merchant }: StoreStatsRowProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {STATS.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.key}
            className="animate-fade-in-up motion-reduce:animate-none p-5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums">
                  {formatStat(stat.value(merchant))}
                </div>
                <div className="text-muted-foreground text-xs">{stat.label}</div>
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