import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@store-credit-platform/web-components";
import {
  transactionService,
  customerService,
} from "@store-credit-platform/api-services";
import { useStoreStore } from "@shared/stores/storeStore";
import { useAuthStore } from "@shared/stores/authStore";
import { BaseCustomer } from "@shared/types/api.types";
import {
  errorToastProperties,
  successToastProperties,
} from "@shared/utils/misc.utils";
import { isApiError } from "@shared/utils/api.utils";
import { normalizePhone } from "@shared/utils/phone.utils";
import { QrScanner } from "./QrScanner";
import { PhoneField } from "./PhoneField";
import { CustomerTypeahead } from "./CustomerTypeahead";
import { CustomerChip } from "./CustomerChip";

const purchaseSchema = z.object({
  phone: z
    .string()
    .min(6, "Enter a valid phone number")
    .regex(/^\+?\d+$/, "Enter a valid phone number")
    .refine((v) => v.replace(/\D/g, "").length === 12, {
      message: "Phone number must be 10 digits",
    }),
  amount: z
    .number({ error: "Amount is required" })
    .min(0.01, "Amount must be greater than zero"),
  branchId: z.number().nullable(),
});

// Ghana: 9 national digits + "233" prefix stored by PhoneInput = 12 total.
const REQUIRED_DIGITS = 12;

type PurchaseFormValues = z.infer<typeof purchaseSchema>;

type Mode = "phone" | "scan" | "form";

interface AddPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryMode: Mode;
  onEntryModeConsumed?: () => void;
}

