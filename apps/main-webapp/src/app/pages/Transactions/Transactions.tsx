import { useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@store-credit-platform/web-components";
import { PageHeader } from "@shared/components/PageHeader";

const TABS = [
  { value: "transactions", label: "Transactions" },
  { value: "leaderboard", label: "Leaderboard" },
] as const;

export default function Transactions() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = (() => {
    const segments = location.pathname.split("/").filter(Boolean);
    if (segments[1] === "leaderboard") return "leaderboard";
    return "transactions";
  })();

  const onTabChange = (value: string) => {
    navigate(value === "transactions" ? "/transactions" : `/transactions/${value}`);
  };

  return (
    <div className="relative min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div className="relative mx-auto max-w-7xl space-y-8">
        {/* Page header */}
        <PageHeader
          title="Transactions"
          subtitle="Track every purchase, credit issue, and redemption across your branches."
        >
          <Tabs
            value={activeTab}
            onValueChange={onTabChange}
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

        {/* Tab content via nested routes */}
        <Outlet />
      </div>
    </div>
  );
}
