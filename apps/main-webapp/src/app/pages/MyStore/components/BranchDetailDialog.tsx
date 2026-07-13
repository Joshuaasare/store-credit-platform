import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@store-credit-platform/web-components";
import { BranchWithAggregates } from "@shared/types/api.types";
import { getCountryByCode } from "@shared/utils/countries";

interface BranchDetailDialogProps {
  branch: BranchWithAggregates | null;
  onOpenChange: (open: boolean) => void;
}

export function BranchDetailDialog({ branch, onOpenChange }: BranchDetailDialogProps) {
  const open = branch !== null;
  const country = branch ? getCountryByCode(branch.country_code as any) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{branch?.name?.trim() || "Unnamed branch"}</DialogTitle>
          <DialogDescription>
            Branch details and current aggregates.
          </DialogDescription>
        </DialogHeader>
        {branch && (
          <div className="space-y-3 text-sm">
            <Row label="City" value={branch.city} />
            <Row label="Country" value={country ? `${country.name} ${country.flag}` : branch.country_code} />
            <Row label="Address" value={branch.address ?? "—"} />
            <Row label="Phone" value={branch.phone ?? "—"} />
            <Row label="Status" value={branch.is_active ? "Active" : "Inactive"} />
            <div className="border-t pt-3">
              <Row label="Staff count" value={String(branch.staff_count)} />
              <Row label="Customer count" value={String(branch.customer_count)} />
              <Row
                label="Credit issued this month"
                value={branch.credit_issued_this_month.toLocaleString()}
              />
              <Row
                label="Last activity"
                value={
                  branch.last_activity_date
                    ? new Date(branch.last_activity_date).toLocaleString()
                    : "No activity yet"
                }
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}