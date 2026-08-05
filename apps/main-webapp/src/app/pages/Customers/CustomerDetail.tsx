import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Users, ShoppingBag, Coins, Wallet } from "lucide-react";
import {
  Card,
  Skeleton,
  Monogram,
  cn,
} from "@store-credit-platform/web-components";
import { customerService } from "@store-credit-platform/api-services";
import { isApiError } from "@shared/utils/api.utils";
import { formatEpochDate, formatGHS } from "@shared/utils/format";
import { customerRowInitials } from "@shared/utils/customers.utils";
import { formatDisplayNumber } from "@shared/utils/ui.utils";
import { CustomerDetailCreditCard } from "./components/CustomerDetailCreditCard";

export default function CustomerDetail() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const id = Number(customerId);

  const detailQuery = useQuery({
    queryKey: ["customers", "detail", id],
    queryFn: async () => {
      const res = await customerService.getCustomerDetail(id);
      if (isApiError(res)) throw new Error(res.error);
      return res.data;
    },
    enabled: Number.isFinite(id) && id > 0,
  });

  const detail = detailQuery.data;
  const isLinked =
    detail &&
    detail.user_id != null &&
    detail.customer_name &&
    detail.customer_name !== "Unnamed customer";

  return (
    <div className="relative min-h-screen px-4 py-6 md:px-8 md:py-10">
      <div
        aria-hidden
        className="from-primary/5 pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b to-transparent"
      />
      <div className="relative mx-auto max-w-5xl space-y-6">
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate("/customers")}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to customers
        </button>

        {detailQuery.isError ? (
          <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Users className="text-muted-foreground h-8 w-8" />
            <p className="text-sm font-medium">Customer not found</p>
            <p className="text-muted-foreground text-xs">
              This customer may not belong to your store, or has no purchases
              on record.
            </p>
          </Card>
        ) : detailQuery.isPending || !detail ? (
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Header card */}
            <div className="bg-card animate-fade-in-up relative overflow-hidden rounded-2xl border p-6 shadow-sm motion-reduce:animate-none">
              <div
                aria-hidden
                className="from-primary/25 via-primary/10 pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br to-transparent blur-2xl"
              />
              <div className="relative flex items-start gap-4">
                <Monogram
                  text={customerRowInitials(detail)}
                  seed={
                    detail.user_id ?? detail.phone ?? String(detail.customer_id)
                  }
                  size="lg"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <h1 className="text-2xl font-bold tracking-tight">
                    {isLinked
                      ? detail.customer_name
                      : (formatDisplayNumber(detail.phone) ??
                        "Unnamed customer")}
                  </h1>
                  {isLinked && detail.phone && (
                    <p className="text-muted-foreground text-sm tabular-nums">
                      {formatDisplayNumber(detail.phone)}
                    </p>
                  )}
                  <p className="text-muted-foreground text-[11px] tabular-nums">
                    Customer #{detail.customer_id}
                  </p>
                </div>
              </div>

              {/* Totals row */}
              <div className="relative mt-5 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-4">
                <StatTile
                  icon={<ShoppingBag className="h-4 w-4 stroke-[1.75]" />}
                  label="Total purchases"
                  value={formatGHS(detail.total_purchases)}
                />
                <StatTile
                  icon={<Wallet className="h-4 w-4 stroke-[1.75]" />}
                  label="Available credits"
                  value={formatGHS(detail.available_credits)}
                  tone="primary"
                />
                <StatTile
                  icon={<Coins className="h-4 w-4 stroke-[1.75]" />}
                  label="Live credits"
                  value={String(detail.live_credit_count)}
                />
                <StatTile
                  icon={<Users className="h-4 w-4 stroke-[1.75]" />}
                  label="Last activity"
                  value={
                    detail.last_activity_epoch == null
                      ? "—"
                      : formatEpochDate(detail.last_activity_epoch)
                  }
                />
              </div>
            </div>

            {/* Credits section */}
            <div className="animate-fade-in-up space-y-3 motion-reduce:animate-none">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold tracking-tight">
                  Available credits
                </h2>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {detail.credits.length}{" "}
                  {detail.credits.length === 1 ? "credit" : "credits"}
                </span>
              </div>

              {detail.credits.length === 0 ? (
                <Card className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <Coins className="text-muted-foreground h-8 w-8" />
                  <p className="text-sm font-medium">No live credits</p>
                  <p className="text-muted-foreground text-xs">
                    This customer has no active credit. Credits are issued
                    automatically when a purchase triggers a running promo.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {detail.credits.map((credit) => (
                    <CustomerDetailCreditCard
                      key={credit.id}
                      row={credit}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface StatTileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "primary" | "default";
}

function StatTile({ icon, label, value, tone = "default" }: StatTileProps) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded-md",
            tone === "primary"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {icon}
        </span>
        <span className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums tracking-tight",
          tone === "primary" && "text-primary",
        )}
      >
        {value}
      </div>
    </div>
  );
}