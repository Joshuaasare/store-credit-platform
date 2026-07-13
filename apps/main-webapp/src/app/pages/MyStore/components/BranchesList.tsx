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
        <div>
          <h2 className="text-lg font-semibold">Branches</h2>
          <p className="text-muted-foreground text-xs">
            {branches.length} {branches.length === 1 ? "branch" : "branches"}
          </p>
        </div>
        {isManager && (
          <BranchEditDialog open={editOpen} onOpenChange={setEditOpen}>
            <Button size="sm" onClick={() => setEditOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add branch
            </Button>
          </BranchEditDialog>
        )}
      </div>

      {loading && branches.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : branches.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground text-sm">
            {isManager
              ? "No branches yet. Add your first branch."
              : "No branch assigned."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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