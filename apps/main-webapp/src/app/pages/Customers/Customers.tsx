import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { Users } from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@store-credit-platform/web-components";

const TABS = [
  { value: "transactions", label: "Transactions" },
  { value: "leaderboard", label: "Leaderboard" },
] as const;

export default function Customers() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = (() => {
    const segments = location.pathname.split("/").filter(Boolean);
    // ["customers", "leaderboard"] -> "leaderboard"; default -> "transactions"
    if (segments[1] === "leaderboard") return "leaderboard";
    return "transactions";
  })();

  const onTabChange = (value: string) => {
    navigate(`/customers/${value}`);
  };

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
              <Users className="h-6 w-6 stroke-[1.75]" />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
              <p className="text-muted-foreground text-sm">
                Track your top customers and every purchase, credit issue, and
                redemption.
              </p>
            </div>
          </div>
        </div>

        {/* Top tabs */}
        <Tabs
          value={activeTab}
          onValueChange={onTabChange}
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

        {/* Tab content via nested routes */}
        <Outlet />
      </div>
    </div>
  );
}
