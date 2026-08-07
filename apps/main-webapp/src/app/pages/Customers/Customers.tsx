import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Users, Search, X } from "lucide-react";
import { debounce } from "throttle-debounce";
import {
  Card,
  Skeleton,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Input,
} from "@store-credit-platform/web-components";
import InfiniteScroll from "../../components/InfiniteScroll/InfiniteScroll";
import { customerService } from "@store-credit-platform/api-services";
import { useStoreStore } from "@shared/stores/storeStore";
import { useAuthStore } from "@shared/stores/authStore";
import { CustomerListRow } from "@shared/types/api.types";
import { CustomerCard } from "./components/CustomerCard";

const LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;

export default function Customers() {
  const { branches } = useStoreStore();
  const user = useAuthStore((s) => s.user);
  const userBranchId = user?.branch_id ?? null;

  // Branch scope: defaults to the caller's branch (null when they have none
  // or when "All branches" is chosen). `null` = merchant-wide.
  const [branchId, setBranchId] = useState<number | null>(userBranchId);
  // Controlled input value — updates immediately for a snappy field.
  const [searchInput, setSearchInput] = useState("");
  // Debounced value — drives the query key so we don't fire a request per
  // keystroke.
  const [search, setSearch] = useState("");

  // Stable debounced setter: created once, reads the latest input via the
  // closure arg. `debounce` from throttle-debounce returns a cancellable fn.
  const debouncedSetSearch = useRef(
    debounce(SEARCH_DEBOUNCE_MS, (val: string) => setSearch(val)),
  ).current;
  useEffect(() => () => debouncedSetSearch.cancel(), [debouncedSetSearch]);

  const onSearchChange = (val: string) => {
    setSearchInput(val);
    debouncedSetSearch(val);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    debouncedSetSearch.cancel();
  };

  const customersQuery = useInfiniteQuery({
    queryKey: [
      "customers",
      "list",
      { branchId, search: search.trim() || null },
    ],
    queryFn: ({ pageParam }) => {
      const offset = (pageParam as number) ?? 0;
      return customerService.listCustomers({
        branch_id: branchId ?? undefined,
        search: search.trim() || undefined,
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

  const lastPage =
    customersQuery.data?.pages?.[customersQuery.data.pages.length - 1];
  const total = lastPage?.success ? lastPage.data.total : 0;

  const hasNextPage = customersQuery.hasNextPage;
  const isFetching = customersQuery.isFetching;
  const trimmedSearch = search.trim();

  return (
    <div className="relative min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div
        aria-hidden
        className="from-primary/5 pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b to-transparent"
      />
      <div className="relative mx-auto max-w-7xl space-y-6">
        {/* Hero header card */}
        <div className="bg-card animate-fade-in-up relative overflow-hidden rounded-2xl border p-6 shadow-sm motion-reduce:animate-none">
          <div
            aria-hidden
            className="from-primary/25 via-primary/10 pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br to-transparent blur-2xl"
          />
          <div
            aria-hidden
            className="from-primary/20 via-primary/5 pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-gradient-to-br to-transparent blur-2xl"
          />
          <div className="relative flex items-start gap-4">
            <div className="from-primary to-primary/70 text-primary-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm">
              <Users className="h-6 w-6 stroke-[1.75]" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
              <p className="text-muted-foreground text-sm">
                Every customer who has made a purchase at your store, their total
                spend, and the credit they have available.
              </p>
            </div>
          </div>
        </div>

        {/* Filters bar */}
        <Card
          className="animate-fade-in-up p-4 motion-reduce:animate-none"
          style={{ animationDelay: "60ms" }}
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1 space-y-1.5">
              <Label className="text-muted-foreground text-xs">
                Search by name or phone
              </Label>
              <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                <Input
                  type="text"
                  value={searchInput}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="e.g. Joshua or 024…"
                  className="pl-9 pr-9"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    aria-label="Clear search"
                    className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Branch</Label>
              <Select
                value={branchId == null ? "all" : String(branchId)}
                onValueChange={(v) =>
                  setBranchId(v === "all" ? null : Number(v))
                }
              >
                <SelectTrigger className="h-9 w-[200px]">
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name?.trim() || "Unnamed branch"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-muted-foreground ml-auto self-end text-xs tabular-nums">
              {customersQuery.isPending ? "—" : `${total} customers`}
            </div>
          </div>
        </Card>

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
    </div>
  );
}