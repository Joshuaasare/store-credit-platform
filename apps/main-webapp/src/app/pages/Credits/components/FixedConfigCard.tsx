import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Info,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";
import {
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@store-credit-platform/web-components";
import { creditConfigService } from "@store-credit-platform/api-services";
import type { FixedCreditConfigGroup } from "@shared/types/api.types";
import { isApiError } from "@shared/utils/api.utils";
import {
  errorToastProperties,
  successToastProperties,
} from "@shared/utils/misc.utils";
import {
  formatEpochDate,
  formatGHS,
  formatGHSCompact,
} from "@shared/utils/format";
import { ConfirmDialog } from "@shared/components/ConfirmDialog/ConfirmDialog";
import { FlipCard } from "@shared/components/FlipCard/FlipCard";
import { FixedConfigSummary } from "./ConfigSummary";
import { FixedConfigDialog } from "./FixedConfigDialog";
import {
  CARD_CLASS,
  CARD_CLASS_PAUSED,
  CHIP,
  DIVIDER,
  HERO_NUMBER,
  HERO_NUMBER_MUTED,
  LABEL,
  PAUSED_PILL,
  STATUS_DOT_ACTIVE,
  STATUS_DOT_PAUSED,
  STATUS_TEXT_ACTIVE,
  STATUS_TEXT_PAUSED,
  VALUE,
} from "./configCardStyles";

interface FixedConfigCardProps {
  config: FixedCreditConfigGroup;
  isManager: boolean;
}

export function FixedConfigCard({ config, isManager }: FixedConfigCardProps) {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmPause, setConfirmPause] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["credit-configs"] });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await creditConfigService.deleteFixedConfig(
        config.config_group_id,
      );
      if (isApiError(res)) throw new Error(res.error);
    },
    onSuccess: () => {
      toast.success("Promo deleted", successToastProperties);
      void invalidate();
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Failed to delete promo",
        errorToastProperties,
      ),
  });

  const toggleMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const res = await creditConfigService.toggleFixedConfigActive(
        config.config_group_id,
        isActive,
      );
      if (isApiError(res)) throw new Error(res.error);
    },
    onSuccess: () => {
      toast.success(
        config.is_active ? "Promo paused" : "Promo activated",
        successToastProperties,
      );
      void invalidate();
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Failed to toggle promo",
        errorToastProperties,
      ),
  });

  const isPercentage = config.credit_type === "percentage";
  const rewardNumber = isPercentage
    ? `${config.percentage_credit_value ?? 0}%`
    : formatGHSCompact(config.fixed_credit_value ?? 0);
  const caption = isPercentage
    ? "Promo cashback rate"
    : "Promo cashback amount";

  const start = config.start_date;
  const end = config.end_date;
  let tagline: string;
  if (start != null && end != null) {
    tagline = `Active ${formatEpochDate(start)} – ${formatEpochDate(end)}.`;
  } else if (start != null) {
    tagline = `Active from ${formatEpochDate(start)}.`;
  } else if (end != null) {
    tagline = `Active until ${formatEpochDate(end)}.`;
  } else {
    tagline = "No active window set.";
  }

  const now = Math.floor(Date.now() / 1000);
  const withinWindow =
    start != null && end != null && now >= start && now <= end;
  const activeRightNow = config.is_active && withinWindow;

  const statusLabel = activeRightNow
    ? "Active right now"
    : config.is_active
      ? "Scheduled"
      : "Paused";
  const statusColor = activeRightNow ? STATUS_DOT_ACTIVE : STATUS_DOT_PAUSED;

  const isActive = config.is_active;
  const cardClass = isActive ? CARD_CLASS : CARD_CLASS_PAUSED;
  const heroClass = isActive ? HERO_NUMBER : HERO_NUMBER_MUTED;

  return (
    <>
      <FlipCard
        front={(flip) => (
          <Card className={cardClass}>
            <div className="text-muted-foreground flex items-center justify-between text-[11px] font-medium uppercase tracking-wide">
              <div className="flex items-center gap-2">
                <span>{caption}</span>
                {!isActive && (
                  <span className={PAUSED_PILL}>
                    <Pause className="h-2.5 w-2.5" />
                    Paused
                  </span>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground h-6 w-6"
                  onClick={flip}
                  title="How this promo works"
                >
                  <Info className="h-3.5 w-3.5" />
                </Button>
                {isManager && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground h-6 w-6"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditOpen(true)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit promo
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setConfirmPause(true)}
                        disabled={toggleMutation.isPending}
                      >
                        {config.is_active ? (
                          <>
                            <Pause className="mr-2 h-4 w-4" /> Pause promo
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" /> Activate promo
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setConfirmDelete(true)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete promo
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            <div className="mt-2 leading-none">
              <span className={heroClass}>{rewardNumber}</span>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">{tagline}</p>

            <div className={`mt-5 pt-4 ${DIVIDER}`}>
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <span className={statusColor} />
                <span
                  className={isActive ? STATUS_TEXT_ACTIVE : STATUS_TEXT_PAUSED}
                >
                  {statusLabel}
                </span>
              </div>

              {config.maximum_allowed_credit != null && (
                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
                  <div>
                    <div className={LABEL}>Cap per purchase</div>
                    <div className={VALUE}>
                      {formatGHS(config.maximum_allowed_credit)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <p className="text-muted-foreground mt-auto space-y-2 pt-5 text-xs">
              Passive registry — no credits are issued automatically. Record any
              payouts out-of-band.
            </p>

            <div className="text-muted-foreground space-y-2 pt-3 text-xs">
              <div className={LABEL}>Listed at</div>
              <div className="flex flex-wrap gap-1.5">
                {config.branches.map((b) => (
                  <span key={b.id} className={CHIP}>
                    {b.name?.trim() || "Unnamed branch"} · {b.city}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        )}
        back={(flip) => (
          <Card className={cardClass}>
            <div className="text-muted-foreground flex items-center justify-between text-[11px] font-medium uppercase tracking-wide">
              <div className="flex items-center gap-2">
                <span>How this promo works</span>
                {!isActive && (
                  <span className={PAUSED_PILL}>
                    <Pause className="h-2.5 w-2.5" />
                    Paused
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-6"
                onClick={flip}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            </div>

            <div className="mt-4">
              <FixedConfigSummary
                accent="amber"
                credit_type={
                  (config.credit_type ?? "percentage") as "percentage" | "fixed"
                }
                percentage_credit_value={config.percentage_credit_value}
                fixed_credit_value={config.fixed_credit_value}
                maximum_allowed_credit={config.maximum_allowed_credit}
                start_date={config.start_date}
                end_date={config.end_date}
              />
            </div>

            {config.terms && (
              <p className="bg-muted/40 text-muted-foreground mt-4 rounded-md px-3 py-2 text-xs">
                {config.terms}
              </p>
            )}

            <p className="text-muted-foreground mt-4 text-xs">
              Passive registry — no credits are issued automatically. Record any
              payouts out-of-band.
            </p>

            <div className="text-muted-foreground mt-auto space-y-2 pt-5 text-xs">
              <div className={LABEL}>Listed at</div>
              <div className="flex flex-wrap gap-1.5">
                {config.branches.map((b) => (
                  <span key={b.id} className={CHIP}>
                    {b.name?.trim() || "Unnamed branch"} · {b.city}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        )}
      />

      <FixedConfigDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        config={config}
      />

      <ConfirmDialog
        open={confirmPause}
        onOpenChange={setConfirmPause}
        title={config.is_active ? "Pause this promo?" : "Activate this promo?"}
        description={
          config.is_active
            ? "The promo will no longer show as 'Active right now' to staff. You can reactivate it any time — no data is lost."
            : "The promo will become visible to staff again based on its start and end dates."
        }
        confirmLabel={config.is_active ? "Pause promo" : "Activate promo"}
        confirmIcon={
          config.is_active ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )
        }
        pending={toggleMutation.isPending}
        onConfirm={() => {
          setConfirmPause(false);
          toggleMutation.mutate(!config.is_active);
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this promo?"
        description="This permanently removes the promo from all its branches. No credits were ever issued from this promo (it's a passive registry), so there's nothing to undo on the customer side. This cannot be undone."
        confirmLabel="Delete promo"
        confirmIcon={<Trash2 className="h-4 w-4" />}
        destructive
        pending={deleteMutation.isPending}
        onConfirm={() => {
          setConfirmDelete(false);
          deleteMutation.mutate();
        }}
      />
    </>
  );
}
