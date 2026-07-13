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
    <div className="bg-card text-card-foreground flex flex-col gap-4 rounded-2xl border p-6 shadow-sm animate-fade-in-up motion-reduce:animate-none md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-semibold text-primary">
          {initials || "S"}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
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
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={merchant.is_active ? "default" : "secondary"}>
              {merchant.is_active ? "Active" : "Inactive"}
            </Badge>
            <span>Since {year}</span>
            {merchant.slug && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs">
                /{merchant.slug}
              </span>
            )}
          </div>
        </div>
      </div>
      {isManager && (
        <MerchantEditDialog merchant={merchant}>
          <Button variant="outline" size="sm">
            <Pencil className="mr-2 h-4 w-4" /> Edit profile
          </Button>
        </MerchantEditDialog>
      )}
    </div>
  );
}