import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Plus } from "lucide-react";
import { Button, Skeleton } from "@store-credit-platform/web-components";
import { creditConfigService } from "@store-credit-platform/api-services";
import { isApiError } from "@shared/utils/api.utils";
import { FixedConfigCard } from "./FixedConfigCard";
import { FixedConfigDialog } from "./FixedConfigDialog";

interface FixedConfigsTabProps {
  isManager: boolean;
}

export function FixedConfigsTab({ isManager }: FixedConfigsTabProps) {
  const [createOpen, setCreateOpen] = useState(false);

  const query = useQuery({
    queryKey: ["credit-configs", "fixed"],
    queryFn: async () => {
      const res = await creditConfigService.listFixedConfigs();
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
            New fixed promo
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
          Failed to load fixed promos:{" "}
          {query.error instanceof Error ? query.error.message : "Unknown error"}
        </div>
      )}

      {query.data && query.data.length === 0 && (
        <div className="bg-card flex flex-col items-center gap-2 rounded-xl border p-10 text-center">
          <CalendarClock className="text-muted-foreground h-6 w-6" />
          <h3 className="text-sm font-semibold">No promo banners yet</h3>
          <p className="text-muted-foreground max-w-sm text-xs">
            Promotional banners with a title, description, and images shown to
            customers across selected branches.
          </p>
          {isManager && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-1 h-4 w-4" />
              Create your first promo
            </Button>
          )}
        </div>
      )}

      {query.data && query.data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {query.data.map((c) => (
            <FixedConfigCard key={c.id} config={c} isManager={isManager} />
          ))}
        </div>
      )}

      <FixedConfigDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}