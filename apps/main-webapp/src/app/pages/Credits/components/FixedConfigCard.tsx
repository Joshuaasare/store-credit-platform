import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, MoreVertical, Pencil, Trash2 } from "lucide-react";
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

  const statusLabel = activeRightNow
    ? "Active right now"
    : config.is_active
      ? "Scheduled"
      : "Paused";
  const statusColor = activeRightNow
    ? "bg-emerald-500"
    : config.is_active
      ? "bg-amber-500"
      : "bg-slate-300";

  const rows = [
    {
      label: "Window",
      value: `${formatEpochDate(config.start_date ?? 0)} – ${formatEpochDate(
        config.end_date ?? 0,
      )}`,
    },
    ...(config.maximum_allowed_credit != null
      ? [{ label: "Max credit", value: formatGHS(config.maximum_allowed_credit) }]
      : []),
  ];

  return (
    <>
      <Card className="group flex h-full flex-col gap-4 border-slate-200/80 bg-white p-5 shadow-none">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-100 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              {rewardLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600">
              <CalendarClock className="h-3 w-3 text-amber-500" />
              Passive registry
            </span>
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

        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className={`h-2 w-2 rounded-full ${statusColor}`} />
          <span className="text-xs font-medium text-slate-700">{statusLabel}</span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {rows.map((row) => (
            <div key={row.label} className="space-y-0.5">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {row.label}
              </div>
              <div className="text-sm font-semibold text-slate-800">
                {row.value}
              </div>
            </div>
          ))}
        </div>

        {config.terms && (
          <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {config.terms}
          </p>
        )}

        <p className="text-xs text-slate-500">
          No credits are issued automatically — record any payouts out-of-band.
        </p>

        <div className="mt-auto space-y-2 border-t border-slate-100 pt-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Branches
          </div>
          <div className="flex flex-wrap gap-1.5">
            {config.branches.map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600"
              >
                {b.name?.trim() || "Unnamed branch"} · {b.city}
              </span>
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