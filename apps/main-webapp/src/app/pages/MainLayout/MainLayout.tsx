import { LayoutDashboard, Wallet, UsersRound, Settings } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { cn, useIsMobile } from "@store-credit-platform/web-components";

export const routes = {
  DASHBOARD: "/dashboard",
  CREDITS: "/credits",
  PROFILE: "/profile",
  USERS: "/users",
  SETTINGS: "/settings",
};

const navItems = [
  { title: "Dashboard", url: routes.DASHBOARD, icon: LayoutDashboard },
  { title: "Credits", url: routes.CREDITS, icon: Wallet },
  { title: "Users", url: routes.USERS, icon: UsersRound },
  { title: "Settings", url: routes.SETTINGS, icon: Settings },
];

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const activeIndex = navItems.findIndex((i) => i.url === location.pathname);

  return (
    <div className="relative flex min-h-screen flex-col">
      <main className="bg-background text-foreground flex-1">
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
            "dark:border-white/25 dark:bg-slate-900/50 dark:shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15)]",
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
                  "focus-visible:ring-ring min-w-[4rem] cursor-pointer outline-none focus-visible:ring-2",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <span
                    className={cn(
                      "absolute inset-x-2 inset-y-1 rounded-full transition-all duration-500 ease-out",
                      "bg-white/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-sm",
                      "dark:bg-white/30 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
                    )}
                  />
                )}
                <Icon
                  className={cn(
                    "relative z-10 h-5 w-5 transition-transform duration-300",
                    isActive && "scale-110",
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
        /* Web: floating pill tab bar — icon in ring, label below */
        <nav
          className={cn(
            "fixed bottom-6 left-1/2 z-50 -translate-x-1/2",
            "flex items-start gap-1",
            "rounded-[2rem] bg-white py-2",
            "shadow-[0_8px_30px_rgba(0,0,0,0.12)]",
            "ring-1 ring-black/5",
          )}
          aria-label="Primary navigation"
        >
          {navItems.map((item, index) => {
            const isActive = index === activeIndex;
            const Icon = item.icon;
            return (
              <button
                key={item.url}
                onClick={() => navigate(item.url)}
                className={cn(
                  "group relative flex flex-col items-center gap-1.5",
                  "min-w-[5.5rem] cursor-pointer outline-none",
                  "rounded-2xl px-2 pb-1 pt-1",
                  "transition-colors duration-300",
                  "focus-visible:ring-primary/40 focus-visible:ring-2",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Ring container with icon */}
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    "transition-all duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground group-hover:bg-muted/80",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-all duration-300",
                      isActive ? "scale-110 stroke-[2.5]" : "stroke-[1.5]",
                    )}
                  />
                </span>
                <span className="sr-only">{item.title}</span>

                {/* Label outside the ring */}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
