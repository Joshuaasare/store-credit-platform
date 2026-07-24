import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@store-credit-platform/web-components";
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

  const isManager = (user?.roles ?? []).some((r) => r.role === "manager");

  return (
    <div className="relative min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div
        aria-hidden
        className="from-primary/5 pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b to-transparent"
      />
      <div className="relative mx-auto max-w-7xl space-y-6">
        {/* Hero header card */}
        <div className="bg-card animate-fade-in-up relative overflow-hidden rounded-2xl border p-6 shadow-sm motion-reduce:animate-none">
          <div
            aria-hidden
            className="from-primary/25 via-primary/10 pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br to-transparent blur-2xl"
          />
          <div
            aria-hidden
            className="from-primary/20 via-primary/5 pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-gradient-to-br to-transparent blur-2xl"
          />
          <div className="relative flex items-start gap-4">
            <div className="from-primary to-primary/70 text-primary-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm">
              <Wallet className="h-6 w-6 stroke-[1.75]" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">Credit configs</h1>
              <p className="text-muted-foreground text-sm">
                Configure automatic cashback thresholds and time-bound
                promotional registries across your branches.
              </p>
            </div>
          </div>
        </div>

        {/* Top tabs */}
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as TabValue)}
          className="animate-fade-in-up w-full motion-reduce:animate-none"
          style={{ animationDelay: "60ms" }}
        >
          <TabsList className="bg-muted/40 rounded-lg border p-0.5">
            {TABS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-sm px-4"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

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