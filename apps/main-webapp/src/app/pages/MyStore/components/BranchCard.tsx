import { MoreVertical, Pencil, Users, UserRound } from "lucide-react";
import {
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@store-credit-platform/web-components";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { BranchWithAggregates } from "@shared/types/api.types";
import { getCountryByCode } from "@shared/utils/countries";
import { BranchEditDialog } from "./BranchEditDialog";

interface BranchCardProps {
  branch: BranchWithAggregates;
  isManager: boolean;
  onOpenDetail: () => void;
}

function formatCedi(n: number): string {
  return `GH₵${n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function BranchCard({ branch, isManager, onOpenDetail }: BranchCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const country = getCountryByCode(branch.country_code as any);
  const displayName = branch.name?.trim() || "Unnamed branch";
  const lastActivity = branch.last_activity_date
    ? formatDistanceToNow(new Date(branch.last_activity_date), {
        addSuffix: true,
      })
    : "No activity yet";

  return (
    <>
      <Card
        className="group flex h-full cursor-pointer flex-col p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
        onClick={onOpenDetail}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-sm font-semibold text-muted-foreground">
              {(displayName[0] ?? "?").toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-semibold leading-tight">
                {displayName}
              </h3>
              <p className="text-muted-foreground mt-0.5 truncate text-xs">
                {branch.city}
                {country ? ` · ${country.flag}` : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                branch.is_active ? "bg-emerald-500" : "bg-muted-foreground/40"
              }`}
              title={branch.is_active ? "Active" : "Inactive"}
            />
            {isManager && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" /> Edit branch
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* hero readout */}
        <div className="mt-6">
          <div className="text-[28px] font-semibold leading-none tracking-tight tabular-nums">
            {formatCedi(branch.credit_issued_this_month)}
          </div>
          <div className="text-muted-foreground mt-1.5 text-xs">credit issued this month</div>
        </div>

        {/* quiet secondary line */}
        <div className="text-muted-foreground mt-4 flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {branch.staff_count} staff
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5" />
            {branch.customer_count.toLocaleString()} customers
          </span>
        </div>

        <div className="text-muted-foreground mt-auto pt-5 text-[11px]">
          Last activity {lastActivity}
        </div>
      </Card>

      <BranchEditDialog
        branch={branch}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}