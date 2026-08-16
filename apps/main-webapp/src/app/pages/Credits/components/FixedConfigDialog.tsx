import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { DateRange } from "react-day-picker";
import {
  Button,
  Calendar as CalendarPicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Textarea,
  ToggleGroup,
  ToggleGroupItem,
  cn,
} from "@store-credit-platform/web-components";
import { creditConfigService } from "@store-credit-platform/api-services";
import type {
  CreateFixedCreditConfigRequest,
  FixedCreditConfigGroup,
} from "@shared/types/api.types";
import { isApiError } from "@shared/utils/api.utils";
import {
  errorToastProperties,
  successToastProperties,
} from "@shared/utils/misc.utils";
import {
  fromEpochMs,
  startOfMonth,
  toEpochMs,
} from "@shared/utils/date.utils";
import { useStoreStore } from "@shared/stores/storeStore";
import { BranchMultiSelect } from "./BranchMultiSelect";
import { FieldInfoLabel } from "./FieldInfoLabel";
import { FixedConfigSummary } from "./ConfigSummary";

const numericNullable = z.union([z.number(), z.null()]).optional();

const fixedSchema = z.object({
  branch_ids: z.array(z.number()).min(1, "Select at least one branch"),
  credit_type: z.enum(["percentage", "fixed"]),
  percentage_credit_value: numericNullable,
  fixed_credit_value: numericNullable,
  maximum_allowed_credit: numericNullable,
  start_date: z.number().nullable(),
  end_date: z.number().nullable(),
  terms: z.string().nullable(),
});

type FixedFormValues = z.infer<typeof fixedSchema>;

interface FixedConfigDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  config?: FixedCreditConfigGroup;
}

const NULLABLE_NUMBER = (v: unknown) =>
  v === "" || v == null ? null : Number(v);

