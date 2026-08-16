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
import type { RunningCreditConfigGroup } from "@shared/types/api.types";
import { isApiError } from "@shared/utils/api.utils";
import {
  errorToastProperties,
  successToastProperties,
} from "@shared/utils/misc.utils";
import { formatGHS, formatGHSCompact } from "@shared/utils/format";
import { ConfirmDialog } from "@shared/components/ConfirmDialog/ConfirmDialog";
import { FlipCard } from "@shared/components/FlipCard/FlipCard";
import { RunningConfigSummary } from "./ConfigSummary";
import { RunningConfigDialog } from "./RunningConfigDialog";
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

interface RunningConfigCardProps {
  config: RunningCreditConfigGroup;
  isManager: boolean;
}

export function RunningConfigCard({
  config,
  isManager,
}: RunningConfigCardProps) {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmPause, setConfirmPause] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["credit-configs"] });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await creditConfigService.deleteRunningConfig(
        config.config_group_id,
      );
      if (isApiError(res)) throw new Error(res.error);
    },
    onSuccess: () => {
      toast.success("Config deleted", successToastProperties);
      void invalidate();
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Failed to delete config",
        errorToastProperties,
      ),
  });

  const toggleMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const res = await creditConfigService.toggleRunningConfigActive(
        config.config_group_id,
        isActive,
      );
      if (isApiError(res)) throw new Error(res.error);
    },
    onSuccess: () => {
      toast.success(
        config.is_active ? "Config paused" : "Config activated",
        successToastProperties,
      );
      void invalidate();
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Failed to toggle config",
        errorToastProperties,
      ),
  });

  const isPercentage = config.credit_type === "percentage";
  const rewardNumber = isPercentage
    ? `${config.percentage_credit_value ?? 0}%`
    : formatGHSCompact(config.fixed_credit_value ?? 0);
  const caption = isPercentage ? "Cashback rate" : "Cashback amount";
  const isActive = config.is_active;
  const cardClass = isActive ? CARD_CLASS : CARD_CLASS_PAUSED;
  const heroClass = isActive ? HERO_NUMBER : HERO_NUMBER_MUTED;

  let tagline: string;
  if (config.threshold_amount == null) {
    tagline = "On every purchase.";
  } else if (config.eligible_window == null) {
    tagline = `When a single purchase reaches ${formatGHS(config.threshold_amount)}.`;
  } else {
    tagline = `When customers spend ${formatGHS(config.threshold_amount)} in the last ${config.eligible_window} days.`;
  }

  const validityLabel =
    config.credit_validity == null
      ? "Lifetime"
      : `${config.credit_validity} days`;
  const scopeLabel =
    config.cumulative_scope === "per_branch" ? "Per-branch" : "Merchant-wide";

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
                  title="How this campaign works"
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
                        <Pencil className="mr-2 h-4 w-4" /> Edit config
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setConfirmPause(true)}
                        disabled={toggleMutation.isPending}
                      >
                        {config.is_active ? (
                          <>
                            <Pause className="mr-2 h-4 w-4" /> Pause config
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" /> Activate config
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setConfirmDelete(true)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete config
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
                <span
                  className={isActive ? STATUS_DOT_ACTIVE : STATUS_DOT_PAUSED}
                />
                <span
                  className={isActive ? STATUS_TEXT_ACTIVE : STATUS_TEXT_PAUSED}
                >
                  {isActive ? "Active" : "Paused"}
                </span>
                <span className="text-muted-foreground/40">·</span>
                <span>{scopeLabel} scope</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <div className={LABEL}>Credit validity</div>
                  <div className={VALUE}>{validityLabel}</div>
                </div>
                {config.maximum_allowed_credit != null && (
                  <div>
                    <div className={LABEL}>Cap per purchase</div>
                    <div className={VALUE}>
                      {formatGHS(config.maximum_allowed_credit)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="text-muted-foreground mt-auto space-y-2 pt-5 text-xs">
              <div className={LABEL}>Active at</div>
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
                <span>How this campaign works</span>
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
              <RunningConfigSummary
                accent="amber"
                credit_type={
                  (config.credit_type ?? "percentage") as "percentage" | "fixed"
                }
                percentage_credit_value={config.percentage_credit_value}
                fixed_credit_value={config.fixed_credit_value}
                threshold_amount={config.threshold_amount}
                eligible_window={config.eligible_window}
                credit_validity={config.credit_validity}
                maximum_allowed_credit={config.maximum_allowed_credit}
                cumulative_scope={config.cumulative_scope}
              />
            </div>

            {config.terms && (
              <p className="bg-muted/40 text-muted-foreground mt-4 rounded-md px-3 py-2 text-xs">
                {config.terms}
              </p>
            )}

            <div className="text-muted-foreground mt-auto space-y-2 pt-5 text-xs">
              <div className={LABEL}>Active at</div>
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

      <RunningConfigDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        config={config}
      />

      <ConfirmDialog
        open={confirmPause}
        onOpenChange={setConfirmPause}
        title={
          config.is_active ? "Pause this config?" : "Activate this config?"
        }
        description={
          config.is_active
            ? "Customers will stop earning credit from this config until you reactivate it. Existing credits already issued are not affected."
            : "Customers will start earning credit from this config again on their next qualifying purchase."
        }
        confirmLabel={config.is_active ? "Pause config" : "Activate config"}
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
        title="Delete this config?"
        description="This permanently removes the config from all its branches. Existing credits already issued to customers are not affected. This cannot be undone."
        confirmLabel="Delete config"
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
