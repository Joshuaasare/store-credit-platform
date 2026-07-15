import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@store-credit-platform/web-components";

const TABS = [
  { value: "leaderboard", label: "Leaderboard" },
  { value: "transactions", label: "Transactions" },
] as const;

export default function Customers() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = (() => {
    const segments = location.pathname.split("/").filter(Boolean);
    // ["customers", "transactions"] -> "transactions"; default -> "leaderboard"
    if (segments[1] === "transactions") return "transactions";
    return "leaderboard";
  })();

  const onTabChange = (value: string) => {
    navigate(`/customers/${value}`);
  };

  return (
    <div className="relative min-h-screen bg-background px-4 py-6 md:px-8 md:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/5 to-transparent"
      />
      <div className="relative mx-auto max-w-7xl space-y-6">
        {/* Hero header strip */}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Customers</h1>
          <p className="text-muted-foreground text-sm">
            Track your top customers and every purchase, credit issue, and redemption.
          </p>
        </div>

        {/* Top tabs */}
        <Tabs
          value={activeTab}
          onValueChange={onTabChange}
          className="w-full"
        >
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="px-4">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Tab content via nested routes */}
        <Outlet />
      </div>
    </div>
  );
}