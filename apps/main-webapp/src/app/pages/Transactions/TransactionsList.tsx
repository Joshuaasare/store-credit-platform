import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Receipt } from "lucide-react";
import {
  Button,
  Card,
  Skeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Monogram,
} from "@store-credit-platform/web-components";
import { DataTable } from "@shared/components/DataTable/DataTable";
import InfiniteScroll from "@shared/components/InfiniteScroll/InfiniteScroll";
import { transactionService } from "@store-credit-platform/api-services";
import { useStoreStore } from "@shared/stores/storeStore";
import {
  CustomerTransactions,
  TransactionTypeFilter,
} from "@shared/types/api.types";
import { startOfYearEpochMs } from "@shared/utils/date.utils";
import { formatEpochDate, formatGHS } from "@shared/utils/format";
import {
  customerDisplayName,
  customerInitials,
} from "@shared/utils/customers.utils";
import { staffDisplayName } from "@shared/utils/staff.utils";
import {
  TransactionsFilters,
  TransactionsFiltersValue,
} from "./components/TransactionsFilters";
import { AddPurchaseDialog } from "./components/AddPurchaseDialog";
import { TransactionDetailDialog } from "./components/TransactionDetailDialog";
import { formatDisplayNumber } from "@shared/utils/ui.utils";
import { TransactionTypeTag } from "@shared/components/TransactionTypeTag";

const LIMIT = 20;

const TYPE_FILTERS: { value: TransactionTypeFilter; label: string }[] = [
  { value: "all", label: "All Transactions" },
  { value: "purchase", label: "Purchases" },
  { value: "credit_issue", label: "Credit Issued" },
  { value: "credit_redeem", label: "Credit Redeemed" },
];

// Credit-only filters hide the "record a new purchase" CTA — purchases don't produce credits.
const EMPTY_COPY: Record<
  TransactionTypeFilter,
  { title: string; hint?: string }
> = {
  all: {
    title: "No transactions in this window",
    hint: "Try a different date range or branch filter, or record a new purchase.",
  },
  purchase: {
    title: "No purchases in this window",
    hint: "Try a different date range or branch filter, or record a new purchase.",
  },
  credit_issue: {
    title: "No credit issued in this window",
    hint: "Credit is issued automatically when a purchase triggers a running promo. Try a different date range or branch filter.",
  },
  credit_redeem: {
    title: "No credit redeemed in this window",
    hint: "Redemptions appear here once a customer's credit is redeemed. Try a different date range or branch filter.",
  },
};

export default function TransactionsList() {
  const { branches } = useStoreStore();
  const [filters, setFilters] = useState<TransactionsFiltersValue>(() => ({
    branchId: null,
    datePreset: "this_year",
    start: startOfYearEpochMs(),
    // end=null keeps newly-created transactions in-window across refetches.
    end: null,
  }));
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<CustomerTransactions | null>(null);

  const transactionsQuery = useInfiniteQuery({
    queryKey: [
      "transactions",
      "list",
      {
        type: typeFilter,
        branchId: filters.branchId,
        start: filters.start,
        end: filters.end,
      },
    ],
    queryFn: ({ pageParam }) => {
      const offset = (pageParam as number) ?? 0;
      return transactionService.getTransactions({
        type: typeFilter,
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
    return out;
  }, [transactionsQuery.data]);

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
        cell: ({ row }) => (
          <TransactionTypeTag type={row.original.transaction_type} />
        ),
      },
      {
        id: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <span className="text-foreground font-medium tabular-nums">
            {formatGHS(row.original.amount)}
          </span>
        ),
      },
      {
        id: "recorded_by",
        header: "Recorded by",
        cell: ({ row }) => {
          const r = row.original;
          const staff = r.recorded_by_staff ?? r.approved_by_staff;
          return (
            <span className="text-muted-foreground text-sm">
              {staff ? staffDisplayName(staff) : "—"}
            </span>
          );
        },
      },
    ],
    [],
  );

  const emptyCopy = EMPTY_COPY[typeFilter];

  return (
    <div className="space-y-6">
      {/* Filters bar + Add a purchase */}
      <div
        className="animate-fade-in-up motion-reduce:animate-none"
        style={{ animationDelay: "0ms" }}
      >
        <TransactionsFilters
          value={filters}
          onChange={(next) => setFilters(next)}
          branches={branches}
        />
      </div>

      {/* Table card */}
      <Card
        className="animate-fade-in-up p-0 motion-reduce:animate-none"
        style={{ animationDelay: "60ms" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as TransactionTypeFilter)}
            >
              <SelectTrigger className="h-8 w-[180px] text-sm font-semibold tracking-tight">
                <SelectValue placeholder="All transactions" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value} className="text-sm">
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AddPurchaseDialog open={addOpen} onOpenChange={setAddOpen}>
            <Button
              onClick={() => setAddOpen(true)}
              size="sm"
              className="rounded-sm shadow-sm"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add purchase
            </Button>
          </AddPurchaseDialog>
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
                  <p className="text-sm font-medium">{emptyCopy.title}</p>
                  {emptyCopy.hint && (
                    <p className="text-muted-foreground text-xs">
                      {emptyCopy.hint}
                    </p>
                  )}
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
