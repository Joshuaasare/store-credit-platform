import { useEffect, useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@store-credit-platform/web-components";
import { PageHeader } from "@shared/components/PageHeader";
import { useAuthStore } from "@shared/stores/authStore";
import { useStoreStore } from "@shared/stores/storeStore";
import { RunningConfigsTab } from "./components/RunningConfigsTab";
import { FixedConfigsTab } from "./components/FixedConfigsTab";

const TABS = [
  { value: "running", label: "Running configs" },
  { value: "fixed", label: "Fixed promos" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export default function CreditsPage() {
  const user = useAuthStore((s) => s.user);
  const { ensureStoreLoaded } = useStoreStore();
  const [tab, setTab] = useState<TabValue>("running");

  useEffect(() => {
    void ensureStoreLoaded();
  }, [ensureStoreLoaded]);

  const isManager = user?.role === "manager";

  return (
    <div className="relative min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="relative mx-auto max-w-7xl space-y-8">
        {/* Page header */}
        <PageHeader
          title="Credit configs"
          subtitle="Configure automatic cashback thresholds and time-bound promotional registries across your branches."
        >
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as TabValue)}
            className="w-full"
          >
            <TabsList className="bg-muted/40 h-9 rounded-lg border p-0.5">
              {TABS.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-sm px-4 text-sm"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </PageHeader>

        {/* Tab content inline (no nested routes — simpler than Customers) */}
        <div className="animate-fade-in-up motion-reduce:animate-none" style={{ animationDelay: "120ms" }}>
          {tab === "running" ? (
            <RunningConfigsTab isManager={isManager} />
          ) : (
            <FixedConfigsTab isManager={isManager} />
          )}
        </div>
      </div>
    </div>
  );
}