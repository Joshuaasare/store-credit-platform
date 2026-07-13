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
        className="group h-full cursor-pointer p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
        onClick={onOpenDetail}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
              {(displayName[0] ?? "?").toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-tight">{displayName}</h3>
              <p className="text-muted-foreground text-xs">
                {branch.city}
                {country ? ` ${country.flag}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant={branch.is_active ? "default" : "secondary"}>
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
              <MapPin className="h-3.5 w-3.5" /> {branch.address}
            </div>
          )}
          {branch.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" /> {branch.phone}
            </div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-xs">
          <Stat icon={Users} label="Staff" value={branch.staff_count} />
          <Stat icon={UserRound} label="Customers" value={branch.customer_count} />
          <Stat
            icon={Coins}
            label="This month"
            value={branch.credit_issued_this_month}
          />
        </div>

        <p className="text-muted-foreground mt-3 text-[11px]">
          Last activity: {lastActivity}
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
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <span className="mt-0.5 font-semibold tabular-nums">
        {value.toLocaleString()}
      </span>
    </div>
  );
}