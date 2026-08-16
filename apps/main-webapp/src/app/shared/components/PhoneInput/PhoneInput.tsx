import { useState } from "react";
import { Control, FieldValues, Path, useController } from "react-hook-form";

import {
  countries,
  defaultCountry,
  Country,
  CountryCode,
  formatPhoneWithCountry,
  parsePhoneNumber,
} from "@shared/utils/countries";
import {
  cn,
  Combobox,
  Input,
  Label,
} from "@store-credit-platform/web-components";

interface PhoneInputProps<T extends FieldValues> {
  label?: string;
  name: Path<T>;
  control?: Control<T>;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
  placeholder?: string;
  required?: boolean;
  storeInternationalFormat?: boolean;
  defaultCountryCode?: CountryCode;
  maxlength?: number;
}

export function PhoneInput<T extends FieldValues>({
  label,
  name,
  control,
  disabled,
  className,
  placeholder = "Enter phone number",
  required,
  storeInternationalFormat = true,
  defaultCountryCode = CountryCode.GH,
  maxlength,
  labelClassName,
}: PhoneInputProps<T>) {
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });

  // Parse initial value to get country and local number
  const initialParsed = field.value
    ? parsePhoneNumber(field.value)
    : {
        country: countries.find((c) => c.code === defaultCountryCode),
        localNumber: "",
      };

  const [selectedCountry, setSelectedCountry] = useState<Country>(
    initialParsed.country || defaultCountry,
  );
  const [localNumber, setLocalNumber] = useState<string>(
    initialParsed.localNumber || "",
  );

  const countryOptions = countries.map((country) => ({
    label: country.name,
    value: country.code,
  }));
  // Update form value when local number or country changes
  const updateFormValue = (newLocalNumber: string, newCountry: Country) => {
    if (!newLocalNumber || newLocalNumber.trim() === "") {
      field.onChange("");
      return;
    }

    if (storeInternationalFormat) {
      // Store as: "233501234567" (international format without +)
      const formatted = formatPhoneWithCountry(newLocalNumber, newCountry.code);
      field.onChange(formatted);
    } else {
      // Store as: "0501234567" (local format)
      const cleanLocal = newLocalNumber.startsWith("0")
        ? newLocalNumber
        : `0${newLocalNumber}`;
      field.onChange(cleanLocal);
    }
  };

  const handleLocalNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only digits and ensure reasonable length
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 15) {
      setLocalNumber(cleaned);
      updateFormValue(cleaned, selectedCountry);
    }
  };

  const handleCountrySelect = (countryCode: string) => {
    const country = countries.find((c) => c.code === countryCode);
    if (country) {
      setSelectedCountry(country);
      updateFormValue(localNumber, country);
    }
  };

  return (
    <div className={cn("space-y-1.5")}>
      {label && (
        <Label htmlFor={name} className={cn("", labelClassName)}>
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </Label>
      )}
      <div className="flex gap-0">
        <Combobox
          options={countryOptions}
          value={selectedCountry.code}
          onValueChange={handleCountrySelect}
          searchPlaceholder="Search country..."
          disabled={disabled}
          triggerTextClassName="line-clamp-none "
          className={cn(
            "max-w-[90px] rounded-r-none border-r-0 pl-2 pr-1",
            error && "border-destructive",
          )}
          renderSelected={(option) => {
            const country = countries.find((c) => c.code === option.value);
            return country ? (
              <span className="flex items-center justify-between gap-1">
                <span className="text-sm">{country.flag}</span>
                <span className="text-xs">+{country.dialCode}</span>
              </span>
            ) : (
              option.label
            );
          }}
          renderOption={(option) => {
            const country = countries.find((c) => c.code === option.value);
            return country ? (
              <div className="flex w-full items-center gap-2">
                <span className="text-lg">{country.flag}</span>
                <span className="flex-1">{country.name}</span>
                <span className="text-muted-foreground">
                  +{country.dialCode}
                </span>
              </div>
            ) : (
              option.label
            );
          }}
        />

        {/* Phone Number Input */}
        <div className="flex-1">
          <Input
            id={name}
            type="tel"
            value={localNumber}
            onChange={handleLocalNumberChange}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxlength}
            className={cn(
              "rounded-l-none border-l-0",
              error && "border-destructive",
              className,
            )}
          />
        </div>
      </div>
      {error && <p className="text-destructive text-sm">{error.message}</p>}
    </div>
  );
}
