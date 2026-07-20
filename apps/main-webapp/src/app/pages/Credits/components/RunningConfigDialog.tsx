import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
  ToggleGroup,
  ToggleGroupItem,
} from "@store-credit-platform/web-components";
import { creditConfigService } from "@store-credit-platform/api-services";
import type {
  CreateRunningCreditConfigRequest,
  RunningCreditConfigGroup,
} from "@shared/types/api.types";
import { isApiError } from "@shared/utils/api.utils";
import {
  errorToastProperties,
  successToastProperties,
} from "@shared/utils/misc.utils";
import { useStoreStore } from "@shared/stores/storeStore";
import { BranchMultiSelect } from "./BranchMultiSelect";
import { FieldInfoLabel } from "./FieldInfoLabel";
import { RunningConfigSummary } from "./ConfigSummary";

const numericNullable = z
  .union([z.number(), z.null()])
  .optional();

const runningSchema = z.object({
  branch_ids: z
    .array(z.number())
    .min(1, "Select at least one branch"),
  credit_type: z.enum(["percentage", "fixed"]),
  percentage_credit_value: numericNullable,
  fixed_credit_value: numericNullable,
  maximum_allowed_credit: numericNullable,
  threshold_amount: numericNullable,
  eligible_window: numericNullable,
  credit_validity: numericNullable,
  cumulative_scope: z.enum(["per_branch", "merchant_wide"]),
  terms: z.string().nullable(),
});

type RunningFormValues = z.infer<typeof runningSchema>;

interface RunningConfigDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  config?: RunningCreditConfigGroup;
}

const NULLABLE_NUMBER = (v: unknown) =>
  v === "" || v == null ? null : Number(v);

