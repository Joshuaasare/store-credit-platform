import { useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Users, ShoppingBag, Coins } from "lucide-react";
import {
  Card,
  Skeleton,
  cn,
  Monogram,
} from "@store-credit-platform/web-components";
import { DataTable } from "@shared/components/DataTable/DataTable";
import InfiniteScroll from "@shared/components/InfiniteScroll/InfiniteScroll";
import { customerService } from "@store-credit-platform/api-services";
import { useStoreStore } from "@shared/stores/storeStore";
import { LeaderboardRow } from "@shared/types/api.types";
import { startOfYearEpochMs } from "@shared/utils/date.utils";
import { formatGHS } from "@shared/utils/format";
import { leaderboardInitials } from "@shared/utils/customers.utils";
import {
  TransactionsFilters,
  TransactionsFiltersValue,
} from "./components/TransactionsFilters";
import { formatDisplayNumber } from "@shared/utils/ui.utils";

const LIMIT = 20;

export default function TransactionsLeaderboard() {
  const { branches } = useStoreStore();

  const [filters, setFilters] = useState<TransactionsFiltersValue>(() => ({
    sort: "purchases",
    branchId: null,
    datePreset: "this_year",
    start: startOfYearEpochMs(),
    // end=null → "no upper bound". Keeps newly-created transactions in-window
    // so the leaderboard reflects purchases added in the current session.
    end: null,
  }));

  const leaderboardQuery = useInfiniteQuery({
    queryKey: [
      "transactions",
      "leaderboard",
      {
        sort: filters.sort,
        branchId: filters.branchId,
        start: filters.start,
        end: filters.end,
      },
    ],
    queryFn: ({ pageParam }) => {
      const offset = (pageParam as number) ?? 0;
      return customerService.getLeaderboard({
        sort: filters.sort,
        branch_id: filters.branchId ?? undefined,
        start: filters.start ?? undefined,
        end: filters.end ?? undefined,
        limit: LIMIT,
        offset,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (!lastPage.success) return undefined;
      const nextOffset = lastPage.data.offset + LIMIT;
      return nextOffset < lastPage.data.total ? nextOffset : undefined;
    },
    enabled: true,
  });

  const statsQuery = useQuery({
    queryKey: [
      "transactions",
      "leaderboard-stats",
      {
        branchId: filters.branchId,
        start: filters.start,
        end: filters.end,
      },
    ],
    queryFn: () =>
      customerService.getLeaderboardStats({
        branch_id: filters.branchId ?? undefined,
        start: filters.start ?? undefined,
        end: filters.end ?? undefined,
      }),
  });

  const rows = useMemo(() => {
    const pages = leaderboardQuery.data?.pages ?? [];
    const out: LeaderboardRow[] = [];
    for (const p of pages) {
      if (p.success) out.push(...p.data.rows);
    }
    return out;
  }, [leaderboardQuery.data]);

  const stats = statsQuery.data?.success ? statsQuery.data.data : null;
  const lastPage =
    leaderboardQuery.data?.pages?.[leaderboardQuery.data.pages.length - 1];
  const total = lastPage?.success ? lastPage.data.total : 0;

  const hasNextPage = leaderboardQuery.hasNextPage;
  const isFetching = leaderboardQuery.isFetching;

  const columns: ColumnDef<LeaderboardRow>[] = useMemo(
    () => [
      {
        id: "rank",
        header: "#",
        cell: ({ row }) => `#${row.index + 1}`,
        size: 60,
      },
      {
        id: "customer",
        header: "Customer",
        cell: ({ row }) => {
          const r = row.original;
          const name = r.customer_name?.trim() || "";
          const isLinked =
            r.user_id != null && name && name !== "Unnamed customer";
          return (
            <div className="flex min-w-0 items-center gap-3">
              <Monogram
                text={leaderboardInitials(r)}
                seed={r.user_id ?? r.phone ?? String(r.customer_id)}
                size="sm"
              />
              <div className="min-w-0">
                <div className="truncate font-medium">
                  {isLinked
                    ? name
                    : (formatDisplayNumber(r.phone) ?? "Unnamed customer")}
                </div>
                {isLinked && r.phone && (
                  <div className="text-muted-foreground truncate text-xs">
                    {formatDisplayNumber(r.phone)}
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: "branch",
        header: "Branch",
        cell: ({ row }) => {
          const bid = row.original.branch_id;
          if (bid == null)
            return <span className="text-muted-foreground">—</span>;
          const b = branches.find((x) => x.id === bid);
          return (
            <span className="truncate">{b?.name?.trim() || `#${bid}`}</span>
          );
        },
      },
      {
        id: "purchases",
        header: "Purchases",
        cell: ({ row }) => formatGHS(row.original.total_purchases),
      },
      {
        id: "credits_issued",
        header: "Credits issued",
        cell: ({ row }) => formatGHS(row.original.total_credits_issued),
      },
      {
        id: "credits_redeemed",
        header: "Credits redeemed",
        cell: ({ row }) => formatGHS(row.original.total_credits_redeemed),
      },
    ],
    [branches],
  );

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card
        className="animate-fade-in-up p-4 motion-reduce:animate-none"
        style={{ animationDelay: "180ms" }}
      >
        <TransactionsFilters
          value={filters}
          onChange={(next) => setFilters(next)}
          branches={branches}
          showSort
        />
      </Card>
      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Customers"
          icon={<Users className="h-4 w-4 stroke-[1.75]" />}
          tone="primary"
          style={{ animationDelay: "0ms" }}
          value={
            stats ? (
              stats.total_customers.toLocaleString()
            ) : (
              <Skeleton className="h-6 w-16" />
            )
          }
        />
        <StatCard
          label="Purchases (window)"
          icon={<ShoppingBag className="h-4 w-4 stroke-[1.75]" />}
          tone="emerald"
          style={{ animationDelay: "60ms" }}
          value={
            stats ? (
              formatGHS(stats.total_purchases)
            ) : (
              <Skeleton className="h-6 w-24" />
            )
          }
        />
        <StatCard
          label="Credits issued (window)"
          icon={<Coins className="h-4 w-4 stroke-[1.75]" />}
          tone="amber"
          style={{ animationDelay: "120ms" }}
          value={
            stats ? (
              formatGHS(stats.total_credits_issued)
            ) : (
              <Skeleton className="h-6 w-24" />
            )
          }
        />
      </div>
      {/* Table card */}
      <Card
        className="animate-fade-in-up p-0 motion-reduce:animate-none"
        style={{ animationDelay: "240ms" }}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight">
              Leaderboard
            </h2>
            <span className="bg-muted/50 text-muted-foreground inline-flex h-5 items-center rounded-full border px-2 text-[11px] font-medium tabular-nums">
              {total}
            </span>
          </div>
        </div>

        <InfiniteScroll
          next={async (onComplete) => {
            if (hasNextPage && !isFetching) {
              await leaderboardQuery.fetchNextPage();
            }
            onComplete?.();
          }}
          loader={
            leaderboardQuery.isFetchingNextPage ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : null
          }
        >
          <DataTable
            columns={columns}
            data={rows}
            hasPagination={false}
            emptyStateComponent={
              leaderboardQuery.isPending ? (
                <div className="w-full space-y-2 p-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <Users className="text-muted-foreground h-8 w-8" />
                  <p className="text-sm font-medium">
                    No customers in this window
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Try a different date range or branch filter.
                  </p>
                </div>
              )
            }
          />
        </InfiniteScroll>
      </Card>
    </div>
  );
}

interface StatCardProps {
  label: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  tone?: "primary" | "emerald" | "amber";
  className?: string;
  style?: React.CSSProperties;
}

const TONE_CHIP: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

function StatCard({
  label,
  icon,
  value,
  tone = "primary",
  className,
  style,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "animate-fade-in-up relative overflow-hidden p-4 motion-reduce:animate-none",
        className,
      )}
      style={style}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full blur-2xl",
          tone === "primary" && "bg-primary/10",
          tone === "emerald" && "bg-emerald-500/10",
          tone === "amber" && "bg-amber-500/10",
        )}
      />
      <div className="relative flex items-center justify-between">
        <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
          {label}
        </span>
        <span
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-lg",
            TONE_CHIP[tone],
          )}
        >
          {icon}
        </span>
      </div>
      <div className="relative mt-2 text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </div>
    </Card>
  );
}
