import { useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Users, ShoppingBag, Coins } from "lucide-react";
import { Card, Skeleton } from "@store-credit-platform/web-components";
import { DataTable } from "../../components/DataTable/DataTable";
import InfiniteScroll from "../../components/InfiniteScroll/InfiniteScroll";
import { customerService } from "@store-credit-platform/api-services";
import { useStoreStore } from "@shared/stores/storeStore";
import { LeaderboardRow } from "@shared/types/customer.types";
import { formatGHS } from "@shared/utils/format";
import {
  CustomersFilters,
  CustomersFiltersValue,
} from "./components/CustomersFilters";

const LIMIT = 20;

function thisYearRange(): { start: number; end: number } {
  const now = new Date();
  return {
    start: Math.floor(new Date(now.getFullYear(), 0, 1).getTime() / 1000),
    end: Math.floor(now.getTime() / 1000),
  };
}

export default function CustomersLeaderboard() {
  const { branches } = useStoreStore();

  const [filters, setFilters] = useState<CustomersFiltersValue>(() => {
    const yr = thisYearRange();
    return {
      sort: "purchases",
      branchId: null,
      datePreset: "this_year",
      start: yr.start,
      end: yr.end,
    };
  });

  const leaderboardQuery = useInfiniteQuery({
    queryKey: [
      "customers",
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
      "customers",
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
  const lastPage = leaderboardQuery.data?.pages?.[leaderboardQuery.data.pages.length - 1];
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
          const name = r.customer_name?.trim() || "Unnamed customer";
          return (
            <div className="min-w-0">
              <div className="truncate font-medium">{name}</div>
              {r.phone && (
                <div className="text-muted-foreground truncate text-xs">
                  {r.phone}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: "branch",
        header: "Branch",
        cell: ({ row }) => {
          const bid = row.original.branch_id;
          if (bid == null) return <span className="text-muted-foreground">—</span>;
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
      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Customers"
          icon={<Users className="h-4 w-4" />}
          value={
            stats ? stats.total_customers.toLocaleString() : <Skeleton className="h-6 w-16" />
          }
        />
        <StatCard
          label="Purchases (window)"
          icon={<ShoppingBag className="h-4 w-4" />}
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
          icon={<Coins className="h-4 w-4" />}
          value={
            stats ? (
              formatGHS(stats.total_credits_issued)
            ) : (
              <Skeleton className="h-6 w-24" />
            )
          }
        />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <CustomersFilters
          value={filters}
          onChange={(next) => setFilters(next)}
          branches={branches}
          showSort
        />
      </Card>

      {/* Table card */}
      <Card className="p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold tracking-tight">Leaderboard</h2>
            <span className="inline-flex h-5 items-center rounded-full border bg-muted/50 px-2 text-[11px] font-medium text-muted-foreground tabular-nums">
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
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <Users className="text-muted-foreground h-8 w-8" />
                <p className="text-sm font-medium">No customers in this window</p>
                <p className="text-muted-foreground text-xs">
                  Try a different date range or branch filter.
                </p>
              </div>
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
}

function StatCard({ label, icon, value }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide">
          {icon}
          {label}
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </div>
    </Card>
  );
}