import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button, Card, Skeleton } from "@store-credit-platform/web-components";
import { useAuthStore } from "@shared/stores/authStore";
import { useStoreStore } from "@shared/stores/storeStore";
import { StoreHero } from "./components/StoreHero";
import { StoreStatsRow } from "./components/StoreStatsRow";
import { PoolStatusCard } from "./components/PoolStatusCard";
import { BranchesList } from "./components/BranchesList";

export default function MyStorePage() {
  const user = useAuthStore((s) => s.user);
  const { merchant, branches, loading, error, fetchStore } = useStoreStore();

  useEffect(() => {
    void fetchStore();
  }, [fetchStore]);

  const isManager = (user?.roles ?? []).some((r) => r.role === "manager");
  const cashierBranchId = user?.branch_id ?? null;
  const visibleBranches = isManager
    ? branches
    : branches.filter((b) => b.id === cashierBranchId);

  if (loading && !merchant) {
    return <MyStoreSkeleton />;
  }

  if (error && !merchant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md p-6 text-center">
          <h2 className="text-lg font-semibold">Couldn&rsquo;t load your store</h2>
          <p className="text-muted-foreground mt-2 text-sm">{error}</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void fetchStore()}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </Card>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="max-w-md p-6 text-center">
          <h2 className="text-lg font-semibold">No store assigned</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            We couldn&rsquo;t find your store. Contact your admin to be assigned.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background px-4 py-6 md:px-8 md:py-10">
      {/* subtle page-top gradient anchor */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/5 to-transparent"
      />
      <div className="relative mx-auto max-w-7xl space-y-8">
        <StoreHero merchant={merchant} isManager={isManager} />

        <StoreStatsRow merchant={merchant} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <BranchesList
              branches={visibleBranches}
              isManager={isManager}
              loading={loading}
            />
          </div>
          {isManager && (
            <div className="lg:col-span-1">
              <PoolStatusCard
                used={merchant.credit_pool_used}
                limit={merchant.credit_pool_limit}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MyStoreSkeleton() {
  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-8 md:py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-48 rounded-2xl lg:col-span-1" />
        </div>
      </div>
    </div>
  );
}