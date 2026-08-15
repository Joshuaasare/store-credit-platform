import { useEffect, useState } from "react";
import {
  Menu,
  Store,
  Wallet,
  UserRound,
  X,
  Receipt,
  Users,
  UserCog,
  Ticket,
} from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  cn,
  useIsMobile,
  Toaster,
} from "@store-credit-platform/web-components";
import { useTheme } from "@shared/providers/ThemeProvider";
import { ThemeToggle } from "@shared/components/ThemeToggle/ThemeToggle";
import { useStoreStore } from "@shared/stores/storeStore";
import { StaffRoleValues } from "@shared/types/api.types";
import {
  isActionOrRoutePermitted,
  RoleRestriction,
} from "@shared/utils/permissions.utils";
import { useAuthStore } from "@shared/stores/authStore";

export type MenuItem = {
  title: string;
  url: string;
  icon?: any;
  items?: MenuItem[];
  permissions?: StaffRoleValues[];
  roleRestrictions?: RoleRestriction[];
};

export const routes = {
  MY_STORE: "/",
  CREDITS: "/credits",
  TRANSACTIONS: "/transactions",
  CUSTOMERS: "/customers",
  REDEMPTIONS: "/redemptions",
  STAFF: "/staff",
  PROFILE: "/profile",
};

const navItems: MenuItem[] = [
  {
    title: "My Store",
    url: routes.MY_STORE,
    icon: Store,
    permissions: ["manager"],
  },
  {
    title: "Credits",
    url: routes.CREDITS,
    icon: Wallet,
    permissions: ["manager"],
  },
  {
    title: "Transactions",
    url: routes.TRANSACTIONS,
    icon: Receipt,
    permissions: ["cashier", "manager"],
  },
  {
    title: "Customers",
    url: routes.CUSTOMERS,
    icon: Users,
    permissions: ["manager"],
  },
  {
    title: "Redemptions",
    url: routes.REDEMPTIONS,
    icon: Ticket,
    permissions: ["manager"],
  },
  {
    title: "Staff",
    url: routes.STAFF,
    icon: UserCog,
    permissions: ["manager"],
  },
  { title: "Profile", url: routes.PROFILE, icon: UserRound },
];

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { theme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuthStore();
  const ensureStoreLoaded = useStoreStore((s) => s.ensureStoreLoaded);

  // Bootstrap shared store data once per authenticated session so every
  // child route (My Store, Customers, etc.) sees populated merchant + branches
  // regardless of which route is the entry point.
  useEffect(() => {
    void ensureStoreLoaded();
  }, [ensureStoreLoaded]);

  const isLight = theme === "light";
  // "/" should match only when exactly on the index route; sub-paths fall back to no match.
  const activeIndex = navItems.findIndex((i) =>
    i.url === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(i.url),
  );

  // Shared surface treatment — mirrors the StoreHero: primary-tinted gradient,
  // ring, blur, and a decorative primary blob. Token-driven so it adapts to both
  // light and slate themes automatically.
  const surfaceGradient = "bg-gradient-to-br from-primary/10 via-card to-card";
  const surfaceRing = "ring-1 ring-primary/10";
  const shadow = isLight
    ? "shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
    : "shadow-[0_8px_30px_rgba(0,0,0,0.45)]";

  // Close the mobile menu on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close on Escape.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const hamburgerButtonClass = cn(
    "fixed left-4 top-5 z-[60] flex h-11 w-11 items-center justify-center rounded-2xl border",
    surfaceGradient,
    surfaceRing,
    "backdrop-blur-2xl transition-all hover:border-primary/30 hover:shadow-md",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring",
    isLight
      ? "shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
      : "shadow-[0_8px_30px_rgba(0,0,0,0.45)]",
  );

  const renderRoute = (item: MenuItem, index: number) => {
    const isActive = index === activeIndex;
    const Icon = item.icon;
    return (
      isActionOrRoutePermitted(user?.role, item.permissions) && (
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

          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
              isActive
                ? "from-primary/20 to-primary/5 text-primary ring-primary/20 bg-gradient-to-br ring-1"
                : "bg-muted/60 text-muted-foreground",
            )}
          >
            <Icon
              className={cn(
                "h-[18px] w-[18px] transition-all duration-300",
                isActive ? "scale-110 stroke-[2.5]" : "stroke-[1.5]",
              )}
            />
          </span>

          <span className="whitespace-nowrap text-sm font-medium tracking-wide">
            {item.title}
          </span>
        </button>
      )
    );
  };

  return (
    <div className="relative flex min-h-screen flex-col">
      <Toaster richColors position="top-right" />
      <ThemeToggle />

      <main className={cn("text-foreground flex-1", isMobile && "pt-20")}>
        <Outlet />
      </main>

      {isMobile ? (
        <>
          {/* Floating glassmorphic hamburger — top-left */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className={hamburgerButtonClass}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            title={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? (
              <X className="text-foreground h-5 w-5 transition-transform duration-300" />
            ) : (
              <Menu className="text-foreground h-5 w-5 transition-transform duration-300" />
            )}
          </button>

          {/* Backdrop dims the rest of the page when the menu is open */}
          {mobileOpen && (
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              onClick={() => setMobileOpen(false)}
              className="animate-in fade-in-0 fixed inset-0 z-50 bg-black/50 backdrop-blur-sm duration-200"
            />
          )}

          {/* Expanded glassmorphic menu — overlaps content, mirrors the web nav styling */}
          <nav
            className={cn(
              "fixed left-4 top-20 z-[60] flex w-56 flex-col items-start gap-2 rounded-2xl border px-2 py-3",
              "bg-card/80",
              surfaceRing,
              "overflow-hidden backdrop-blur-2xl",
              isLight
                ? "shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                : "shadow-[0_8px_30px_rgba(0,0,0,0.45)]",
              "transition-all duration-300 ease-out",
              mobileOpen
                ? "animate-in fade-in-0 slide-in-from-top-2 translate-y-0 opacity-100"
                : "pointer-events-none absolute -translate-y-2 opacity-0",
            )}
            aria-label="Primary navigation"
            aria-hidden={!mobileOpen}
          >
            {/* decorative primary blob */}
            <div
              aria-hidden
              className="bg-primary/10 pointer-events-none absolute -left-8 -top-8 h-20 w-20 rounded-full blur-2xl"
            />
            {navItems.map((item, index) => renderRoute(item, index))}
          </nav>
        </>
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
            className="bg-primary/15 pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full blur-2xl"
          />
          {navItems.map((item, index) => {
            const isActive = index === activeIndex;
            const Icon = item.icon;

            if (!isActionOrRoutePermitted(user?.role, item.permissions))
              return null;
            return (
              <button
                key={item.url}
                onClick={() => navigate(item.url)}
                className={cn(
                  "group/item relative flex w-full items-center gap-3 rounded-xl outline-none",
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
                      ? "from-primary/20 to-primary/5 text-primary ring-primary/20 bg-gradient-to-br ring-1"
                      : "bg-muted/60 text-muted-foreground group-hover/nav:bg-primary/10 group-hover/nav:text-primary",
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
