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
import type { FixedCreditConfigGroup } from "@shared/types/api.types";
import { isApiError } from "@shared/utils/api.utils";
import {
  errorToastProperties,
  successToastProperties,
} from "@shared/utils/misc.utils";
import { formatEpochDate, formatGHS } from "@shared/utils/format";
import { FixedConfigDialog } from "./FixedConfigDialog";

interface FixedConfigCardProps {
  config: FixedCreditConfigGroup;
  isManager: boolean;
}

export function FixedConfigCard({ config, isManager }: FixedConfigCardProps) {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

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
  const rewardLabel = isPercentage
    ? `${config.percentage_credit_value ?? 0}% back`
    : `${formatGHS(config.fixed_credit_value ?? 0)} flat`;

  const now = Math.floor(Date.now() / 1000);
  const withinWindow =
    config.start_date != null &&
    config.end_date != null &&
    now >= config.start_date &&
    now <= config.end_date;
  const activeRightNow = config.is_active && withinWindow;

  return (
    <>
      <Card className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary text-primary-foreground">
              {rewardLabel}
            </Badge>
            {activeRightNow ? (
              <Badge className="bg-primary/10 text-primary border-primary/30">
                Active right now
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                {config.is_active ? "Scheduled" : "Paused"}
              </Badge>
            )}
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
                  <Pencil className="mr-2 h-4 w-4" /> Edit promo
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => toggleMutation.mutate(!config.is_active)}
                  disabled={toggleMutation.isPending}
                >
                  {config.is_active ? "Pause promo" : "Activate promo"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete promo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="space-y-1.5 text-sm">
          <Row
            label="Window"
            value={`${formatEpochDate(config.start_date ?? 0)} – ${formatEpochDate(
              config.end_date ?? 0,
            )}`}
          />
          {config.maximum_allowed_credit != null && (
            <Row
              label="Max credit"
              value={formatGHS(config.maximum_allowed_credit)}
            />
          )}
          {config.terms && <Row label="Terms" value={config.terms} muted />}
        </div>

        <p className="text-muted-foreground text-xs">
          Passive registry. No credits are issued automatically — record any
          payouts out-of-band.
        </p>

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

      <FixedConfigDialog
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