import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
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
import { formatEpochDate } from "@shared/utils/format";
import { ConfirmDialog } from "@shared/components/ConfirmDialog/ConfirmDialog";
import { FixedConfigDialog } from "./FixedConfigDialog";
import {
  CARD_CLASS,
  CARD_CLASS_PAUSED,
  CHIP,
  DIVIDER,
  LABEL,
  PAUSED_PILL,
  STATUS_DOT_ACTIVE,
  STATUS_DOT_PAUSED,
  STATUS_TEXT_ACTIVE,
  STATUS_TEXT_PAUSED,
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

  const start = config.start_date;
  const end = config.end_date;
  const now = Math.floor(Date.now());
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

  const images = config.images ?? [];
  const visibleImages = images.slice(0, 4);
  const overflow = images.length - visibleImages.length;

  return (
    <>
      <Card className={cardClass}>
        <div className="text-muted-foreground flex items-center justify-between text-[11px] font-medium uppercase tracking-wide">
          <div className="flex items-center gap-2">
            <span>Promo banner</span>
            {!isActive && (
              <span className={PAUSED_PILL}>
                <Pause className="h-2.5 w-2.5" />
                Paused
              </span>
            )}
          </div>
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

        <h3 className="mt-2 text-lg font-semibold leading-snug line-clamp-2">
          {config.title?.trim() || "Untitled promo"}
        </h3>
        {config.description && (
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed line-clamp-2">
            {config.description}
          </p>
        )}

        {visibleImages.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {visibleImages.map((url, i) => (
              <img
                key={url + i}
                src={url}
                alt=""
                className="h-16 w-16 rounded-md border border-border object-cover"
              />
            ))}
            {overflow > 0 && (
              <div className="text-muted-foreground border-border bg-muted/50 flex h-16 w-16 items-center justify-center rounded-md border text-xs font-medium">
                +{overflow}
              </div>
            )}
          </div>
        )}

        <div className="text-muted-foreground mt-3 text-xs">
          {start != null && end != null
            ? `${formatEpochDate(start)} – ${formatEpochDate(end)}`
            : start != null
              ? `From ${formatEpochDate(start)}`
              : end != null
                ? `Until ${formatEpochDate(end)}`
                : "No active window set."}
        </div>

        <div className={`mt-4 pt-3 ${DIVIDER}`}>
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <span className={statusColor} />
            <span
              className={isActive ? STATUS_TEXT_ACTIVE : STATUS_TEXT_PAUSED}
            >
              {statusLabel}
            </span>
          </div>
        </div>

        {config.terms && (
          <details className="text-muted-foreground mt-3 text-xs">
            <summary className="cursor-pointer select-none">Terms</summary>
            <p className="bg-muted/40 mt-1.5 rounded-md px-2.5 py-2 leading-relaxed">
              {config.terms}
            </p>
          </details>
        )}

        <div className="text-muted-foreground mt-auto space-y-2 pt-4 text-xs">
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
        description="This permanently removes the promo from all its branches and deletes its uploaded images. This cannot be undone."
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