import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Receipt } from "lucide-react";
import {
  Button,
  Card,
  Skeleton,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
  Monogram,
} from "@store-credit-platform/web-components";
import { DataTable } from "../../components/DataTable/DataTable";
import InfiniteScroll from "../../components/InfiniteScroll/InfiniteScroll";
import { customerService } from "@store-credit-platform/api-services";
import { useStoreStore } from "@shared/stores/storeStore";
import { CustomerTransactions } from "@shared/types/api.types";
import { startOfYearEpoch } from "@shared/utils/date.utils";
import { formatEpochDate, formatGHS } from "@shared/utils/format";
import {
  customerDisplayName,
  customerInitials,
} from "@shared/utils/customers.utils";
import {
  CustomersFilters,
  CustomersFiltersValue,
} from "./components/CustomersFilters";
import { AddPurchaseDialog } from "./components/AddPurchaseDialog";
import { TransactionDetailDialog } from "./components/TransactionDetailDialog";
import {
  AMOUNT_COLOR,
  formatDisplayNumber,
  TYPE_META,
} from "@shared/utils/ui.utils";

const LIMIT = 20;

type TypeFilter = "all" | "credit_issue" | "credit_redeem";

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All Transactions" },
  { value: "credit_issue", label: "Credit Issued" },
  { value: "credit_redeem", label: "Credit Redeemed" },
];

export default function CustomersTransactions() {
  const { branches } = useStoreStore();
  const [filters, setFilters] = useState<CustomersFiltersValue>(() => ({
    branchId: null,
    datePreset: "this_year",
    start: startOfYearEpoch(),
    // end=null → "no upper bound". Keeps newly-created transactions in-window
    // so they appear immediately on refetch after a purchase is added.
    end: null,
  }));
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<CustomerTransactions | null>(null);

  const transactionsQuery = useInfiniteQuery({
    queryKey: [
      "customers",
      "transactions",
      {
        branchId: filters.branchId,
        start: filters.start,
        end: filters.end,
      },
    ],
    queryFn: ({ pageParam }) => {
      const offset = (pageParam as number) ?? 0;
      return customerService.getTransactions({
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
  });

  const rows = useMemo(() => {
    const pages = transactionsQuery.data?.pages ?? [];
    const out: CustomerTransactions[] = [];
    for (const p of pages) {
      if (p.success) out.push(...p.data.rows);
    }
    if (typeFilter === "all") return out;
    return out.filter((r) => r.transaction_type === typeFilter);
  }, [transactionsQuery.data, typeFilter]);

  const hasNextPage = transactionsQuery.hasNextPage;
  const isFetching = transactionsQuery.isFetching;

  const columns: ColumnDef<CustomerTransactions>[] = useMemo(
    () => [
      {
        id: "date",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {formatEpochDate(row.original.transaction_date)}
          </span>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        cell: ({ row }) => {
          const r = row.original;
          const name = customerDisplayName(r);
          const phone = formatDisplayNumber(r.customer?.phone) ?? "";
          const isLinked = Boolean(name);
          return (
            <div className="flex min-w-0 items-center gap-3">
              <Monogram
                text={customerInitials(r)}
                seed={
                  r.customer?.user_id ??
                  r.customer?.phone ??
                  String(r.customer_id)
                }
                size="sm"
              />
              <div className="min-w-0">
                <div className="truncate font-medium">
                  {isLinked ? name : phone || "Unnamed customer"}
                </div>
                {isLinked && phone && (
                  <div className="text-muted-foreground truncate text-xs">
                    {phone}
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
        cell: ({ row }) => (
          <span className="truncate">
            {row.original.branch?.name?.trim() || `#${row.original.branch_id}`}
          </span>
        ),
      },
      {
        id: "type",
        header: "Type",
        cell: ({ row }) => {
          const meta = TYPE_META[row.original.transaction_type];
          return (
            <Badge
              variant="outline"
              className={cn("border bg-transparent", meta.chip)}
            >
              {meta.label}
            </Badge>
          );
        },
      },
      {
        id: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <span
            className={cn(
              "font-medium tabular-nums",
              AMOUNT_COLOR[row.original.transaction_type],
            )}
          >
            {formatGHS(row.original.amount)}
          </span>
        ),
      },
      {
        id: "recorded_by",
        header: "Recorded by",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.recorded_by_user?.surname?.trim() || "—"}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      {/* Filters bar + Add a purchase */}
      <Card
        className="animate-fade-in-up p-4 motion-reduce:animate-none"
        style={{ animationDelay: "0ms" }}
      >
        <CustomersFilters
          value={filters}
          onChange={(next) => setFilters(next)}
          branches={branches}
          rightSlot={
            <AddPurchaseDialog open={addOpen} onOpenChange={setAddOpen}>
              <Button
                onClick={() => setAddOpen(true)}
                size="sm"
                className="rounded-sm shadow-sm"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Add a purchase
              </Button>
            </AddPurchaseDialog>
          }
        />
      </Card>

      {/* Table card */}
      <Card
        className="animate-fade-in-up p-0 motion-reduce:animate-none"
        style={{ animationDelay: "60ms" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as TypeFilter)}
            >
              <SelectTrigger className="h-8 w-[180px] text-sm font-semibold tracking-tight">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <InfiniteScroll
          next={async (onComplete) => {
            if (hasNextPage && !isFetching) {
              await transactionsQuery.fetchNextPage();
            }
            onComplete?.();
          }}
          loader={
            transactionsQuery.isFetchingNextPage ? (
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
            onRowClick={(row) => setDetailRow(row.original)}
            emptyStateComponent={
              transactionsQuery.isPending ? (
                <div className="w-full space-y-2 p-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <Receipt className="text-muted-foreground h-8 w-8" />
                  <p className="text-sm font-medium">
                    No transactions in this window
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Try a different date range or branch filter, or record a new
                    purchase.
                  </p>
                </div>
              )
            }
          />
        </InfiniteScroll>
      </Card>

      <TransactionDetailDialog
        row={detailRow}
        onOpenChange={(open) => !open && setDetailRow(null)}
      />
    </div>
  );
}
