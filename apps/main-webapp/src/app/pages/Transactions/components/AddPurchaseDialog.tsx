import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@store-credit-platform/web-components";
import { transactionService } from "@store-credit-platform/api-services";
import { useStoreStore } from "@shared/stores/storeStore";
import { useAuthStore } from "@shared/stores/authStore";
import { PhoneInput } from "@shared/components/PhoneInput/PhoneInput";
import {
  errorToastProperties,
  successToastProperties,
} from "@shared/utils/misc.utils";
import { isApiError } from "@shared/utils/api.utils";
import { Loader2 } from "lucide-react";

const purchaseSchema = z.object({
  phone: z
    .string()
    .min(6, "Enter a valid phone number")
    .regex(/^\+?\d+$/, "Enter a valid phone number"),
  amount: z
    .number({ error: "Amount is required" })
    .min(0.01, "Amount must be greater than zero"),
  branchId: z.number().nullable(),
});

type PurchaseFormValues = z.infer<typeof purchaseSchema>;

interface AddPurchaseDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export function AddPurchaseDialog({
  open,
  onOpenChange,
  children,
}: AddPurchaseDialogProps) {
  const queryClient = useQueryClient();
  const { branches } = useStoreStore();
  const user = useAuthStore((s) => s.user);

  const userBranchId = user?.branch_id ?? null;

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

  useEffect(() => {
    if (open) {
      reset({ phone: "", amount: NaN, branchId: userBranchId });
    }
  }, [open, reset, userBranchId]);

  const selectedBranchId = watch("branchId");
  const selectedBranch =
    branches.find((b) => b.id === selectedBranchId) ?? null;
  const entryThreshold = selectedBranch?.purchase_threshold_amount ?? null;

  const mutation = useMutation({
    mutationFn: async (values: PurchaseFormValues) => {
      const res = await transactionService.createPurchase({
        phone: values.phone,
        amount: values.amount,
        branch_id: values.branchId,
      });
      if (isApiError(res)) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Purchase recorded", successToastProperties);
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      onOpenChange?.(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a purchase</DialogTitle>
          <DialogDescription>
            Log a customer purchase. A new customer is created automatically
            when the phone isn&rsquo;t already on file.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Customer phone *</Label>
            <PhoneInput name="phone" control={control} />
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
              <p className="text-xs text-muted-foreground">
                Min. entry for{" "}
                {selectedBranch?.name?.trim() || "this branch"}:{" "}
                <span className="font-medium text-foreground">
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
              onClick={() => onOpenChange?.(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Record purchase
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
