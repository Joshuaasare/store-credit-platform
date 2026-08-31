import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
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
  cn,
} from "@store-credit-platform/web-components";
import {
  creditConfigService,
  createStorageService,
} from "@store-credit-platform/api-services";
import type {
  CreateFixedCreditConfigRequest,
  FixedCreditConfig,
} from "@shared/types/api.types";
import { isApiError } from "@shared/utils/api.utils";
import {
  errorToastProperties,
  successToastProperties,
} from "@shared/utils/misc.utils";
import {
  endOfDayEpochMs,
  fromEpochMs,
  startOfMonth,
  toEpochMs,
} from "@shared/utils/date.utils";
import { useStoreStore } from "@shared/stores/storeStore";
import { compressPromoImage, isHeic } from "@shared/utils/imageCompression.utils";
import { slugify } from "@shared/utils/string.utils";
import { BranchMultiSelect } from "./BranchMultiSelect";
import { EmojiPicker } from "./EmojiPicker";
import { FieldInfoLabel } from "./FieldInfoLabel";

const storage = createStorageService();
const STORE_ASSETS_BUCKET = "store-assets";

function insertAtCursor(
  el: HTMLInputElement | HTMLTextAreaElement | null,
  value: string | null,
  emoji: string,
  apply: (next: string) => void,
) {
  const current = value ?? "";
  if (!el) {
    apply(current + emoji);
    return;
  }
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? current.length;
  const next = current.slice(0, start) + emoji + current.slice(end);
  apply(next);
  requestAnimationFrame(() => {
    el.focus();
    const pos = start + emoji.length;
    el.setSelectionRange(pos, pos);
  });
}

const fixedSchema = z.object({
  branch_ids: z.array(z.number()).min(1, "Select at least one branch"),
  title: z.string().max(120).nullable(),
  description: z.string().max(1000).nullable(),
  images: z.array(z.string()).nullable(),
  start_date: z.number().nullable(),
  end_date: z.number().nullable(),
  terms: z.string().nullable(),
});

type FixedFormValues = z.infer<typeof fixedSchema>;

