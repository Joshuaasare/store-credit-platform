import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@store-credit-platform/web-components";
import { PhoneInput } from "@shared/components/PhoneInput/PhoneInput";
import { countries, CountryCode } from "@shared/utils/countries";
import { useStoreStore } from "@shared/stores/storeStore";
import {
  BranchCategoryValues,
  BranchWithAggregates,
} from "@shared/types/api.types";
import {
  errorToastProperties,
  successToastProperties,
} from "@shared/utils/misc.utils";
import {
  LocationPicker,
  LocationValue,
} from "@shared/components/LocationPicker/LocationPicker";
import { Loader2 } from "lucide-react";

const BRANCH_CATEGORIES: { value: BranchCategoryValues; label: string }[] = [
  { value: "electronics", label: "Electronics" },
  { value: "home_appliances", label: "Home Appliances" },
  { value: "furniture", label: "Furniture" },
  { value: "retail_shops", label: "Retail Shops" },
  { value: "restaurants", label: "Restaurants" },
  { value: "schools", label: "Schools" },
];

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
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  place_id: z.string().nullable().optional(),
  category: z
    .enum([
      "electronics",
      "home_appliances",
      "furniture",
      "retail_shops",
      "restaurants",
      "schools",
      "__none",
    ])
    .nullable()
    .optional(),
  purchase_threshold_amount: z
    .number()
    .min(0.01, "Minimum entry must be greater than zero")
    .nullable()
    .optional(),
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
      latitude: null,
      longitude: null,
      place_id: null,
      category: null,
      purchase_threshold_amount: null,
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
        latitude: branch?.latitude ?? null,
        longitude: branch?.longitude ?? null,
        place_id: branch?.place_id ?? null,
        category: branch?.category ?? null,
        purchase_threshold_amount: branch?.purchase_threshold_amount ?? null,
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
      const location =
        values.latitude != null && values.longitude != null
          ? {
              latitude: values.latitude,
              longitude: values.longitude,
              place_id: values.place_id ?? null,
            }
          : { latitude: null, longitude: null, place_id: null };
      if (isEdit && branch) {
        await updateBranch(branch.id, {
          name: values.name,
          phone: values.phone || undefined,
          address: values.address || undefined,
          city: values.city,
          country_code: values.country_code,
          latitude: location.latitude,
          longitude: location.longitude,
          place_id: location.place_id,
          category:
            values.category === "__none" ? null : (values.category ?? null),
          purchase_threshold_amount: values.purchase_threshold_amount ?? null,
        });
        toast.success("Branch updated", successToastProperties);
      } else {
        await createBranch({
          name: values.name,
          phone: values.phone || undefined,
          address: values.address || undefined,
          city: values.city,
          country_code: values.country_code,
          latitude: location.latitude,
          longitude: location.longitude,
          place_id: location.place_id,
          category:
            values.category === "__none" ? null : (values.category ?? null),
          purchase_threshold_amount: values.purchase_threshold_amount ?? null,
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
      <DialogContent className="sm:max-w-2xl">
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

          <div className="space-y-1.5">
            <Label>Location</Label>
            <Controller
              control={control}
              name="latitude"
              render={({ field }) => {
                const lng = watch("longitude");
                const pid = watch("place_id");
                const value: LocationValue | null =
                  field.value != null && lng != null
                    ? {
                        latitude: field.value,
                        longitude: lng,
                        place_id: pid ?? null,
                      }
                    : null;
                return (
                  <LocationPicker
                    value={value}
                    onChange={(v) => {
                      field.onChange(v?.latitude ?? null);
                      setValue("longitude", v?.longitude ?? null);
                      setValue("place_id", v?.place_id ?? null);
                    }}
                  />
                );
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select
                  value={field.value ?? "__none"}
                  onValueChange={(v) =>
                    field.onChange(v === "__none" ? null : v)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Uncategorized" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Uncategorized</SelectItem>
                    {BRANCH_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="branch-purchase-threshold">
              Minimum purchase to earn rewards (GH₵)
            </Label>
            <Input
              id="branch-purchase-threshold"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Optional — e.g. 20.00"
              {...register("purchase_threshold_amount", {
                setValueAs: (v: unknown) =>
                  v === "" || v == null ? null : Number(v),
              })}
            />
            <p className="text-muted-foreground text-xs">
              Purchases below this amount won&apos;t be recorded at this branch.
              Leave blank to record every purchase.
            </p>
            {errors.purchase_threshold_amount && (
              <p className="text-destructive text-xs">
                {errors.purchase_threshold_amount.message}
              </p>
            )}
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
