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
        /* Web: clean floating pill tab bar matching the reference image */
        <nav
          className={cn(
            "fixed bottom-6 left-1/2 z-50 -translate-x-1/2",
            "flex items-stretch",
            "rounded-[2rem] bg-white px-2",
            "ring-primary/20 shadow-primary/10 ring-1",
            "dark:bg-slate-900 dark:ring-white/10",
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
                  "relative flex flex-col items-center justify-center gap-1",
                  "min-w-[6rem] cursor-pointer rounded-full outline-none",
                  "py-4 transition-colors duration-300",
                  "focus-visible:ring-primary/40 focus-visible:ring-2 focus-visible:ring-offset-2",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Icon */}
                <Icon
                  className={cn(
                    "h-6 w-6 transition-all duration-300",
                    isActive ? "scale-110 stroke-[2.5]" : "stroke-[1.5]",
                  )}
                />

                {/* Label */}
                {/* <span className="text-[11px] font-semibold leading-none tracking-wide">
                  {item.title}
                </span> */}

                {/* <span
                  className={cn(
                    "bg-primary mt-0.5 h-1.5 w-1.5 rounded-full transition-all duration-300",
                    isActive ? "scale-100 opacity-100" : "scale-0 opacity-0",
                  )}
                /> */}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
