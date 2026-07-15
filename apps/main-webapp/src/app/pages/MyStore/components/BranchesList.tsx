import { Plus } from "lucide-react";
import { Button, Card, Skeleton } from "@store-credit-platform/web-components";
import { BranchWithAggregates } from "@shared/types/api.types";
import { useState } from "react";
import { BranchCard } from "./BranchCard";
import { BranchEditDialog } from "./BranchEditDialog";
import { BranchDetailDialog } from "./BranchDetailDialog";

interface BranchesListProps {
  branches: BranchWithAggregates[];
  isManager: boolean;
  loading: boolean;
}

export function BranchesList({ branches, isManager, loading }: BranchesListProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [detailBranch, setDetailBranch] = useState<BranchWithAggregates | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-semibold tracking-tight">Branches</h2>
          <span className="inline-flex h-5 items-center rounded-full border bg-muted/50 px-2 text-[11px] font-medium text-muted-foreground tabular-nums">
            {branches.length}
          </span>
        </div>
        {isManager && (
          <BranchEditDialog open={editOpen} onOpenChange={setEditOpen}>
            <Button size="sm" onClick={() => setEditOpen(true)} className="shadow-sm">
              <Plus className="mr-1.5 h-4 w-4" /> Add branch
            </Button>
          </BranchEditDialog>
        )}
      </div>

      {loading && branches.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : branches.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {isManager ? "No branches yet" : "No branch assigned"}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {isManager
                ? "Add your first branch to start issuing credit."
                : "Contact your admin to be assigned to a branch."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {branches.map((branch, i) => (
            <div
              key={branch.id}
              className="animate-fade-in-up motion-reduce:animate-none"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <BranchCard
                branch={branch}
                isManager={isManager}
                onOpenDetail={() => setDetailBranch(branch)}
              />
            </div>
          ))}
        </div>
      )}

      <BranchDetailDialog
        branch={detailBranch}
        onOpenChange={(open) => !open && setDetailBranch(null)}
      />
    </div>
  );
}