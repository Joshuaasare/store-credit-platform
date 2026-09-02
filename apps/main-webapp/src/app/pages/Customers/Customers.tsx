import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Funnel, Users } from "lucide-react";
import {
  Skeleton,
  useIsMobile,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
} from "@store-credit-platform/web-components";
import InfiniteScroll from "@shared/components/InfiniteScroll/InfiniteScroll";
import { customerService } from "@store-credit-platform/api-services";
import { useStoreStore } from "@shared/stores/storeStore";
import { useAuthStore } from "@shared/stores/authStore";
import { CustomerListRow } from "@shared/types/api.types";
import { CustomerCard } from "./components/CustomerCard";
import useDebounce from "@shared/hooks/useDebounce";
import SearchInput from "@shared/components/SearchInput/SearchInput";
import { FilterBar } from "@shared/components/FilterBar/FilterBar";
import { PageHeader } from "@shared/components/PageHeader";
import { isEmpty } from "@shared/utils/misc.utils";
import { allBranchOption } from "@shared/utils/options.utils";

const LIMIT = 20;

export default function Customers() {
  const { branches } = useStoreStore();
  const user = useAuthStore((s) => s.user);
  const userBranchId = user?.branch_id ?? null;
  // null = merchant-wide (caller's branch default, or "All branches").
  const [branchId, setBranchId] = useState<number | null>(userBranchId);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchQuery = useDebounce(searchInput, 300);
  const trimmedSearch = debouncedSearchQuery.trim();
  const isMobile = useIsMobile();
  const [mode, setMode] = useState<"filter">();

  const customersQuery = useInfiniteQuery({
    queryKey: [
      "customers",
      "list",
      { branchId, search: trimmedSearch || null },
    ],
    queryFn: ({ pageParam }) => {
      const offset = (pageParam as number) ?? 0;
      return customerService.listCustomers({
        branch_id: branchId ?? undefined,
        search: trimmedSearch || undefined,
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
    const pages = customersQuery.data?.pages ?? [];
    const out: CustomerListRow[] = [];
    for (const p of pages) {
      if (p.success) out.push(...p.data.rows);
    }
    return out;
  }, [customersQuery.data]);

  const hasNextPage = customersQuery.hasNextPage;
  const isFetching = customersQuery.isFetching;

  const onClose = () => {
    setMode(undefined);
  };

  const renderFilters = () => {
    return (
      <FilterBar
        onFilterChange={(filter: string, v: string | string[]) => {
          if (filter === "branch-filter") {
            setBranchId(v === "all" ? null : Number(v));
          }
        }}
        filters={[
          {
            type: "select",
            label: "Branch",
            placeholder: "Filter by Branch",
            id: "branch-filter",
            triggerClassName: "w-full md:w-auto",
            disabled: !isEmpty(searchInput),
            options: [allBranchOption].concat(
              branches.map((branch) => ({
                label: branch.name ?? "",
                value: branch.id.toString(),
              })),
            ),
          },
        ]}
      />
    );
  };

  return (
    <div className="relative min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="relative mx-auto max-w-7xl space-y-8">
        {/* Page header */}
        <PageHeader
          title="Customers"
          subtitle="Every customer who has made a purchase at your store, their total spend, and the credit they have available."
        />

        {/* Filters bar */}
        <div
          className="animate-fade-in-up flex flex-wrap items-center gap-3 motion-reduce:animate-none"
          style={{ animationDelay: "60ms" }}
        >
          <div className="flex flex-1 items-center gap-2 sm:max-w-sm">
            <div className="relative flex-1">
              <SearchInput
                searchPlaceholder="Search staff"
                searchQuery={searchInput}
                onSearch={setSearchInput}
              />
            </div>
          </div>

          {!isMobile && renderFilters()}
          {isMobile && (
            <Button
              variant="outline"
              className="relative rounded-sm p-2"
              onClick={() => setMode("filter")}
            >
              <Funnel />
              <span className="bg-primary absolute right-1 top-1 h-2 w-2 rounded-full" />
            </Button>
          )}
        </div>

        {/* Card grid */}
        <div
          className="animate-fade-in-up motion-reduce:animate-none"
          style={{ animationDelay: "120ms" }}
        >
          {customersQuery.isPending && rows.length === 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed py-16 text-center">
              <Users className="text-muted-foreground h-8 w-8" />
              <p className="text-sm font-medium">
                {trimmedSearch
                  ? `No customers match "${trimmedSearch}"`
                  : "No customers yet"}
              </p>
              <p className="text-muted-foreground text-xs">
                {trimmedSearch
                  ? "Try a different name or phone number, or switch branches."
                  : "Customers appear here once they make their first purchase."}
              </p>
            </div>
          ) : (
            <InfiniteScroll
              next={async (onComplete) => {
                if (hasNextPage && !isFetching) {
                  await customersQuery.fetchNextPage();
                }
                onComplete?.();
              }}
              loader={
                customersQuery.isFetchingNextPage ? (
                  <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-40 w-full rounded-xl" />
                    ))}
                  </div>
                ) : null
              }
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((row) => (
                  <CustomerCard key={row.customer_id} row={row} />
                ))}
              </div>
            </InfiniteScroll>
          )}
        </div>
      </div>

      {mode === "filter" && isMobile && (
        <Dialog open={mode === "filter" && isMobile} onOpenChange={onClose}>
          <DialogContent>
            <DialogHeader>
              <h2 className="text-left">Filters</h2>
            </DialogHeader>
            {renderFilters()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
