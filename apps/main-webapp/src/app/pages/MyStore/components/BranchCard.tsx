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
import { CountryFlag } from "@shared/components/CountryFlag/CountryFlag";
import { formatGHSCompact } from "@shared/utils/format";
import { BranchEditDialog } from "./BranchEditDialog";

interface BranchCardProps {
  branch: BranchWithAggregates;
  isManager: boolean;
  onOpenDetail: () => void;
}

export function BranchCard({
  branch,
  isManager,
  onOpenDetail,
}: BranchCardProps) {
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
        className="border-primary/60 hover:border-primary group flex h-full cursor-pointer flex-col p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
        onClick={onOpenDetail}
      >
        {/* Caption */}
        <div className="text-muted-foreground flex items-center justify-between text-[11px] font-medium uppercase tracking-wide">
          <span>Credit issued this month</span>
          {isManager && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground h-6 w-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
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

        {/* Hero number */}
        <div className="mt-2 text-[32px] font-semibold tabular-nums leading-none tracking-tight">
          {formatGHSCompact(branch.credit_issued_this_month)}
        </div>

        {/* Divider + branch identity row */}
        <div className="border-primary/30 mt-5 border-t pt-4">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold leading-tight">
              {displayName}
            </h3>
            <span
              className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                branch.is_active ? "bg-emerald-500" : "bg-muted-foreground/40"
              }`}
              title={branch.is_active ? "Active" : "Inactive"}
            />
          </div>
          <div className="text-muted-foreground mt-1 flex items-center gap-1.5 truncate text-xs">
            {country && (
              <CountryFlag
                code={branch.country_code as never}
                size={12}
                title={country.name}
                className="shrink-0 rounded-[2px]"
              />
            )}
            <span className="truncate">
              {branch.city}
              {country ? `, ${country.name}` : ""}
            </span>
          </div>
        </div>

        {/* Footer meta */}
        <div className="text-muted-foreground mt-auto space-y-2 pt-5 text-xs">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 stroke-[1.75]" />
              {branch.staff_count} staff
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5 stroke-[1.75]" />
              {branch.customer_count.toLocaleString()} customers
            </span>
          </div>
          <div className="text-[11px]">Last activity {lastActivity}</div>
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
