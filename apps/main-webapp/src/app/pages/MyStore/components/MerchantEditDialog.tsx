import { useEffect, useMemo, useState } from "react";
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
  Checkbox,
  Combobox,
} from "@store-credit-platform/web-components";
import { PhoneInput } from "../../../components/PhoneInput/PhoneInput";
import { countries, CountryCode } from "@shared/utils/countries";
import { useStoreStore } from "@shared/stores/storeStore";
import { MerchantWithStats } from "@shared/types/api.types";
import {
  errorToastProperties,
  successToastProperties,
} from "@shared/utils/misc.utils";

const merchantSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  country_code: z.string().min(1, "Country is required"),
  slug: z.string().optional(),
  autoSlug: z.boolean().optional(),
});

type MerchantFormValues = z.infer<typeof merchantSchema>;

interface MerchantEditDialogProps {
  merchant: MerchantWithStats;
  children?: React.ReactNode;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export function MerchantEditDialog({
  merchant,
  children,
}: MerchantEditDialogProps) {
  const { updateMerchant } = useStoreStore();
  const [open, setOpen] = useState(false);
  const [autoSlug, setAutoSlug] = useState(!merchant.slug);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MerchantFormValues>({
    resolver: zodResolver(merchantSchema),
    defaultValues: {
      name: merchant.name,
      phone: merchant.phone,
      country_code: merchant.country_code as CountryCode,
      slug: merchant.slug ?? "",
      autoSlug,
    },
  });

  useEffect(() => {
    if (open) {
      const nextAuto = !merchant.slug;
      setAutoSlug(nextAuto);
      reset({
        name: merchant.name,
        phone: merchant.phone,
        country_code: merchant.country_code as CountryCode,
        slug: merchant.slug ?? "",
        autoSlug: nextAuto,
      });
    }
  }, [open, merchant, reset]);

  const watchedName = watch("name");
  const watchedCountry = watch("country_code") as CountryCode;
  const computedSlug = useMemo(() => slugify(watchedName || ""), [watchedName]);

  const countryOptions = countries.map((c) => ({
    label: `${c.flag} ${c.name}`,
    value: c.code,
  }));

  const onSubmit = async (values: MerchantFormValues) => {
    try {
      const slugValue = autoSlug ? computedSlug || null : values.slug || null;
      await updateMerchant({
        name: values.name,
        phone: values.phone,
        country_code: values.country_code,
        slug: slugValue,
      });
      toast.success("Store profile updated", successToastProperties);
      setOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update store",
        errorToastProperties,
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit store profile</DialogTitle>
          <DialogDescription>
            Update your merchant details. Changes apply across all branches.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="merchant-name">Store name *</Label>
            <Input id="merchant-name" {...register("name")} />
            {errors.name && (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Phone *</Label>
            <PhoneInput name="phone" control={control} />
            {errors.phone && (
              <p className="text-destructive text-xs">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Country *</Label>
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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="merchant-slug">Slug (optional)</Label>
              <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Checkbox
                  checked={autoSlug}
                  onCheckedChange={(v) => {
                    const next = v === true;
                    setAutoSlug(next);
                    setValue("autoSlug", next);
                  }}
                />
                Auto from name
              </label>
            </div>
            <Input
              id="merchant-slug"
              disabled={autoSlug}
              placeholder={
                autoSlug ? computedSlug || "store-slug" : "store-slug"
              }
              {...register("slug")}
            />
            {errors.slug && (
              <p className="text-destructive text-xs">{errors.slug.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
