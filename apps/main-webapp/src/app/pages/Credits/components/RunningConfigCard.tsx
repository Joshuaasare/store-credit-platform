import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  Badge,
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
import { formatGHS } from "@shared/utils/format";
import { RunningConfigDialog } from "./RunningConfigDialog";

interface RunningConfigCardProps {
  config: RunningCreditConfigGroup;
  isManager: boolean;
}

export function RunningConfigCard({ config, isManager }: RunningConfigCardProps) {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

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
  const rewardLabel = isPercentage
    ? `${config.percentage_credit_value ?? 0}% back`
    : `${formatGHS(config.fixed_credit_value ?? 0)} flat`;

  const windowLabel =
    config.eligible_window == null
      ? "No lookback"
      : `Last ${config.eligible_window} days`;
  const validityLabel =
    config.credit_validity == null
      ? "Lifetime"
      : `${config.credit_validity} days`;
  const scopeLabel =
    config.cumulative_scope === "per_branch" ? "Per-branch" : "Merchant-wide";

  return (
    <>
      <Card className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary text-primary-foreground">
              {rewardLabel}
            </Badge>
            <Badge variant="outline" className="text-muted-foreground">
              {config.is_active ? "Active" : "Paused"}
            </Badge>
          </div>
          {isManager && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground h-7 w-7"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit config
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => toggleMutation.mutate(!config.is_active)}
                  disabled={toggleMutation.isPending}
                >
                  {config.is_active ? "Pause config" : "Activate config"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete config
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="space-y-1.5 text-sm">
          <Row label="Threshold" value={formatGHS(config.threshold_amount ?? 0)} />
          <Row label="Lookback" value={windowLabel} />
          <Row label="Validity" value={validityLabel} />
          <Row label="Scope" value={scopeLabel} />
          {config.maximum_allowed_credit != null && (
            <Row
              label="Max credit"
              value={formatGHS(config.maximum_allowed_credit)}
            />
          )}
          {config.terms && (
            <Row label="Terms" value={config.terms} muted />
          )}
        </div>

        <div className="mt-auto space-y-2 border-t pt-3">
          <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
            Branches
          </div>
          <div className="flex flex-wrap gap-1.5">
            {config.branches.map((b) => (
              <Badge
                key={b.id}
                variant="outline"
                className="text-muted-foreground"
              >
                {b.name?.trim() || "Unnamed branch"} · {b.city}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      <RunningConfigDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        config={config}
      />
    </>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span
        className={
          muted
            ? "text-muted-foreground text-right text-xs"
            : "text-right text-sm font-medium"
        }
      >
        {value}
      </span>
    </div>
  );
}