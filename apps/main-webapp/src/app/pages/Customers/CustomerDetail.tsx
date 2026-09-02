import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, Coins, Users } from "lucide-react";
import {
  Card,
  Skeleton,
  Monogram,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  cn,
} from "@store-credit-platform/web-components";
import { customerService } from "@store-credit-platform/api-services";
import { isApiError } from "@shared/utils/api.utils";
import { formatEpochDate, formatGHS } from "@shared/utils/format";
import { customerRowInitials } from "@shared/utils/customers.utils";
import { formatDisplayNumber } from "@shared/utils/ui.utils";
import { CustomerDetailCreditCard } from "./components/CustomerDetailCreditCard";
import { CustomerDetailRedeemedList } from "./components/CustomerDetailRedeemedList";

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

  const { liveCredits, redeemedCredits } = useMemo(() => {
    if (!detail) return { liveCredits: [], redeemedCredits: [] };
    const live = detail.credits.filter((c) => c.remaining > 0);
    const redeemed = detail.credits.filter((c) => c.remaining <= 0);
    return { liveCredits: live, redeemedCredits: redeemed };
  }, [detail]);

  return (
    <div className="relative min-h-screen px-4 py-6 md:px-8 md:py-10">
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
            {/* Header card — soft tinted surface so it reads as a profile, not a block */}
            <div className="bg-primary/5 dark:bg-primary/10 ring-primary/10 relative overflow-hidden rounded-2xl p-6 shadow-sm ring-1 ring-inset">
              <span
                aria-hidden
                className="bg-primary absolute left-0 top-6 h-12 w-[3px] rounded-full"
              />
              <div className="relative flex items-start gap-4 pl-3">
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
                </div>
              </div>

              {/* Totals row — flat label/value, even scale */}
              <div className="relative mt-6 grid grid-cols-2 gap-x-6 gap-y-4 pl-3 sm:grid-cols-4">
                <StatLine
                  label="Total purchases"
                  value={formatGHS(detail.total_purchases)}
                  tone="primary"
                />
                <StatLine
                  label="Available credits"
                  value={formatGHS(detail.available_credits)}
                  tone="primary"
                />
                <StatLine
                  label="Live credits"
                  value={String(detail.live_credit_count)}
                  tone="primary"
                />
                <StatLine
                  label="Last activity"
                  value={
                    detail.last_activity_epoch == null
                      ? "—"
                      : formatEpochDate(detail.last_activity_epoch)
                  }
                  tone="primary"
                />
              </div>
            </div>

            {/* Live credits */}
            <div className="animate-fade-in-up space-y-3 motion-reduce:animate-none">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold tracking-tight">
                  Live credits
                </h2>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {liveCredits.length}{" "}
                  {liveCredits.length === 1 ? "credit" : "credits"}
                </span>
              </div>

              {liveCredits.length === 0 ? (
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
                  {liveCredits.map((credit) => (
                    <CustomerDetailCreditCard
                      key={credit.id}
                      row={credit}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Redeemed credits — collapsed by default */}
            {redeemedCredits.length > 0 && (
              <Collapsible
                defaultOpen={false}
                className="animate-fade-in-up motion-reduce:animate-none"
              >
                <div className="rounded-2xl border bg-card">
                  <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-base font-semibold tracking-tight">
                        Redeemed credits
                      </h2>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {redeemedCredits.length}
                      </span>
                    </div>
                    <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform [[data-state=open]>&]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CustomerDetailRedeemedList credits={redeemedCredits} />
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface StatLineProps {
  label: string;
  value: string;
  tone?: "primary" | "default";
}

function StatLine({ label, value, tone = "default" }: StatLineProps) {
  return (
    <div>
      <div className="text-muted-foreground text-xs">{label}</div>
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