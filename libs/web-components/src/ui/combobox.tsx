"use client";

import * as React from "react";
import { ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  Popover,
  PopoverContent,
  PopoverTrigger,
  CommandList,
  Button,
} from ".";

export type ComboboxOption = {
  label: string;
  value: string;
};

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  onInputValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  className?: string;
  disabled?: boolean;
  renderOption?: (option: ComboboxOption, index?: number) => React.ReactNode;
  renderSelected?: (option: ComboboxOption) => React.ReactNode;
  isOptionsLoading?: boolean;
  triggerTextClassName?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  noResultsText = "No results found.",
  className,
  disabled = false,
  renderOption,
  renderSelected,
  onInputValueChange,
  isOptionsLoading,
  triggerTextClassName,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between gap-1", className)}
          disabled={disabled}
        >
          <div className={cn("line-clamp-1 text-left", triggerTextClassName)}>
            {(selectedOption && renderSelected?.(selectedOption)) ??
              selectedOption?.label ??
              placeholder}
          </div>

          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command>
          <CommandInput
            onValueChange={onInputValueChange}
            placeholder={searchPlaceholder}
          />
          {isOptionsLoading && (
            <div className="m-2 flex flex-1 items-center justify-center">
              <Loader2 className="mr-2 inline-block size-4 animate-spin" />
            </div>
          )}
          {!isOptionsLoading && <CommandEmpty>{noResultsText}</CommandEmpty>}
          <CommandList>
            <CommandGroup>
              {options.map((option, index) => {
                const selected = value === option.value;
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    className={selected ? "bg-accent/10" : ""}
                    onSelect={() => {
                      onValueChange?.(option.value);
                      setOpen(false);
                    }}
                  >
                    {renderOption ? renderOption(option, index) : option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
