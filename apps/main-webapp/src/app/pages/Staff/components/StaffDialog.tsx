import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Textarea,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@store-credit-platform/web-components";
import { PhoneInput } from "../../../components/PhoneInput/PhoneInput";
import { CountryCode } from "@shared/utils/countries";
import { staffService } from "@store-credit-platform/api-services";
import { isApiError } from "@shared/utils/api.utils";
import { useStoreStore } from "@shared/stores/storeStore";
import type { Staff } from "@shared/types/api.types";
import {
  errorToastProperties,
  successToastProperties,
} from "@shared/utils/misc.utils";

const staffSchema = z.object({
  phone: z.string().min(6, "Enter a valid phone number"),
  surname: z
    .string()
    .min(1, "Surname is required")
    .max(80, "Surname must be 80 characters or less"),
  other_names: z.string().optional(),
  role: z.enum(["manager", "cashier"]),
  branch_id: z.number().int().positive("Select a branch"),
  access_granted: z.boolean(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type StaffFormValues = z.infer<typeof staffSchema>;

interface StaffDialogProps {
  staff?: Staff;
  currentUserId?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSaved?: () => void;
}

export function StaffDialog({
  staff,
  currentUserId,
  open,
  onOpenChange,
  onSaved,
}: StaffDialogProps) {
  const isEdit = !!staff;
  const isSelf = isEdit && staff?.user.id != null && staff.user.id === currentUserId;
  const { branches } = useStoreStore();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      phone: "",
      surname: "",
      other_names: "",
      role: "cashier",
      branch_id: 0,
      access_granted: true,
      address: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      phone: staff?.user.phone ?? "",
      surname: staff?.user.surname ?? "",
      other_names: staff?.user.other_names ?? "",
      role: (staff?.role as "manager" | "cashier") ?? "cashier",
      branch_id: staff?.branch_id ?? (branches[0]?.id ?? 0),
      access_granted: staff?.user.access_granted ?? true,
      address: staff?.address ?? "",
      notes: staff?.notes ?? "",
    });
  }, [open, staff, branches, reset]);

  const watchedBranch = watch("branch_id");
  const watchedRole = watch("role");
  const watchedAccess = watch("access_granted");

  const onSubmit = async (values: StaffFormValues) => {
    const payload = {
      phone: values.phone,
      surname: values.surname,
      other_names: values.other_names || null,
      role: values.role,
      branch_id: values.branch_id,
      access_granted: values.access_granted,
      address: values.address || null,
      notes: values.notes || null,
    };
    try {
      if (isEdit && staff) {
        const res = await staffService.updateStaff(staff.user.id, payload);
        if (isApiError(res)) throw new Error(res.error);
        toast.success("Staff member updated", successToastProperties);
      } else {
        const res = await staffService.createStaff(payload);
        if (isApiError(res)) throw new Error(res.error);
        toast.success("Staff member added", successToastProperties);
      }
      onSaved?.();
      onOpenChange?.(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save staff member",
        errorToastProperties,
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit staff member" : "Add staff member"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the staff member's details, role, and branch."
              : "Create a new staff account. They'll log in with the phone number via OTP."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Phone *</Label>
            <PhoneInput
              name="phone"
              control={control}
              placeholder="e.g. 024 123 4567"
              defaultCountryCode={CountryCode.GH}
            />
            {errors.phone && (
              <p className="text-destructive text-xs">{errors.phone.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="staff-surname">Surname *</Label>
              <Input id="staff-surname" {...register("surname")} placeholder="e.g. Asare" />
              {errors.surname && (
                <p className="text-destructive text-xs">{errors.surname.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staff-other">Other names</Label>
              <Input
                id="staff-other"
                {...register("other_names")}
                placeholder="e.g. Joshua"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select
                value={watchedRole}
                disabled={isSelf}
                onValueChange={(v) =>
                  setValue("role", v as "manager" | "cashier", {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-destructive text-xs">{errors.role.message}</p>
              )}
              {isSelf && (
                <p className="text-muted-foreground text-xs">
                  You can't change your own role.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Branch *</Label>
              <Select
                value={watchedBranch ? String(watchedBranch) : ""}
                onValueChange={(v) =>
                  setValue("branch_id", Number(v), { shouldValidate: true })
                }
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name?.trim() || "Unnamed branch"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.branch_id && (
                <p className="text-destructive text-xs">
                  {errors.branch_id.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="staff-address">Address</Label>
            <Input
              id="staff-address"
              {...register("address")}
              placeholder="Street / landmark (optional)"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="staff-notes">Notes</Label>
            <Textarea
              id="staff-notes"
              {...register("notes")}
              placeholder="Internal notes about this staff member (optional)"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="staff-access">Access granted</Label>
              <p className="text-muted-foreground text-xs">
                {isSelf
                  ? "You can't change your own access."
                  : "When off, the staff member cannot log in."}
              </p>
            </div>
            <Switch
              id="staff-access"
              checked={watchedAccess}
              disabled={isSelf}
              onCheckedChange={(checked) =>
                setValue("access_granted", checked, { shouldValidate: true })
              }
            />
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
              {isEdit ? "Save changes" : "Add staff"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}