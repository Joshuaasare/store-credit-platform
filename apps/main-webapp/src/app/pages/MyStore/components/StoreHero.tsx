import { Pencil } from "lucide-react";
import { Button, Badge } from "@store-credit-platform/web-components";
import { MerchantWithStats } from "@shared/types/api.types";
import { getCountryByCode } from "@shared/utils/countries";
import { MerchantEditDialog } from "./MerchantEditDialog";

interface StoreHeroProps {
  merchant: MerchantWithStats;
  isManager: boolean;
}

export function StoreHero({ merchant, isManager }: StoreHeroProps) {
  const country = getCountryByCode(merchant.country_code as any);
  const initials = merchant.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const year = new Date(merchant.created_at).getFullYear();

  return (
    <div className="relative animate-fade-in-up motion-reduce:animate-none overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm md:flex-row md:items-center md:justify-between md:p-7 flex flex-col gap-5">
      {/* decorative gradient blob */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
      />
      <div className="relative flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-xl font-semibold text-primary ring-1 ring-primary/20">
          {initials || "S"}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">
              {merchant.name}
            </h1>
            {country && (
              <span
                title={country.name}
                className="text-2xl leading-none"
                aria-label={country.name}
              >
                {country.flag}
              </span>
            )}
          </div>
          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 text-sm">
            <Badge
              variant={merchant.is_active ? "default" : "secondary"}
              className="gap-1.5"
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  merchant.is_active ? "bg-emerald-500" : "bg-muted-foreground"
                }`}
              />
              {merchant.is_active ? "Active" : "Inactive"}
            </Badge>
            <span className="text-muted-foreground/70">·</span>
            <span>Since {year}</span>
            {merchant.slug && (
              <span className="rounded-md border bg-muted/50 px-2 py-0.5 font-mono text-xs text-muted-foreground">
                /{merchant.slug}
              </span>
            )}
          </div>
        </div>
      </div>
      {isManager && (
        <div className="relative shrink-0">
          <MerchantEditDialog merchant={merchant}>
            <Button variant="outline" size="sm" className="bg-background/60 backdrop-blur">
              <Pencil className="mr-2 h-4 w-4" /> Edit profile
            </Button>
          </MerchantEditDialog>
        </div>
      )}
    </div>
  );
}