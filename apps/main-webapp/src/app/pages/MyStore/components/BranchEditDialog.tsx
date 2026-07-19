import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  Combobox,
} from "@store-credit-platform/web-components";
import { PhoneInput } from "../../../components/PhoneInput/PhoneInput";
import { countries, CountryCode } from "@shared/utils/countries";
import { useStoreStore } from "@shared/stores/storeStore";
import { BranchWithAggregates } from "@shared/types/api.types";
import {
  errorToastProperties,
  successToastProperties,
} from "@shared/utils/misc.utils";
import { Loader2 } from "lucide-react";

const branchSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name must be 80 characters or less"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z
    .string()
    .min(1, "City is required")
    .max(60, "City must be 60 characters or less"),
  country_code: z.string().min(1, "Country is required"),
});

type BranchFormValues = z.infer<typeof branchSchema>;

interface BranchEditDialogProps {
  branch?: BranchWithAggregates;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export function BranchEditDialog({
  branch,
  open,
  onOpenChange,
  children,
}: BranchEditDialogProps) {
  const isEdit = !!branch;
  const { createBranch, updateBranch } = useStoreStore();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      city: "",
      country_code: CountryCode.GH,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: branch?.name ?? "",
        phone: branch?.phone ?? "",
        address: branch?.address ?? "",
        city: branch?.city ?? "",
        country_code: (branch?.country_code as CountryCode) ?? CountryCode.GH,
      });
    }
  }, [open, branch, reset]);

  const watchedCountry = watch("country_code") as CountryCode;
  const countryOptions = countries.map((c) => ({
    label: `${c.flag} ${c.name}`,
    value: c.code,
  }));

  const onSubmit = async (values: BranchFormValues) => {
    try {
      if (isEdit && branch) {
        await updateBranch(branch.id, {
          name: values.name,
          phone: values.phone || undefined,
          address: values.address || undefined,
          city: values.city,
          country_code: values.country_code,
        });
        toast.success("Branch updated", successToastProperties);
      } else {
        await createBranch({
          name: values.name,
          phone: values.phone || undefined,
          address: values.address || undefined,
          city: values.city,
          country_code: values.country_code,
        });
        toast.success("Branch added", successToastProperties);
      }
      onOpenChange?.(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save branch",
        errorToastProperties,
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit branch" : "Add branch"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the branch details below."
              : "Fill in the details for your new branch."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="branch-name">Name *</Label>
            <Input
              id="branch-name"
              {...register("name")}
              placeholder="e.g. Osu Branch"
            />
            {errors.name && (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Phone</Label>
            <PhoneInput name="phone" control={control} />
            {errors.phone && (
              <p className="text-destructive text-xs">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branch-address">Address</Label>
            <Input
              id="branch-address"
              {...register("address")}
              placeholder="Street / landmark"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="branch-city">City *</Label>
              <Input
                id="branch-city"
                {...register("city")}
                placeholder="City"
              />
              {errors.city && (
                <p className="text-destructive text-xs">
                  {errors.city.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Combobox
                options={countryOptions}
                value={watchedCountry}
                onValueChange={(v) =>
                  setValue("country_code", v, { shouldValidate: true })
                }
                placeholder="Select country"
              />
              {errors.country_code && (
                <p className="text-destructive text-xs">
                  {errors.country_code.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Add branch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
