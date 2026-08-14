import { useMemo, useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Ticket, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
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
} from "@store-credit-platform/web-components";
import { DataTable } from "@shared/components/DataTable/DataTable";
import InfiniteScroll from "@shared/components/InfiniteScroll/InfiniteScroll";
import { redemptionService } from "@store-credit-platform/api-services";
import { useStoreStore } from "@shared/stores/storeStore";
import {
  MerchantPendingRequest,
  MerchantApprovedRedemption,
  MerchantRedemptionMutationResponse,
} from "@shared/types/api.types";
import { isApiError } from "@shared/utils/api.utils";
import { formatGHS, formatIsoDate } from "@shared/utils/format";
import {
  errorToastProperties,
  successToastProperties,
} from "@shared/utils/misc.utils";
import { formatDisplayNumber } from "@shared/utils/ui.utils";

const LIMIT = 20;

// Two tabs only — Pending + Approved. Rejected is removed from the manager
// UI by product spec (decision 13 — the manager still has a reject
// action available on Pending rows; rejected requests are tracked in the
// audit table for the customer-side reconciliation flow).
type Tab = "pending" | "approved";

const STATUS_TABS: { value: Tab; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
];

const EMPTY_COPY: Record<Tab, { title: string; hint: string }> = {
  pending: {
    title: "No pending redemption requests",
    hint: "Customer-initiated redemption requests will appear here for manager review.",
  },
  approved: {
    title: "No approved redemptions",
    hint: "Approved redemption requests will appear here.",
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Customer display helpers (shared between the two tabs)
// ────────────────────────────────────────────────────────────────────────────

type CustomerLike = MerchantPendingRequest["customer"] | MerchantApprovedRedemption["customer"];

function customerName(c: CustomerLike): string {
  if (!c) return "";
  const surname = c.surname ?? "";
  const otherNames = c.other_names ?? "";
  const name = `${surname}${otherNames ? " " + otherNames : ""}`.trim();
  return name || "";
}

function customerInitials(c: CustomerLike): string {
  const name = customerName(c);
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

// ────────────────────────────────────────────────────────────────────────────
// Pending row (MerchantPendingRequest)
// ────────────────────────────────────────────────────────────────────────────

// Customer column for the pending tab.
const pendingCustomerColumn: ColumnDef<MerchantPendingRequest> = {
  id: "customer",
  header: "Customer",
  cell: ({ row }) => {
    const c = row.original.customer;
    const name = customerName(c);
    const phone = formatDisplayNumber(c?.phone) ?? "";
    const isLinked = Boolean(name);
    return (
      <div className="flex min-w-0 items-center gap-3">
        <Monogram
          text={customerInitials(c)}
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
};

// Branch column — pending tab rows don't carry `branch_id` on the audit
// row anymore. We pull the branch from the first touched credit row's
// branch join (always present because pending rows must have at least
// one credit slice).
const pendingBranchColumn: ColumnDef<MerchantPendingRequest> = {
  id: "branch",
  header: "Branch",
  cell: ({ row }) => {
    const breakdown = row.original.pending_credit_breakdown;
    const first = breakdown?.[0];
    const branch = (first as unknown as { branch: { id: number; name: string | null } | null })?.branch;
    return (
      <span className="truncate">
        {branch?.name?.trim() || (branch ? `#${branch.id}` : "—")}
      </span>
    );
  },
};

// Requested amount — the sum across the breakdown.
const pendingRequestedColumn: ColumnDef<MerchantPendingRequest> = {
  id: "requested_amount",
  header: "Requested amount",
  cell: ({ row }) => (
    <span className="font-medium tabular-nums">
      {formatGHS(Number(row.original.requested_amount) || 0)}
    </span>
  ),
};

// Pending breakdown preview — count of touched credit rows + total
// `pending_redemption_amount` across them (matches the merchant confirm
// step on the customer app).
const pendingBreakdownColumn: ColumnDef<MerchantPendingRequest> = {
  id: "breakdown",
  header: "Credits",
  cell: ({ row }) => {
    const rows = row.original.pending_credit_breakdown;
    return (
      <span className="text-muted-foreground tabular-nums">
        {rows.length} credit{rows.length === 1 ? "" : "s"}
      </span>
    );
  },
};

const pendingRequestedAtColumn: ColumnDef<MerchantPendingRequest> = {
  id: "requested_at",
  header: "Requested at",
  cell: ({ row }) => (
    <span className="text-muted-foreground text-sm">
      {formatIsoDate(row.original.requested_at)}
    </span>
  ),
};

// ────────────────────────────────────────────────────────────────────────────
// Approved row (MerchantApprovedRedemption)
// ────────────────────────────────────────────────────────────────────────────

const approvedCustomerColumn: ColumnDef<MerchantApprovedRedemption> = {
  id: "customer",
  header: "Customer",
  cell: ({ row }) => {
    const c = row.original.customer;
    const name = customerName(c);
    const phone = formatDisplayNumber(c?.phone) ?? "";
    const isLinked = Boolean(name);
    return (
      <div className="flex min-w-0 items-center gap-3">
        <Monogram
          text={customerInitials(c)}
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
};

const approvedAmountColumn: ColumnDef<MerchantApprovedRedemption> = {
  id: "amount_redeemed",
  header: "Amount redeemed",
  cell: ({ row }) => (
    <span className="font-medium tabular-nums">
      {formatGHS(Number(row.original.amount_redeemed) || 0)}
    </span>
  ),
};

const approvedAtColumn: ColumnDef<MerchantApprovedRedemption> = {
  id: "approved_at",
  header: "Approved at",
  cell: ({ row }) => (
    <span className="text-muted-foreground text-sm">
      {formatIsoDate(row.original.approved_at ?? row.original.created_at)}
    </span>
  ),
};

const approvedByColumn: ColumnDef<MerchantApprovedRedemption> = {
  id: "approved_by",
  header: "Approved by",
  cell: ({ row }) => {
    const s = row.original.approved_by_staff;
    if (!s) return <span className="text-muted-foreground text-sm">—</span>;
    const name =
      `${s.surname ?? ""}${s.other_names ? " " + s.other_names : ""}`.trim();
    return (
      <span className="truncate">
        {name || `Staff #${s.id}`}
      </span>
    );
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────

export default function Redemptions() {
  const { branches } = useStoreStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("pending");
  const [branchId, setBranchId] = useState<number | null>(null);

  // ─── Pending ───
  const pendingQuery = useInfiniteQuery({
    queryKey: ["redemptions", "pending", { branchId, limit: LIMIT }],
    queryFn: ({ pageParam }) => {
      const offset = (pageParam as number) ?? 0;
      return redemptionService.listPendingRedemptions({
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

  const pendingRows: MerchantPendingRequest[] = useMemo(() => {
    const pages = pendingQuery.data?.pages ?? [];
    const out: MerchantPendingRequest[] = [];
    for (const p of pages) {
      if (p.success) out.push(...p.data.rows);
    }
    return out;
  }, [pendingQuery.data]);

  // ─── Approved ───
  const approvedQuery = useInfiniteQuery({
    queryKey: ["redemptions", "approved", { branchId, limit: LIMIT }],
    queryFn: ({ pageParam }) => {
      const offset = (pageParam as number) ?? 0;
      return redemptionService.listApprovedRedemptions({
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

  const approvedRows: MerchantApprovedRedemption[] = useMemo(() => {
    const pages = approvedQuery.data?.pages ?? [];
    const out: MerchantApprovedRedemption[] = [];
    for (const p of pages) {
      if (p.success) out.push(...p.data.rows);
    }
    return out;
  }, [approvedQuery.data]);

  // Pick the right query based on the active tab — drives both the table
  // and the total-count chip.
  const activeQuery = tab === "pending" ? pendingQuery : approvedQuery;
  const lastPage =
    activeQuery.data?.pages?.[activeQuery.data.pages.length - 1];
  const total = lastPage?.success ? lastPage.data.total : 0;
  const hasNextPage = activeQuery.hasNextPage;
  const isFetching = activeQuery.isFetching;
  const activeRows = tab === "pending" ? pendingRows : approvedRows;

  const invalidateAllRedemptions = () => {
    // Approve / reject moves a row from Pending → Approved, so invalidate
    // both tabs to keep them consistent.
    void queryClient.invalidateQueries({ queryKey: ["redemptions"] });
  };

  const invalidatePending = () => {
    void queryClient.invalidateQueries({
      queryKey: ["redemptions", "pending"],
    });
  };

  const approveMutation = useMutation({
    mutationFn: async (customerId: number): Promise<MerchantRedemptionMutationResponse> => {
      const res = await redemptionService.approveRequest(customerId);
      if (isApiError(res)) throw new Error(res.error);
      return res;
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
    mutationFn: async (customerId: number): Promise<MerchantRedemptionMutationResponse> => {
      const res = await redemptionService.rejectRequest(customerId);
      if (isApiError(res)) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      toast.success("Redemption rejected", successToastProperties);
      // Reject clears the pending slice but doesn't create an audit row
      // we display (Rejected is not a tab), so just refresh Pending.
      invalidatePending();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to reject redemption",
        errorToastProperties,
      );
    },
  });

  // Track which (customerId) the current mutation is operating on so the
  // row's Approve/Reject buttons can disable themselves.
  const pendingMutationKey: { customerId: number; kind: "approve" | "reject" } | null =
    approveMutation.isPending
      ? { customerId: approveMutation.variables, kind: "approve" }
      : rejectMutation.isPending
        ? { customerId: rejectMutation.variables, kind: "reject" }
        : null;

  const pendingActionColumn: ColumnDef<MerchantPendingRequest> = {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const customerId = row.original.customer_id;
      const myDisabled =
        pendingMutationKey != null && pendingMutationKey.customerId === customerId;
      const approveDisabled = myDisabled && pendingMutationKey?.kind === "approve";
      const rejectDisabled = myDisabled && pendingMutationKey?.kind === "reject";
      const anyMutationPending = approveMutation.isPending || rejectMutation.isPending;
      return (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            disabled={anyMutationPending}
            onClick={() => approveMutation.mutate(customerId)}
            className="h-8 rounded-sm px-3 text-xs"
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            {approveDisabled ? "Approving..." : "Approve"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={anyMutationPending}
            onClick={() => rejectMutation.mutate(customerId)}
            className="text-destructive border-destructive/30 hover:bg-destructive/10 h-8 rounded-sm px-3 text-xs"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            {rejectDisabled ? "Rejecting..." : "Reject"}
          </Button>
        </div>
      );
    },
  };

  const pendingColumns: ColumnDef<MerchantPendingRequest>[] = useMemo(
    () => [
      pendingCustomerColumn,
      pendingBranchColumn,
      pendingRequestedColumn,
      pendingBreakdownColumn,
      pendingRequestedAtColumn,
      pendingActionColumn,
    ],
    // re-create when the mutation state changes so the disabled state
    // re-renders correctly on the row.
    [approveMutation.isPending, rejectMutation.isPending],
  );

  const approvedColumns: ColumnDef<MerchantApprovedRedemption>[] = useMemo(
    () => [
      approvedCustomerColumn,
      approvedAmountColumn,
      approvedAtColumn,
      approvedByColumn,
    ],
    [],
  );

  const activeColumns =
    tab === "pending" ? pendingColumns : approvedColumns;
  const activeTypedRows: unknown[] = activeRows;

  const emptyCopy = EMPTY_COPY[tab];

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
              <h1 className="text-3xl font-bold tracking-tight">
                Credit Redemptions
              </h1>
              <p className="text-muted-foreground text-sm">
                Review and approve customer-initiated credit redemption requests
                across your branches.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs + branch filter */}
        <Card
          className="animate-fade-in-up p-4 motion-reduce:animate-none"
          style={{ animationDelay: "60ms" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as Tab)}
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
                await activeQuery.fetchNextPage();
              }
              onComplete?.();
            }}
            loader={
              activeQuery.isFetchingNextPage ? (
                <div className="space-y-2 p-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : null
            }
          >
            <DataTable
              columns={activeColumns as ColumnDef<unknown>[]}
              data={activeTypedRows}
              hasPagination={false}
              emptyStateComponent={
                activeQuery.isPending ? (
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
