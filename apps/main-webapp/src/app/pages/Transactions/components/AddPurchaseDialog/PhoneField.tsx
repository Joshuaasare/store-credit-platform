import { Control, Controller, FieldValues, Path } from "react-hook-form";
import { X } from "lucide-react";
import {
  Button,
  Input,
  Label,
  cn,
} from "@store-credit-platform/web-components";
import { PhoneInput } from "@shared/components/PhoneInput/PhoneInput";
import { formatGhanaPhone } from "@shared/utils/phone.utils";

interface PhoneFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  readOnly?: boolean;
  onClear?: () => void;
}

// Wraps the existing PhoneInput and adds a clear button (×). When readOnly is
// true (e.g. after a QR scan), we render a static read-only field with the
// formatted phone — PhoneInput itself has no readOnly mode.
export function PhoneField<T extends FieldValues>({
  name,
  control,
  readOnly = false,
  onClear,
}: PhoneFieldProps<T>) {
  if (readOnly) {
    return (
      <ReadOnlyPhoneField name={name} control={control} onClear={onClear} />
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="flex items-end gap-1.5">
        <div className="flex-1">
          <PhoneInput<T> name={name} control={control} maxlength={10} />
        </div>
        {onClear && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClear}
            aria-label="Clear phone"
            className="text-muted-foreground hover:text-foreground h-10 w-10"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function ReadOnlyPhoneField<T extends FieldValues>({
  name,
  control,
  onClear,
}: {
  name: Path<T>;
  control: Control<T>;
  onClear?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Customer phone</Label>
      <div className="flex items-center gap-1.5">
        <div className="flex-1">
          <Controller
            name={name}
            control={control}
            render={({ field }) => (
              <Input
                readOnly
                value={field.value ? formatGhanaPhone(String(field.value)) : ""}
                className={cn("bg-muted/30")}
              />
            )}
          />
        </div>
        {onClear && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClear}
            aria-label="Change phone"
            className="text-muted-foreground hover:text-foreground h-10 w-10"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