export function RunningConfigDialog({
  open,
  onOpenChange,
  config,
}: RunningConfigDialogProps) {
  const isEdit = !!config;
  const queryClient = useQueryClient();
  const { branches } = useStoreStore();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<RunningFormValues>({
    resolver: zodResolver(runningSchema),
    defaultValues: {
      branch_ids: [],
      credit_type: "percentage",
      percentage_credit_value: null,
      fixed_credit_value: null,
      maximum_allowed_credit: null,
      threshold_amount: null,
      eligible_window: null,
      credit_validity: null,
      cumulative_scope: "per_branch",
      terms: null,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        branch_ids: config?.branches.map((b) => b.id) ?? [],
        credit_type: (config?.credit_type as "percentage" | "fixed") ?? "percentage",
        percentage_credit_value: config?.percentage_credit_value ?? null,
        fixed_credit_value: config?.fixed_credit_value ?? null,
        maximum_allowed_credit: config?.maximum_allowed_credit ?? null,
        threshold_amount: config?.threshold_amount ?? null,
        eligible_window: config?.eligible_window ?? null,
        credit_validity: config?.credit_validity ?? null,
        cumulative_scope:
          (config?.cumulative_scope as "per_branch" | "merchant_wide") ??
          "per_branch",
        terms: config?.terms ?? null,
      });
    }
  }, [open, config, reset]);

  const mutation = useMutation({
    mutationFn: async (values: RunningFormValues) => {
      const payload: CreateRunningCreditConfigRequest = {
        branch_ids: values.branch_ids,
        credit_type: values.credit_type,
        percentage_credit_value: values.percentage_credit_value ?? null,
        fixed_credit_value: values.fixed_credit_value ?? null,
        maximum_allowed_credit: values.maximum_allowed_credit ?? null,
        threshold_amount: values.threshold_amount ?? null,
        eligible_window: values.eligible_window ?? null,
        credit_validity: values.credit_validity ?? null,
        cumulative_scope: values.cumulative_scope,
        terms: values.terms ?? null,
      };
      const res = isEdit
        ? await creditConfigService.updateRunningConfig(
            config!.config_group_id,
            payload,
          )
        : await creditConfigService.createRunningConfig(payload);
      if (isApiError(res)) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success(
        isEdit ? "Config updated" : "Config created",
        successToastProperties,
      );
      void queryClient.invalidateQueries({ queryKey: ["credit-configs"] });
      onOpenChange?.(false);
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Failed to save config",
        errorToastProperties,
      ),
  });

  const creditType = watch("credit_type");
  const percentageValue = watch("percentage_credit_value");
  const fixedValue = watch("fixed_credit_value");
  const thresholdAmount = watch("threshold_amount");
  const eligibleWindow = watch("eligible_window");
  const creditValidity = watch("credit_validity");
  const maximumAllowed = watch("maximum_allowed_credit");
  const cumulativeScope = watch("cumulative_scope");

  const onSubmit = (values: RunningFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit running config" : "New running config"}
          </DialogTitle>
          <DialogDescription>
            Automatically issue credit when a customer&rsquo;s cumulative spend
            crosses the threshold.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <FieldInfoLabel
              info="Pick which of your branches this reward runs at. Customers earn credit at every branch you select."
            >
              Branches *
            </FieldInfoLabel>
            <Controller
              control={control}
              name="branch_ids"
              render={({ field }) => (
                <BranchMultiSelect
                  value={field.value}
                  onChange={field.onChange}
                  branches={branches}
                />
              )}
            />
            {errors.branch_ids && (
              <p className="text-destructive text-xs">
                {errors.branch_ids.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <FieldInfoLabel info="Percentage gives customers a percentage of their spend back as credit. Fixed gives them a flat credit amount each time they qualify.">
              Reward type *
            </FieldInfoLabel>
            <Controller
              control={control}
              name="credit_type"
              render={({ field }) => (
                <ToggleGroup
                  type="single"
                  value={field.value}
                  onValueChange={(v) =>
                    field.onChange(v as "percentage" | "fixed")
                  }
                  className="bg-muted/40 rounded-lg border p-0.5"
                >
                  <ToggleGroupItem
                    value="percentage"
                    variant="outline"
                    className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground flex-none rounded-sm border-transparent px-4"
                  >
                    Percentage
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="fixed"
                    variant="outline"
                    className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground flex-none rounded-sm border-transparent px-4"
                  >
                    Fixed
                  </ToggleGroupItem>
                </ToggleGroup>
              )}
            />
          </div>

          {creditType === "percentage" ? (
            <div className="space-y-1.5">
              <FieldInfoLabel
                htmlFor="percentage_credit_value"
                info="How much of the customer's spend they get back as credit. E.g., 5 means they get 5% back."
              >
                Percentage (%) *
              </FieldInfoLabel>
              <Input
                id="percentage_credit_value"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 5"
                {...register("percentage_credit_value", {
                  setValueAs: NULLABLE_NUMBER,
                })}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <FieldInfoLabel
                htmlFor="fixed_credit_value"
                info="The flat credit amount a customer gets each time they qualify. E.g., GH₵10 back per purchase. The max credit is set to match this automatically."
              >
                Fixed amount (GH₵) *
              </FieldInfoLabel>
              <Input
                id="fixed_credit_value"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 10"
                {...register("fixed_credit_value", {
                  setValueAs: NULLABLE_NUMBER,
                })}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <FieldInfoLabel
                htmlFor="threshold_amount"
                info="The total spend a customer needs to reach before they start earning credit. E.g., GH₵400 means they earn once they've spent GH₵400. Leave empty to reward every purchase."
              >
                Threshold (GH₵)
              </FieldInfoLabel>
              <Input
                id="threshold_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 400"
                {...register("threshold_amount", {
                  setValueAs: NULLABLE_NUMBER,
                })}
              />
            </div>
            <div className="space-y-1.5">
              <FieldInfoLabel
                htmlFor="eligible_window"
                info="How far back we look at a customer's spend to check the threshold. E.g., 30 days means only purchases in the last 30 days count. Leave empty to only count the current purchase."
              >
                Lookback (days)
              </FieldInfoLabel>
              <Input
                id="eligible_window"
                type="number"
                step="1"
                min="0"
                placeholder="e.g. 30"
                {...register("eligible_window", {
                  setValueAs: NULLABLE_NUMBER,
                })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <FieldInfoLabel
                htmlFor="credit_validity"
                info="How long the credit lasts once it's given. Leave empty for credit that never expires. E.g., 90 days means the credit expires 90 days after it's given."
              >
                Validity (days)
              </FieldInfoLabel>
              <Input
                id="credit_validity"
                type="number"
                step="1"
                min="0"
                placeholder="Lifetime if empty"
                {...register("credit_validity", {
                  setValueAs: NULLABLE_NUMBER,
                })}
              />
            </div>
            <div className="space-y-1.5">
              <FieldInfoLabel
                htmlFor="maximum_allowed_credit"
                info={
                  creditType === "fixed"
                    ? "When the reward type is Fixed, this is automatically set to match the fixed amount."
                    : "The most credit a customer can earn from a single purchase. Leave empty for no limit. E.g., GH₵50 means even a big purchase earns at most GH₵50."
                }
              >
                Max credit (GH₵)
              </FieldInfoLabel>
              <Input
                id="maximum_allowed_credit"
                type="number"
                step="0.01"
                min="0"
                placeholder={creditType === "fixed" ? "Matches fixed amount" : "No cap if empty"}
                disabled={creditType === "fixed"}
                {...register("maximum_allowed_credit", {
                  setValueAs: NULLABLE_NUMBER,
                })}
              />
              {creditType === "fixed" && (
                <p className="text-muted-foreground text-xs">
                  Auto-set to match the fixed amount.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <FieldInfoLabel info="Where we count a customer's spend toward the threshold. Per-branch only counts spend at that branch. Merchant-wide counts spend at all your branches together.">
              Cumulative scope *
            </FieldInfoLabel>
            <Controller
              control={control}
              name="cumulative_scope"
              render={({ field }) => (
                <ToggleGroup
                  type="single"
                  value={field.value}
                  onValueChange={(v) =>
                    field.onChange(v as "per_branch" | "merchant_wide")
                  }
                  className="bg-muted/40 rounded-lg border p-0.5"
                >
                  <ToggleGroupItem
                    value="per_branch"
                    variant="outline"
                    className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground flex-none rounded-sm border-transparent px-4"
                  >
                    Per-branch
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="merchant_wide"
                    variant="outline"
                    className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground flex-none rounded-sm border-transparent px-4"
                  >
                    Merchant-wide
                  </ToggleGroupItem>
                </ToggleGroup>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <FieldInfoLabel
              htmlFor="terms"
              info="Optional notes shown to the customer with their credit. E.g., 'Credit valid for 30 days. No cash redemption.'"
            >
              Terms
            </FieldInfoLabel>
            <Textarea
              id="terms"
              rows={3}
              placeholder="Optional customer-facing terms"
              {...register("terms", {
                setValueAs: (v) => (v === "" ? null : v),
              })}
            />
          </div>

          <RunningConfigSummary
            credit_type={creditType}
            percentage_credit_value={percentageValue ?? null}
            fixed_credit_value={fixedValue ?? null}
            threshold_amount={thresholdAmount ?? null}
            eligible_window={eligibleWindow ?? null}
            credit_validity={creditValidity ?? null}
            maximum_allowed_credit={maximumAllowed ?? null}
            cumulative_scope={cumulativeScope}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {isEdit ? "Save changes" : "Create config"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}