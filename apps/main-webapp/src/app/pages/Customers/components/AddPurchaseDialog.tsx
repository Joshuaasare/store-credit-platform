import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
} from "@store-credit-platform/web-components";
import { customerService } from "@store-credit-platform/api-services";
import { PhoneInput } from "../../../components/PhoneInput/PhoneInput";

const purchaseSchema = z.object({
  phone: z
    .string()
    .min(6, "Enter a valid phone number")
    .regex(/^\+\d{6,}$/, "Phone must be in E.164 format (e.g. +233...)"),
  amount: z
    .number({ error: "Amount is required" })
    .min(0.01, "Amount must be greater than zero"),
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

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      phone: "",
      amount: undefined as unknown as number,
    },
  });

  useEffect(() => {
    if (open) {
      reset({ phone: "", amount: NaN });
    }
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: async (values: PurchaseFormValues) => {
      const res = await customerService.createPurchase({
        phone: values.phone,
        amount: values.amount,
      });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Purchase recorded");
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      onOpenChange?.(false);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to record purchase");
    },
  });

  const onSubmit = (values: PurchaseFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a purchase</DialogTitle>
          <DialogDescription>
            Log a customer purchase. A new customer is created automatically when
            the phone isn&rsquo;t already on file.
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
              <p className="text-destructive text-xs">{errors.amount.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Record purchase"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}