export function AddPurchaseDialog({
  open,
  onOpenChange,
  entryMode,
  onEntryModeConsumed,
}: AddPurchaseDialogProps) {
  const queryClient = useQueryClient();
  const { branches } = useStoreStore();
  const user = useAuthStore((s) => s.user);
  const userBranchId = user?.branch_id ?? null;
  const [identified, setIdentified] = useState<BaseCustomer | null>(null);
  const [readOnlyPhone, setReadOnlyPhone] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      phone: "",
      amount: NaN,
      branchId: userBranchId,
    },
  });

  const phoneValue = watch("phone") ?? "";

  useEffect(() => {
    if (open) {
      reset({ phone: "", amount: NaN, branchId: userBranchId });
      setIdentified(null);
      setReadOnlyPhone(false);
    }
  }, [open, reset, userBranchId]);

  // Apply the entry mode from the trigger dropdown. "phone" or "scan" stays
  // visible until the user finishes; "form" is the post-scan state.
  useEffect(() => {
    if (!open) return;
    if (entryMode === "phone") {
      setReadOnlyPhone(false);
    } else if (entryMode === "scan") {
      setReadOnlyPhone(false);
    } else if (entryMode === "form") {
      setReadOnlyPhone(true);
    }
  }, [open, entryMode]);

  // After a QR scan the phone is read-only and the typeahead is hidden, so we
  // run a one-shot lookup against the scanned digits and surface the matching
  // customer as the chip.
  const scannedLookup = useQuery({
    queryKey: ["customers", "global-search", phoneValue, 1],
    enabled:
      readOnlyPhone && phoneValue.replace(/\D/g, "").length >= 3 && !identified,
    queryFn: async () => {
      const digits = phoneValue.replace(/\D/g, "");
      const res = await customerService.globalSearchByPhone(digits, 1);
      if (!res.success) throw new Error(res.error);
      return res.data.rows;
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!scannedLookup.data || scannedLookup.data.length === 0) return;
    if (identified) return;
    setIdentified(scannedLookup.data[0]);
  }, [scannedLookup.data, identified]);

  const selectedBranchId = watch("branchId");
  const selectedBranch =
    branches.find((b) => b.id === selectedBranchId) ?? null;
  const entryThreshold = selectedBranch?.purchase_threshold_amount ?? null;

  const amountValue = watch("amount");
  const branchIdValue = watch("branchId");
  // PhoneInput stores "233XXXXXXXXX" (12 digits) regardless of whether the
  // user typed a leading 0. Count the digits in the stored form value.
  const phoneDigits = phoneValue.replace(/\D/g, "").length;
  const phoneComplete = phoneDigits === REQUIRED_DIGITS;
  const canSubmit =
    phoneComplete &&
    typeof amountValue === "number" &&
    !Number.isNaN(amountValue) &&
    amountValue > 0 &&
    branchIdValue != null;

  const mutation = useMutation({
    mutationFn: async (values: PurchaseFormValues) => {
      const res = await transactionService.createPurchase({
        phone: normalizePhone(values.phone),
        amount: values.amount,
        branch_id: values.branchId,
      });
      if (isApiError(res)) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Purchase recorded", successToastProperties);
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to record purchase",
        errorToastProperties,
      );
    },
  });

  const onSubmit = (values: PurchaseFormValues) => {
    if (entryThreshold != null && values.amount < entryThreshold) {
      toast.error(
        `Amount is below ${selectedBranch?.name?.trim() || "this branch"}'s minimum entry of GH₵${entryThreshold.toFixed(2)}`,
        errorToastProperties,
      );
      return;
    }
    mutation.mutate(values);
  };

  const handleScanSuccess = (phone: string) => {
    reset(
      { phone, amount: watch("amount"), branchId: watch("branchId") },
      { keepDirty: false },
    );
    setReadOnlyPhone(true);
    onEntryModeConsumed?.();
  };

  const handleSwitchToManual = () => {
    setReadOnlyPhone(false);
    onEntryModeConsumed?.();
  };

  const handleClearIdentified = () => {
    setIdentified(null);
    setReadOnlyPhone(false);
    reset({ phone: "", amount: watch("amount"), branchId: watch("branchId") });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (mutation.isPending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a purchase</DialogTitle>
          <DialogDescription>
            Log a customer purchase. A new customer is created automatically
            when the phone isn&rsquo;t already on file.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          autoComplete="off"
        >
          {entryMode === "scan" && !readOnlyPhone && (
            <QrScanner
              onDecode={handleScanSuccess}
              onSwitchToManual={handleSwitchToManual}
            />
          )}

          <div className="space-y-1.5">
            {!readOnlyPhone && <Label>Customer phone *</Label>}
            <PhoneField
              name="phone"
              control={control}
              readOnly={readOnlyPhone}
              onClear={readOnlyPhone ? handleClearIdentified : undefined}
            />
            {!readOnlyPhone && (
              <CustomerTypeahead
                rawPhone={phoneValue}
                onSelect={(c) => {
                  reset(
                    {
                      phone: c.phone ?? "",
                      amount: watch("amount"),
                      branchId: watch("branchId"),
                    },
                    { keepDirty: true },
                  );
                  setIdentified(c);
                }}
                disabled={mutation.isPending}
              />
            )}
            {identified && (
              <CustomerChip
                customer={identified}
                onChange={handleClearIdentified}
                disabled={mutation.isPending}
              />
            )}
            {errors.phone && (
              <p className="text-destructive text-xs">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="purchase-branch">Branch *</Label>
            <Controller
              control={control}
              name="branchId"
              render={({ field }) => (
                <Select
                  value={field.value == null ? "" : String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v))}
                  disabled={mutation.isPending}
                >
                  <SelectTrigger id="purchase-branch" className="w-full">
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name?.trim() || "Unnamed branch"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.branchId && (
              <p className="text-destructive text-xs">
                {errors.branchId.message}
              </p>
            )}
            {entryThreshold != null ? (
              <p className="text-muted-foreground text-xs">
                Min. entry for {selectedBranch?.name?.trim() || "this branch"}:{" "}
                <span className="text-foreground font-medium">
                  GH₵{entryThreshold.toFixed(2)}
                </span>
                . Purchases below this won&apos;t be recorded.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="purchase-amount">Amount (GH₵) *</Label>
            <Input
              id="purchase-amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 50.00"
              disabled={mutation.isPending}
              {...register("amount", {
                setValueAs: (v: unknown) =>
                  v === "" || v == null ? NaN : Number(v),
              })}
            />
            {errors.amount && (
              <p className="text-destructive text-xs">
                {errors.amount.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || !canSubmit}>
              {mutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {mutation.isPending ? "Recording…" : "Record purchase"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