function inRangeDays(visibleMonth: Date, from?: Date, to?: Date): Date[] {
  if (!from || !to) return [];
  const first = startOfMonth(visibleMonth);
  const last = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0,
  );
  const start = from < first ? first : new Date(from);
  const end = to > last ? last : new Date(to);
  const out: Date[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const fromT = from.getTime();
  const toT = to.getTime();
  while (cur.getTime() <= end.getTime()) {
    const t = cur.getTime();
    if (t !== fromT && t !== toT) out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function formatRangeLabel(range: DateRange | undefined): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("default", { month: "short", day: "numeric" });
  if (range?.from && range?.to) return `${fmt(range.from)} – ${fmt(range.to)}`;
  if (range?.from) return `${fmt(range.from)} –`;
  return "Pick a date range";
}

export function FixedConfigDialog({
  open,
  onOpenChange,
  config,
}: FixedConfigDialogProps) {
  const isEdit = !!config;
  const queryClient = useQueryClient();
  const { branches } = useStoreStore();

  const [rangeOpen, setRangeOpen] = useState(false);
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [fromMonth, setFromMonth] = useState<Date>(() =>
    startOfMonth(fromEpochMs(config?.start_date) ?? new Date()),
  );
  const [toMonth, setToMonth] = useState<Date>(() => {
    const t = fromEpochMs(config?.end_date);
    if (t) return startOfMonth(t);
    const d = new Date();
    return startOfMonth(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FixedFormValues>({
    resolver: zodResolver(fixedSchema),
    defaultValues: {
      branch_ids: [],
      credit_type: "percentage",
      percentage_credit_value: null,
      fixed_credit_value: null,
      maximum_allowed_credit: null,
      start_date: null,
      end_date: null,
      terms: null,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        branch_ids: config?.branches.map((b) => b.id) ?? [],
        credit_type:
          (config?.credit_type as "percentage" | "fixed") ?? "percentage",
        percentage_credit_value: config?.percentage_credit_value ?? null,
        fixed_credit_value: config?.fixed_credit_value ?? null,
        maximum_allowed_credit: config?.maximum_allowed_credit ?? null,
        start_date: config?.start_date ?? null,
        end_date: config?.end_date ?? null,
        terms: config?.terms ?? null,
      });
      setCustomRange({
        from: fromEpochMs(config?.start_date),
        to: fromEpochMs(config?.end_date),
      });
    }
  }, [open, config, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FixedFormValues) => {
      const payload: CreateFixedCreditConfigRequest = {
        branch_ids: values.branch_ids,
        credit_type: values.credit_type,
        percentage_credit_value: values.percentage_credit_value ?? null,
        fixed_credit_value: values.fixed_credit_value ?? null,
        maximum_allowed_credit: values.maximum_allowed_credit ?? null,
        start_date: values.start_date,
        end_date: values.end_date,
        terms: values.terms ?? null,
      };
      const res = isEdit
        ? await creditConfigService.updateFixedConfig(
            config!.config_group_id,
            payload,
          )
        : await creditConfigService.createFixedConfig(payload);
      if (isApiError(res)) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success(
        isEdit ? "Promo updated" : "Promo created",
        successToastProperties,
      );
      void queryClient.invalidateQueries({ queryKey: ["credit-configs"] });
      onOpenChange?.(false);
    },
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Failed to save promo",
        errorToastProperties,
      ),
  });

  const creditType = watch("credit_type");
  const startDate = watch("start_date");
  const endDate = watch("end_date");
  const percentageValue = watch("percentage_credit_value");
  const fixedValue = watch("fixed_credit_value");
  const maximumAllowed = watch("maximum_allowed_credit");
  const from = fromEpochMs(startDate);
  const to = fromEpochMs(endDate);

  const setFrom = (d: Date | undefined) => {
    setCustomRange((r) => ({ from: d, to: r?.to }));
  };
  const setTo = (d: Date | undefined) => {
    setCustomRange((r) => ({ from: r?.from, to: d }));
  };

  const applyCustomRange = () => {
    let f = customRange?.from;
    let t = customRange?.to;
    if (f && t && t < f) {
      const tmp = f;
      f = t;
      t = tmp;
    }
    const next = {
      start_date: f ? toEpochMs(f) : null,
      end_date: t ? toEpochMs(t) : null,
    };
    // Patch form state directly via react-hook-form setValue on the controller values.
    // We use reset to merge the new dates with the existing values.
    reset((prev) => ({ ...prev, ...next }));
    setRangeOpen(false);
  };

  const onSubmit = (values: FixedFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit fixed promo" : "New fixed promo"}
          </DialogTitle>
          <DialogDescription>
            Time-bound promotional registry. No credits are issued automatically
            — record payouts out-of-band.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <FieldInfoLabel info="Pick which of your branches this promo is shown at. Staff at any selected branch will see it during the promo window.">
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
            <FieldInfoLabel info="Describes how the promo reward works, for staff reference. Fixed promos don't issue credit automatically — they're just listed so staff know about the promo.">
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
                info="The cashback percentage shown on the promo listing. E.g., 5 means '5% cashback' is shown to staff. Not applied automatically."
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
                info="The flat reward amount shown on the promo listing. E.g., GH₵10 means 'GH₵10 cashback' is shown to staff. The max credit is set to match this automatically."
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

          <div className="space-y-1.5">
            <FieldInfoLabel
              htmlFor="maximum_allowed_credit"
              info={
                creditType === "fixed"
                  ? "When the reward type is Fixed, this is automatically set to match the fixed amount."
                  : "The cap shown on the promo listing. Leave empty for no stated cap. Not enforced automatically."
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

          <div className="space-y-1.5">
            <FieldInfoLabel info="The dates this promo is shown as 'Active' to staff. No credit is issued automatically — the dates just mark when the promo is live.">
              Promo window *
            </FieldInfoLabel>
            <Popover
              open={rangeOpen}
              onOpenChange={(o) => {
                setRangeOpen(o);
                if (o) {
                  setCustomRange({
                    from: fromEpochMs(startDate),
                    to: fromEpochMs(endDate),
                  });
                  setFromMonth(
                    startOfMonth(fromEpochMs(startDate) ?? new Date()),
                  );
                  setToMonth(
                    startOfMonth(
                      fromEpochMs(endDate) ??
                        new Date(
                          new Date().getFullYear(),
                          new Date().getMonth() + 1,
                          1,
                        ),
                    ),
                  );
                }
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="border-input shadow-xs flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-1.5 text-sm outline-none focus-visible:ring-[3px]"
                >
                  <span
                    className={cn(
                      "min-w-0 truncate",
                      !(from || to) && "text-muted-foreground",
                    )}
                  >
                    {formatRangeLabel({ from, to })}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                <div className="space-y-3">
                  <div className="text-muted-foreground text-xs font-medium">
                    Custom promo window
                  </div>
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="space-y-1">
                      <div className="text-primary px-1 text-[11px] font-semibold uppercase tracking-wide">
                        From
                      </div>
                      <CalendarPicker
                        mode="single"
                        month={fromMonth}
                        onMonthChange={setFromMonth}
                        selected={customRange?.from}
                        onSelect={setFrom}
                        endMonth={customRange?.to}
                        disabled={
                          customRange?.to
                            ? { after: customRange.to }
                            : undefined
                        }
                        modifiers={{
                          range: inRangeDays(
                            fromMonth,
                            customRange?.from,
                            customRange?.to,
                          ),
                        }}
                        modifiersClassNames={{
                          range: "bg-accent text-accent-foreground rounded-md",
                        }}
                        className="rounded-md border"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="px-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                        To
                      </div>
                      <CalendarPicker
                        mode="single"
                        month={toMonth}
                        onMonthChange={setToMonth}
                        selected={customRange?.to}
                        onSelect={setTo}
                        startMonth={customRange?.from}
                        disabled={
                          customRange?.from
                            ? { before: customRange.from }
                            : undefined
                        }
                        modifiers={{
                          range: inRangeDays(
                            toMonth,
                            customRange?.from,
                            customRange?.to,
                          ),
                        }}
                        modifiersClassNames={{
                          range: "bg-accent text-accent-foreground rounded-md",
                        }}
                        className="rounded-md border"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRangeOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={applyCustomRange}
                      disabled={!customRange?.from || !customRange?.to}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <FieldInfoLabel
              htmlFor="terms"
              info="Optional notes shown with the promo. E.g., 'Valid on Saturdays only. No cash redemption.'"
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

          <FixedConfigSummary
            credit_type={creditType}
            percentage_credit_value={percentageValue ?? null}
            fixed_credit_value={fixedValue ?? null}
            maximum_allowed_credit={maximumAllowed ?? null}
            start_date={startDate ?? null}
            end_date={endDate ?? null}
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
            <Button
              type="submit"
              disabled={
                mutation.isPending || startDate == null || endDate == null
              }
            >
              {mutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {isEdit ? "Save changes" : "Create promo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
