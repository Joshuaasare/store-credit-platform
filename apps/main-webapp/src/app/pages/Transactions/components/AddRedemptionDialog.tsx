import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
} from "@store-credit-platform/web-components";
import { customerService } from "@store-credit-platform/api-services";
import {
  errorToastProperties,
  successToastProperties,
} from "@shared/utils/misc.utils";
import { isApiError } from "@shared/utils/api.utils";
import { formatGHS } from "@shared/utils/format";

const redemptionSchema = z.object({
  amount_redeemed: z
    .number({ error: "Amount is required" })
    .min(0.01, "Amount must be greater than zero"),
});

type RedemptionFormValues = z.infer<typeof redemptionSchema>;

interface AddRedemptionDialogProps {
  /** The customer_credit.id to redeem against. */
  creditId: number | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

/**
 * Records an auto-approved redemption against a specific customer_credit row.
 * Fetches the live `remaining` snapshot when opened, validates that the
 * entered amount does not exceed remaining, and submits via
 * `customerService.createRedemption`. Submit + Cancel are disabled while the
 * request is in flight (per the form-submission UX guideline).
 */
export function AddRedemptionDialog({
  creditId,
  open,
  onOpenChange,
  children,
}: AddRedemptionDialogProps) {
  const queryClient = useQueryClient();

  const remainingQuery = useQuery({
    queryKey: ["customers", "credit", creditId, "remaining"],
    queryFn: async () => {
      if (creditId == null) return null;
      const res = await customerService.getCreditRemaining(creditId);
      if (isApiError(res)) throw new Error(res.error);
      return res.data;
    },
    enabled: open && creditId != null,
    staleTime: 0,
  });

  const remaining = remainingQuery.data?.remaining ?? 0;
  const creditAmount = remainingQuery.data?.credit_amount ?? 0;
  const redeemedTotal = remainingQuery.data?.redeemed_total ?? 0;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RedemptionFormValues>({
    resolver: zodResolver(redemptionSchema),
    defaultValues: { amount_redeemed: NaN },
  });

  useEffect(() => {
    if (open) {
      reset({ amount_redeemed: NaN });
      void remainingQuery.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, creditId, reset]);

  const mutation = useMutation({
    mutationFn: async (values: RedemptionFormValues) => {
      if (creditId == null) throw new Error("No credit selected");
      const res = await customerService.createRedemption({
        credit_id: creditId,
        amount_redeemed: values.amount_redeemed,
      });
      if (isApiError(res)) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Redemption recorded", successToastProperties);
      // A redemption appears in the transactions feed as a credit_redeem row,
      // so invalidate the feed. The per-credit remaining query is keyed by
      // creditId and will refetch on next dialog open.
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      onOpenChange?.(false);
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to record redemption",
        errorToastProperties,
      );
    },
  });

  const onSubmit = (values: RedemptionFormValues) => {
    if (values.amount_redeemed > remaining) {
      toast.error(
        `Amount exceeds remaining credit (${formatGHS(remaining)})`,
        errorToastProperties,
      );
      return;
    }
    mutation.mutate(values);
  };

  const remainingLoading =
    remainingQuery.isFetching && !remainingQuery.data;
  const submitPending = mutation.isPending || remainingLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Redeem credit</DialogTitle>
          <DialogDescription>
            Record a redemption against this customer credit. The redemption
            is auto-approved on creation.
          </DialogDescription>
        </DialogHeader>

        {remainingLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            <div className="bg-muted/30 space-y-1.5 rounded-lg border p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Credit amount</span>
                <span className="tabular-nums">{formatGHS(creditAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Already redeemed</span>
                <span className="tabular-nums">{formatGHS(redeemedTotal)}</span>
              </div>
              <div className="border-t pt-1.5">
                <div className="flex justify-between font-medium">
                  <span>Remaining</span>
                  <span className="tabular-nums">{formatGHS(remaining)}</span>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="redemption-amount">
                  Redemption amount (GH₵) *
                </Label>
                <Input
                  id="redemption-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remaining || undefined}
                  placeholder="e.g. 10.00"
                  {...register("amount_redeemed", {
                    setValueAs: (v: unknown) =>
                      v === "" || v == null ? NaN : Number(v),
                  })}
                />
                {errors.amount_redeemed && (
                  <p className="text-destructive text-xs">
                    {errors.amount_redeemed.message}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange?.(false)}
                  disabled={submitPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitPending || remaining <= 0}
                >
                  {submitPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Record redemption
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}