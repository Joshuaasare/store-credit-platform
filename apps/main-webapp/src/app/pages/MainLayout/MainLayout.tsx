import { LayoutDashboard, Wallet, User } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { cn, useIsMobile } from "@store-credit-platform/web-components";

export const routes = {
  DASHBOARD: "/dashboard",
  CREDITS: "/credits",
  PROFILE: "/profile",
};

const navItems = [
  { title: "Dashboard", url: routes.DASHBOARD, icon: LayoutDashboard },
  { title: "Credits", url: routes.CREDITS, icon: Wallet },
  { title: "Profile", url: routes.PROFILE, icon: User },
];

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <div className="relative flex min-h-screen flex-col">
      <main className="flex-1 bg-background text-foreground pb-24">
        <Outlet />
      </main>

      {isMobile ? (
        /* Mobile: liquid glass bottom tab navigator */
        <nav
          className={cn(
            "fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm",
            "flex items-center justify-around",
            "rounded-full border border-white/50 bg-white/40 backdrop-blur-2xl",
            "shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.6)]",
            "transition-all duration-500 ease-out",
            "dark:border-white/25 dark:bg-slate-900/50 dark:shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15)]"
          )}
          aria-label="Primary navigation"
        >
          {navItems.map((item) => {
            const isActive = location.pathname === item.url;
            const Icon = item.icon;
            return (
              <button
                key={item.url}
                onClick={() => navigate(item.url)}
                className={cn(
                  "group relative flex flex-1 flex-col items-center justify-center gap-1 rounded-full py-3 transition-all duration-500 ease-out",
                  "min-w-[4rem] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <span
                    className={cn(
                      "absolute inset-x-2 inset-y-1 rounded-full transition-all duration-500 ease-out",
                      "bg-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-sm",
                      "dark:bg-white/30 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                    )}
                  />
                )}
                <Icon
                  className={cn(
                    "relative z-10 h-5 w-5 transition-transform duration-300",
                    isActive && "scale-110"
                  )}
                />
                <span className="relative z-10 text-[10px] font-medium tracking-wide">
                  {item.title}
                </span>
              </button>
            );
          })}
        </nav>
      ) : (
        /* Web: prominent bottom button bar with hover animations */
        <nav
          className={cn(
            "fixed bottom-6 left-1/2 z-50 -translate-x-1/2",
            "flex items-center gap-2",
            "rounded-2xl border border-white/40 bg-white/35 p-2",
            "shadow-[0_12px_40px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.5)]",
            "backdrop-blur-2xl transition-all duration-500 ease-out",
            "dark:border-white/20 dark:bg-slate-900/40 dark:shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.12)]"
          )}
          aria-label="Primary navigation"
        >
          {navItems.map((item) => {
            const isActive = location.pathname === item.url;
            const Icon = item.icon;
            return (
              <button
                key={item.url}
                onClick={() => navigate(item.url)}
                className={cn(
                  "group relative flex items-center gap-2.5 overflow-hidden rounded-xl px-5 py-3.5 text-sm font-semibold",
                  "cursor-pointer outline-none transition-all duration-500 ease-out",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-white/50 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-md dark:bg-white/25 dark:text-white"
                    : "bg-transparent text-muted-foreground hover:bg-white/40 hover:text-foreground hover:shadow-lg hover:scale-105 dark:hover:bg-white/20"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all duration-300",
                    !isActive && "group-hover:scale-110"
                  )}
                />
                <span className="relative">{item.title}</span>
                {isActive && (
                  <span className="absolute inset-0 rounded-xl ring-1 ring-white/60 dark:ring-white/30" />
                )}
                {!isActive && (
                  <span
                    className={cn(
                      "absolute inset-0 rounded-xl opacity-0 transition-opacity duration-500",
                      "group-hover:opacity-100",
                      "bg-white/30 dark:bg-white/10"
                    )}
                  />
                )}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
