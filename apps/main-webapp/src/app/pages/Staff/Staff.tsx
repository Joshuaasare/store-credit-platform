import { useMemo, useRef, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserCog, Search, X, MoreHorizontal, Pencil, Trash2, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
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
  Badge,
  Button,
  Monogram,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  cn,
} from "@store-credit-platform/web-components";
import { staffService } from "@store-credit-platform/api-services";
import { isApiError } from "@shared/utils/api.utils";
import { useStoreStore } from "@shared/stores/storeStore";
import { useAuthStore } from "@shared/stores/authStore";
import type { Staff } from "@shared/types/api.types";
import { formatDisplayNumber } from "@shared/utils/ui.utils";
import { formatIsoDate } from "@shared/utils/format";
import {
  staffDisplayName,
  staffInitials,
} from "@shared/utils/staff.utils";
import {
  errorToastProperties,
  successToastProperties,
} from "@shared/utils/misc.utils";
import { StaffDialog } from "./components/StaffDialog";
import { DeleteStaffDialog } from "./components/DeleteStaffDialog";

const SEARCH_DEBOUNCE_MS = 300;

export default function Staff() {
  const { branches } = useStoreStore();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [branchId, setBranchId] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState<"all" | "manager" | "cashier">("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [deleting, setDeleting] = useState<Staff | null>(null);

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

  const staffQuery = useQuery({
    queryKey: ["staff", "list", { branchId, role: roleFilter, search: search.trim() || null }],
    queryFn: async () => {
      const res = await staffService.listStaff({
        branch_id: branchId ?? undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
        search: search.trim() || undefined,
        limit: 200,
        offset: 0,
      });
      if (isApiError(res)) throw new Error(res.error);
      return res.data;
    },
  });

  const rows = staffQuery.data?.rows ?? [];
  const total = staffQuery.data?.total ?? 0;

  const invalidateStaff = () => {
    void queryClient.invalidateQueries({ queryKey: ["staff"] });
    // MyStore's staff_count stat should refresh too.
    void queryClient.invalidateQueries({ queryKey: ["merchant"] });
    void queryClient.invalidateQueries({ queryKey: ["store"] });
  };

  const accessMutation = useMutation({
    mutationFn: async ({ s, next }: { s: Staff; next: boolean }) => {
      const res = await staffService.setStaffAccess(s.user.id, { access_granted: next });
      if (isApiError(res)) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (_data, vars) => {
      toast.success(
        vars.next ? "Staff member enabled" : "Staff member disabled",
        successToastProperties,
      );
      invalidateStaff();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to toggle access",
        errorToastProperties,
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (s: Staff) => {
      const res = await staffService.deleteStaff(s.user.id);
      if (isApiError(res)) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Staff member deleted", successToastProperties);
      setDeleting(null);
      invalidateStaff();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete staff member",
        errorToastProperties,
      );
    },
  });

  const visibleRows = useMemo(() => rows, [rows]);

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
          <div className="relative flex items-start gap-4">
            <div className="from-primary to-primary/70 text-primary-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm">
              <UserCog className="h-6 w-6 stroke-[1.75]" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">Staff</h1>
              <p className="text-muted-foreground text-sm">
                Add, edit, and manage the people who run your store. Assign a
                role and a branch; disable or remove access any time.
              </p>
            </div>
            <Button onClick={() => setAddOpen(true)} className="shrink-0">
              Add staff
            </Button>
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

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Role</Label>
              <Select
                value={roleFilter}
                onValueChange={(v) =>
                  setRoleFilter(v as "all" | "manager" | "cashier")
                }
              >
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="manager">Managers</SelectItem>
                  <SelectItem value="cashier">Cashiers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-muted-foreground ml-auto self-end text-xs tabular-nums">
              {staffQuery.isPending ? "—" : `${total} staff`}
            </div>
          </div>
        </Card>

        {/* Staff table */}
        <Card
          className="animate-fade-in-up overflow-hidden p-0 motion-reduce:animate-none"
          style={{ animationDelay: "120ms" }}
        >
          {staffQuery.isPending ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
              <UserCog className="text-muted-foreground h-8 w-8" />
              <p className="text-sm font-medium">
                {search.trim()
                  ? `No staff match "${search.trim()}"`
                  : branchId == null && roleFilter === "all"
                    ? "No staff yet"
                    : "No staff match these filters"}
              </p>
              <p className="text-muted-foreground text-xs">
                {search.trim()
                  ? "Try a different name or phone, or clear the filters."
                  : "Add your first staff member to start assigning roles and branches."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last active</TableHead>
                  <TableHead className="w-12 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map((s) => (
                  <StaffRow
                    key={s.id}
                    s={s}
                    selfId={user?.id ?? null}
                    onEdit={() => setEditing(s)}
                    onDelete={() => setDeleting(s)}
                    onToggleAccess={(next) =>
                      accessMutation.mutate({ s, next })
                    }
                    pendingAccess={accessMutation.isPending}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Create dialog */}
      <StaffDialog
        currentUserId={user?.id ?? null}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={() => {
          setAddOpen(false);
          invalidateStaff();
        }}
      />

      {/* Edit dialog */}
      <StaffDialog
        staff={editing ?? undefined}
        currentUserId={user?.id ?? null}
        open={editing != null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        onSaved={() => {
          setEditing(null);
          invalidateStaff();
        }}
      />

      {/* Delete confirm */}
      <DeleteStaffDialog
        staff={deleting}
        open={deleting != null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting);
        }}
        pending={deleteMutation.isPending}
      />
    </div>
  );
}

interface StaffRowProps {
  s: Staff;
  selfId: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onToggleAccess: (next: boolean) => void;
  pendingAccess: boolean;
}

function StaffRow({
  s,
  selfId,
  onEdit,
  onDelete,
  onToggleAccess,
  pendingAccess,
}: StaffRowProps) {
  const isSelf = selfId != null && s.user.id === selfId;
  const enabled = s.user.access_granted;

  return (
    <TableRow className={cn(!enabled && "opacity-60")}>
      <TableCell>
        <div className="flex items-center gap-3">
          <Monogram
            text={staffInitials(s)}
            seed={s.user.id}
            size="sm"
          />
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-medium">
                {staffDisplayName(s)}
              </span>
              {isSelf && (
                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                  You
                </Badge>
              )}
            </div>
            <div className="text-muted-foreground truncate text-xs tabular-nums">
              {formatDisplayNumber(s.user.phone) ?? s.user.phone}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <RoleBadge role={s.role} />
      </TableCell>
      <TableCell>
        <span className="text-sm">
          {s.branch.name?.trim() || `Branch #${s.branch_id}`}
        </span>
      </TableCell>
      <TableCell>
        <StatusBadge enabled={enabled} />
      </TableCell>
      <TableCell className="text-muted-foreground text-xs tabular-nums">
        {formatIsoDate(s.user.last_login_at)}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Staff actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isSelf || pendingAccess}
              onSelect={() => onToggleAccess(!enabled)}
            >
              {enabled ? (
                <>
                  <ShieldOff className="h-4 w-4" />
                  Disable
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Enable
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isSelf}
              onSelect={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function RoleBadge({ role }: { role: Staff["role"] }) {
  if (role === "manager") {
    return (
      <Badge className="border-primary/30 bg-primary/10 text-primary">
        Manager
      </Badge>
    );
  }
  return <Badge variant="secondary">Cashier</Badge>;
}

function StatusBadge({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return (
      <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        Active
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Disabled
    </Badge>
  );
}