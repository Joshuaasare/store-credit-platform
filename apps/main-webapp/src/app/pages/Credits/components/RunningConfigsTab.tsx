import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Wallet } from "lucide-react";
import { Button, Skeleton } from "@store-credit-platform/web-components";
import { creditConfigService } from "@store-credit-platform/api-services";
import { isApiError } from "@shared/utils/api.utils";
import { RunningConfigCard } from "./RunningConfigCard";
import { RunningConfigDialog } from "./RunningConfigDialog";

interface RunningConfigsTabProps {
  isManager: boolean;
}

export function RunningConfigsTab({ isManager }: RunningConfigsTabProps) {
  const [createOpen, setCreateOpen] = useState(false);

  const query = useQuery({
    queryKey: ["credit-configs", "running"],
    queryFn: async () => {
      const res = await creditConfigService.listRunningConfigs();
      if (isApiError(res)) throw new Error(res.error);
      return res.data;
    },
  });

  return (
    <div className="space-y-4">
      {isManager && (
        <div className="flex justify-end">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New running config
          </Button>
        </div>
      )}

      {query.isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      )}

      {query.isError && (
        <div className="bg-card text-destructive rounded-xl border p-6 text-sm">
          Failed to load running configs:{" "}
          {query.error instanceof Error
            ? query.error.message
            : "Unknown error"}
        </div>
      )}

      {query.data && query.data.length === 0 && (
        <div className="bg-card flex flex-col items-center gap-2 rounded-xl border p-10 text-center">
          <Wallet className="text-muted-foreground h-6 w-6" />
          <h3 className="text-sm font-semibold">No running configs yet</h3>
          <p className="text-muted-foreground max-w-sm text-xs">
            Running configs auto-issue credit whenever a customer&rsquo;s
            cumulative spend crosses the threshold you set.
          </p>
          {isManager && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-1 h-4 w-4" />
              Create your first config
            </Button>
          )}
        </div>
      )}

      {query.data && query.data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {query.data.map((c) => (
            <RunningConfigCard key={c.config_group_id} config={c} isManager={isManager} />
          ))}
        </div>
      )}

      <RunningConfigDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}