interface FixedConfigDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  config?: FixedCreditConfig;
}

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
  const { branches, merchant } = useStoreStore();

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
  const [uploadingCount, setUploadingCount] = useState(0);

  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FixedFormValues>({
    resolver: zodResolver(fixedSchema),
    defaultValues: {
      branch_ids: [],
      title: null,
      description: null,
      images: [],
      start_date: null,
      end_date: null,
      terms: null,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        branch_ids: config?.branches.map((b) => b.id) ?? [],
        title: config?.title ?? null,
        description: config?.description ?? null,
        images: config?.images ?? [],
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

  // Why: on create, the server mints the config id, so uploads go to a temp folder; on edit, use the real config's folder.
  const uploadFolder = isEdit
    ? `merchant-${slugify(merchant?.name ?? "store", "store")}/promo-images/${config!.id}`
    : `merchant-${slugify(merchant?.name ?? "store", "store")}/promo-images/temp/${crypto.randomUUID()}`;

  const titleField = register("title", {
    setValueAs: (v) => (v === "" ? null : v),
  });
  const descriptionField = register("description", {
    setValueAs: (v) => (v === "" ? null : v),
  });

  const watchTitle = watch("title");
  const watchDescription = watch("description");

  const pickTitleEmoji = (emoji: string) =>
    insertAtCursor(titleRef.current, watchTitle, emoji, (next) =>
      setValue("title", next === "" ? null : next, { shouldDirty: true }),
    );
  const pickDescriptionEmoji = (emoji: string) =>
    insertAtCursor(descriptionRef.current, watchDescription, emoji, (next) =>
      setValue("description", next === "" ? null : next, { shouldDirty: true }),
    );

  const images = watch("images") ?? [];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setUploadingCount(files.length);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        if (!file.type.startsWith("image/") && !isHeic(file)) {
          toast.error("Only image files are allowed");
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 5MB`);
          continue;
        }
        const compressed = await compressPromoImage(file);
        const { publicUrl } = await storage.uploadFile(compressed, {
          bucket: STORE_ASSETS_BUCKET,
          folder: uploadFolder,
          id: config?.id ?? crypto.randomUUID(),
          contentType: compressed.type || "image/jpeg",
        });
        uploaded.push(publicUrl);
      }
      if (uploaded.length > 0) {
        setValue("images", [...images, ...uploaded], { shouldDirty: true });
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Upload failed",
        errorToastProperties,
      );
    } finally {
      setUploadingCount(0);
    }
  };

  const removeImage = (url: string) => {
    setValue(
      "images",
      images.filter((u) => u !== url),
      { shouldDirty: true },
    );
  };

  const mutation = useMutation({
    mutationFn: async (values: FixedFormValues) => {
      const payload: CreateFixedCreditConfigRequest = {
        branch_ids: values.branch_ids,
        title: values.title ?? null,
        description: values.description ?? null,
        images: values.images ?? [],
        start_date: values.start_date,
        end_date: values.end_date,
        terms: values.terms ?? null,
      };
      const res = isEdit
        ? await creditConfigService.updateFixedConfig(
            config!.id,
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

  const startDate = watch("start_date");
  const endDate = watch("end_date");
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
      end_date: t ? endOfDayEpochMs(t) : null,
    };
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
            {isEdit ? "Edit promo banner" : "New promo banner"}
          </DialogTitle>
          <DialogDescription>
            Promotional banners with a title, description, and images shown to
            customers across selected branches.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <FieldInfoLabel info="Pick which of your branches this promo is shown at.">
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
            <FieldInfoLabel htmlFor="title" info="The headline shown on the promo banner.">
              Title
            </FieldInfoLabel>
            <div className="flex gap-2">
              <Input
                id="title"
                type="text"
                maxLength={120}
                placeholder="e.g. Double Cashback Weekend 🎉"
                className="flex-1"
                {...titleField}
                ref={(el) => {
                  titleField.ref(el);
                  titleRef.current = el;
                }}
              />
              <EmojiPicker onPick={pickTitleEmoji} />
            </div>
          </div>

          <div className="space-y-1.5">
            <FieldInfoLabel
              htmlFor="description"
              info="Short description shown under the title. Keep it brief — customers see this at a glance."
            >
              Description
            </FieldInfoLabel>
            <div className="flex gap-2">
              <Textarea
                id="description"
                rows={3}
                maxLength={1000}
                placeholder="What's the promo about?"
                className="flex-1"
                {...descriptionField}
                ref={(el) => {
                  descriptionField.ref(el);
                  descriptionRef.current = el;
                }}
              />
              <EmojiPicker onPick={pickDescriptionEmoji} />
            </div>
          </div>

          <div className="space-y-1.5">
            <FieldInfoLabel info="Images shown on the promo banner. Upload up to 5MB each — they're compressed and stored at ≤500KB as JPEG. JPG/PNG/WebP/HEIC (iPhone).">
              Images
            </FieldInfoLabel>
            <div className="flex flex-wrap gap-2">
              {images.map((url) => (
                <div
                  key={url}
                  className="border-border relative h-20 w-20 overflow-hidden rounded-md border"
                >
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="bg-background/80 absolute right-1 top-1 rounded-full p-0.5"
                    aria-label="Remove image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <label
                className={cn(
                  "border-border flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground",
                  uploadingCount > 0 && "pointer-events-none opacity-50",
                )}
              >
                {uploadingCount > 0 ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Upload className="mb-1 h-4 w-4" />
                    <span>Upload</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*,image/heic,image/heif,.heic,.heif"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={uploadingCount > 0}
                />
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <FieldInfoLabel info="The dates this promo is shown as 'Active'. Optional — leave empty for an always-on banner.">
              Promo window
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
                    Promo window
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
              info="Optional customer-facing terms shown with the promo. E.g., 'Valid on Saturdays only.'"
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={mutation.isPending || uploadingCount > 0}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || uploadingCount > 0}
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