import { MoreVertical, Pencil, MapPin, Phone, Users, UserRound, Coins } from "lucide-react";
import {
  Badge,
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
        className="group relative h-full cursor-pointer overflow-hidden p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
        onClick={onOpenDetail}
      >
        {/* left accent strip */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary/60 to-primary/20 opacity-0 transition-opacity group-hover:opacity-100"
        />

        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-semibold text-primary ring-1 ring-primary/15">
              {(displayName[0] ?? "?").toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold leading-tight">
                {displayName}
              </h3>
              <p className="text-muted-foreground truncate text-xs">
                {branch.city}
                {country ? ` ${country.flag}` : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Badge
              variant={branch.is_active ? "default" : "secondary"}
              className="gap-1"
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  branch.is_active ? "bg-emerald-500" : "bg-muted-foreground"
                }`}
              />
              {branch.is_active ? "Active" : "Inactive"}
            </Badge>
            {isManager && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
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
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="text-muted-foreground mt-4 space-y-1.5 text-xs">
          {branch.address && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0" /> {branch.address}
            </div>
          )}
          {branch.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0" /> {branch.phone}
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3">
          <Stat icon={Users} label="Staff" value={String(branch.staff_count)} />
          <Stat
            icon={UserRound}
            label="Customers"
            value={branch.customer_count.toLocaleString()}
          />
          <Stat
            icon={Coins}
            label="This month"
            value={formatCedi(branch.credit_issued_this_month)}
            accent
          />
        </div>

        <p className="text-muted-foreground mt-3 flex items-center gap-1 text-[11px]">
          <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground/50" />
          Last activity {lastActivity}
        </p>
      </Card>

      <BranchEditDialog
        branch={branch}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <span
        className={`mt-0.5 truncate text-sm font-semibold tabular-nums ${
          accent ? "text-primary" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function formatCedi(n: number): string {
  return `GH₵${n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}