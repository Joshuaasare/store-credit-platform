import { Store, Wallet, UserRound } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { cn, useIsMobile, Toaster } from "@store-credit-platform/web-components";
import { useTheme } from "../../shared/providers/ThemeProvider";
import { ThemeToggle } from "../../components/ThemeToggle/ThemeToggle";

export const routes = {
  MY_STORE: "/",
  CREDITS: "/credits",
  PROFILE: "/profile",
};

const navItems = [
  { title: "My Store", url: routes.MY_STORE, icon: Store },
  { title: "Credits", url: routes.CREDITS, icon: Wallet },
  { title: "Profile", url: routes.PROFILE, icon: UserRound },
];

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { theme } = useTheme();

  const isLight = theme === "light";
  // "/" should match only when exactly on the index route; sub-paths fall back to no match.
  const activeIndex = navItems.findIndex((i) =>
    i.url === "/" ? location.pathname === "/" : location.pathname.startsWith(i.url),
  );

  // Shared surface treatment — mirrors the StoreHero: primary-tinted gradient,
  // ring, blur, and a decorative primary blob. Token-driven so it adapts to both
  // light and slate themes automatically.
  const surfaceGradient = "bg-gradient-to-br from-primary/10 via-card to-card";
  const surfaceRing = "ring-1 ring-primary/10";
  const shadow = isLight
    ? "shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
    : "shadow-[0_8px_30px_rgba(0,0,0,0.45)]";

  return (
    <div className="relative flex min-h-screen flex-col">
      <Toaster richColors position="top-right" />
      <ThemeToggle />
      <main className={cn("bg-background text-foreground flex-1")}>
        <Outlet />
      </main>

      {isMobile ? (
        /* Mobile: liquid-glass bottom tab navigator — hero-styled */
        <nav
          className={cn(
            "fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm",
            "flex items-center justify-around",
            "rounded-full border backdrop-blur-2xl",
            "transition-all duration-500 ease-out",
            surfaceGradient,
            surfaceRing,
            shadow,
          )}
          aria-label="Primary navigation"
        >
          {/* decorative primary blob */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-primary/20 blur-2xl"
          />
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
                      "absolute inset-x-2 inset-y-1 rounded-full backdrop-blur-sm transition-all duration-500 ease-out",
                      "bg-primary/15 ring-1 ring-primary/20",
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
        /* Web: modern floating left-side navigator — hero-styled */
        <nav
          className={cn(
            "group/nav fixed left-4 top-5 z-50",
            "flex flex-col items-start gap-2",
            "w-[4.5rem] hover:w-44",
            "rounded-2xl border px-2 py-3",
            shadow,
            surfaceRing,
            "transition-[width] duration-300 ease-out",
            "overflow-hidden",
            surfaceGradient,
          )}
          aria-label="Primary navigation"
        >
          {/* decorative primary blob */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full bg-primary/15 blur-2xl"
          />
          {navItems.map((item, index) => {
            const isActive = index === activeIndex;
            const Icon = item.icon;
            return (
              <button
                key={item.url}
                onClick={() => navigate(item.url)}
                className={cn(
                  "relative flex w-full items-center gap-3 rounded-xl outline-none",
                  "px-2 py-2.5",
                  "cursor-pointer transition-colors duration-200",
                  "focus-visible:ring-2",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Active left-edge indicator */}
                {isActive && (
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full transition-all duration-300",
                      "bg-primary",
                    )}
                  />
                )}

                {/* Ring container with icon — hero-avatar style when active */}
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
                    isActive
                      ? "bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20"
                      : "bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] transition-all duration-300",
                      isActive ? "scale-110 stroke-[2.5]" : "stroke-[1.5]",
                    )}
                  />
                </span>

                {/* Label — hidden until hover */}
                <span
                  className={cn(
                    "whitespace-nowrap text-sm font-medium tracking-wide",
                    "opacity-0 transition-all duration-200 group-hover/nav:opacity-100",
                    "translate-x-[-4px] group-hover/nav:translate-x-0",
                  )}
                >
                  {item.title}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}