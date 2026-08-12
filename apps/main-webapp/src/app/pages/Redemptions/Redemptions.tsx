import { useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Ticket, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  Monogram,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  cn,
} from "@store-credit-platform/web-components";
import { DataTable } from "../../components/DataTable/DataTable";
import InfiniteScroll from "../../components/InfiniteScroll/InfiniteScroll";
import { redemptionService } from "@store-credit-platform/api-services";
import { useStoreStore } from "@shared/stores/storeStore";
import {
  RedemptionRow,
  RedemptionStatus,
} from "@shared/types/api.types";
import { isApiError } from "@shared/utils/api.utils";
import { formatGHS, formatIsoDate } from "@shared/utils/format";
import {
  errorToastProperties,
  successToastProperties,
} from "@shared/utils/misc.utils";
import {
  REDEMPTION_STATUS_META,
  deriveRedemptionStatus,
  formatDisplayNumber,
} from "@shared/utils/ui.utils";

const LIMIT = 20;

// Three status tabs — no "all". The page is always in exactly one of these.
const STATUS_TABS: { value: RedemptionStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const EMPTY_COPY: Record<RedemptionStatus, { title: string; hint: string }> = {
  pending: {
    title: "No pending redemption requests",
    hint: "Customer-initiated redemption requests will appear here for manager review.",
  },
  approved: {
    title: "No approved redemptions",
    hint: "Approved redemption requests will appear here.",
  },
  rejected: {
    title: "No rejected redemptions",
    hint: "Rejected redemption requests will appear here.",
  },
};

// Build a customer display name from a nested customer row. Names live on the
// customer row (surname / other_names); returns "" when both are empty so the
// caller can fall back to phone or "Unnamed customer".
function redemptionCustomerName(c: RedemptionRow["customer"]): string {
  if (!c) return "";
  const surname = c.surname ?? "";
  const otherNames = c.other_names ?? "";
  const name = `${surname}${otherNames ? " " + otherNames : ""}`.trim();
  return name || "";
}

// 1-2 char monogram for a redemption customer. Named customer: first letter of
// first + last word. Unnamed: last 2 digits of phone. Returns "?" if neither.
function redemptionCustomerInitials(c: RedemptionRow["customer"]): string {
  const name = redemptionCustomerName(c);
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  const phone = c?.phone?.replace(/\D/g, "") ?? "";
  if (phone.length >= 2) return phone.slice(-2);
  return "?";
}

export default function Redemptions() {
  const { branches } = useStoreStore();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RedemptionStatus>("pending");
  const [branchId, setBranchId] = useState<number | null>(null);

  const redemptionsQuery = useInfiniteQuery({
    queryKey: [
      "redemptions",
      "list",
      { status, branchId, limit: LIMIT },
    ],
    queryFn: ({ pageParam }) => {
      const offset = (pageParam as number) ?? 0;
      return redemptionService.listRedemptions({
        status,
        branch_id: branchId ?? undefined,
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
    const pages = redemptionsQuery.data?.pages ?? [];
    const out: RedemptionRow[] = [];
    for (const p of pages) {
      if (p.success) out.push(...p.data.rows);
    }
    return out;
  }, [redemptionsQuery.data]);

  const lastPage =
    redemptionsQuery.data?.pages?.[redemptionsQuery.data.pages.length - 1];
  const total = lastPage?.success ? lastPage.data.total : 0;
  const hasNextPage = redemptionsQuery.hasNextPage;
  const isFetching = redemptionsQuery.isFetching;

  const invalidateAllRedemptions = () => {
    // Approve/reject moves a row between tabs, so invalidate every tab's
    // query (the whole "redemptions" key namespace).
    void queryClient.invalidateQueries({ queryKey: ["redemptions"] });
  };

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await redemptionService.approveRedemption(id);
      if (isApiError(res)) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Redemption approved", successToastProperties);
      invalidateAllRedemptions();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to approve redemption",
        errorToastProperties,
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await redemptionService.rejectRedemption(id);
      if (isApiError(res)) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Redemption rejected", successToastProperties);
      invalidateAllRedemptions();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to reject redemption",
        errorToastProperties,
      );
    },
  });

  const pendingMutationId =
    approveMutation.isPending
      ? approveMutation.variables ?? null
      : rejectMutation.isPending
        ? rejectMutation.variables ?? null
        : null;

  const columns: ColumnDef<RedemptionRow>[] = useMemo(
    () => [
      {
        id: "customer",
        header: "Customer",
        cell: ({ row }) => {
          const r = row.original;
          const c = r.customer;
          const name = redemptionCustomerName(c);
          const phone = formatDisplayNumber(c?.phone) ?? "";
          const isLinked = Boolean(name);
          return (
            <div className="flex min-w-0 items-center gap-3">
              <Monogram
                text={redemptionCustomerInitials(c)}
                seed={c?.user_id ?? c?.phone ?? (c ? String(c.id) : "")}
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
        id: "credit_amount",
        header: "Credit amount",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatGHS(Number(row.original.credit?.credit_amount ?? 0))}
          </span>
        ),
      },
      {
        id: "remaining",
        header: "Remaining",
        cell: ({ row }) => (
          <span className="text-primary tabular-nums font-medium">
            {formatGHS(row.original.remaining)}
          </span>
        ),
      },
      {
        id: "requested_amount",
        header: "Requested amount",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {formatGHS(Number(row.original.amount_redeemed))}
          </span>
        ),
      },
      {
        id: "requested_at",
        header: "Requested at",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {formatIsoDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const s = deriveRedemptionStatus(row.original);
          const meta = REDEMPTION_STATUS_META[s];
          return (
            <Badge variant="outline" className={cn("border bg-transparent", meta.chip)}>
              {meta.label}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          // TODO(frontend-permissions): the Approve/Reject buttons are
          // rendered only on the Pending tab. The backend `requireRoles
          // ("manager")` check is the source of truth for now; a finer-grained
          // frontend permission check (hiding buttons for non-managers who
          // somehow reach the page) is a follow-up.
          if (status !== "pending") return null;
          const id = row.original.id;
          const disabled = pendingMutationId === id;
          return (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="default"
                disabled={disabled}
                onClick={() => approveMutation.mutate(id)}
                className="h-8 rounded-sm px-3 text-xs"
              >
                <Check className="mr-1 h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() => rejectMutation.mutate(id)}
                className="text-destructive border-destructive/30 hover:bg-destructive/10 h-8 rounded-sm px-3 text-xs"
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Reject
              </Button>
            </div>
          );
        },
      },
    ],
    [status, pendingMutationId, approveMutation, rejectMutation],
  );

  const emptyCopy = EMPTY_COPY[status];

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
              <Ticket className="h-6 w-6 stroke-[1.75]" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">Credit Redemptions</h1>
              <p className="text-muted-foreground text-sm">
                Review and approve customer-initiated credit redemption requests
                across your branches.
              </p>
            </div>
          </div>
        </div>

        {/* Status tabs + branch filter */}
        <Card
          className="animate-fade-in-up p-4 motion-reduce:animate-none"
          style={{ animationDelay: "60ms" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              value={status}
              onValueChange={(v) => setStatus(v as RedemptionStatus)}
              className="w-auto"
            >
              <TabsList className="bg-muted/40 rounded-lg border p-0.5">
                {STATUS_TABS.map((t) => (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-sm px-4"
                  >
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <Select
                value={branchId == null ? "all" : String(branchId)}
                onValueChange={(v) =>
                  setBranchId(v === "all" ? null : Number(v))
                }
              >
                <SelectTrigger className="h-8 w-[180px] text-sm font-semibold tracking-tight">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name?.trim() || `Branch #${b.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="bg-muted/50 text-muted-foreground inline-flex h-5 items-center rounded-full border px-2 text-[11px] font-medium tabular-nums">
                {total}
              </span>
            </div>
          </div>
        </Card>

        {/* Table card */}
        <Card
          className="animate-fade-in-up p-0 motion-reduce:animate-none"
          style={{ animationDelay: "120ms" }}
        >
          <InfiniteScroll
            next={async (onComplete) => {
              if (hasNextPage && !isFetching) {
                await redemptionsQuery.fetchNextPage();
              }
              onComplete?.();
            }}
            loader={
              redemptionsQuery.isFetchingNextPage ? (
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
                redemptionsQuery.isPending ? (
                  <div className="w-full space-y-2 p-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <Ticket className="text-muted-foreground h-8 w-8" />
                    <p className="text-sm font-medium">{emptyCopy.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {emptyCopy.hint}
                    </p>
                  </div>
                )
              }
            />
          </InfiniteScroll>
        </Card>
      </div>
    </div>
  );
}