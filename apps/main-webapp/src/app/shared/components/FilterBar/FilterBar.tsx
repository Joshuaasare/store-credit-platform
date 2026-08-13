import {
  Combobox,
  MultiSelect,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
  MultiSelectTrigger,
  MultiSelectValue,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@store-credit-platform/web-components";
import { isEmpty } from "@shared/utils/misc.utils";
import { Loader2 } from "lucide-react";

export type SelectOption = {
  label: string;
  value: string;
};

export interface FilterOption {
  id: string;
  label: string;
  placeholder?: string;
  options: SelectOption[];
  type: "select" | "multiselect" | "combobox";
  disabled?: boolean;
  value?: string | string[];
  triggerClassName?: string;
  noOptionsMessage?: React.ReactNode;
  optionsLoading?: boolean;
  onInputValueChange?: (value: string) => void;
}

interface FilterBarProps {
  filters?: FilterOption[];
  onFilterChange?: (filterId: string, value: string | string[]) => void;
}

export function FilterBar({ filters = [], onFilterChange }: FilterBarProps) {
  const renderSelectFilter = (filter: FilterOption, index?: number) => (
    <Select
      disabled={filter?.disabled}
      key={`filter-select-${filter.id}-${index}`}
      onValueChange={(value) => onFilterChange?.(filter.id, value)}
      value={
        filter?.options?.find?.((opt) => opt.value === filter.value)?.value ??
        undefined
      }
    >
      <SelectTrigger
        className={filter.triggerClassName}
        disabled={filter?.disabled}
      >
        <SelectValue placeholder={filter.placeholder ?? filter.label} />
      </SelectTrigger>
      <SelectContent>
        {filter.options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
        {isEmpty(filter?.options) && !filter.optionsLoading && (
          <div className="m-2 max-w-[200px] gap-2 text-sm text-gray-500">
            {filter.noOptionsMessage ?? "No options available"}
          </div>
        )}
        {filter.optionsLoading && (
          <div className="m-2 flex flex-1 items-center justify-center">
            <Loader2 className="mr-2 inline-block size-4 animate-spin" />
          </div>
        )}
      </SelectContent>
    </Select>
  );

  const renderMultiSelectFilter = (filter: FilterOption, index?: number) => {
    return (
      <MultiSelect
        key={`filter-multiselect-${filter.id}-${index}`}
        onValuesChange={(values) => onFilterChange?.(filter.id, values)}
        values={filter.value as string[]}
      >
        <MultiSelectTrigger
          disabled={filter?.disabled}
          className={filter.triggerClassName}
        >
          <MultiSelectValue placeholder={filter.placeholder} />
        </MultiSelectTrigger>
        <MultiSelectContent>
          {/* Items must be wrapped in a group for proper styling */}
          <MultiSelectGroup>
            {filter.options.map(({ value, label }) => (
              <MultiSelectItem key={value} value={value}>
                {label}
              </MultiSelectItem>
            ))}
          </MultiSelectGroup>
        </MultiSelectContent>
      </MultiSelect>
    );
    // Placeholder for multiselect rendering logic
  };

  const renderComboBoxFilter = (filter: FilterOption, index?: number) => {
    return (
      <Combobox
        key={`filter-combobox-${filter.id}-${index}`}
        options={filter.options}
        placeholder={filter.placeholder}
        disabled={filter.disabled}
        onValueChange={(value) => onFilterChange?.(filter.id, value)}
        value={filter.value as string}
        className={filter.triggerClassName}
        onInputValueChange={filter.onInputValueChange}
      />
    );
  };

  return (
    <>
      {filters.map((filter, index) => {
        switch (filter.type) {
          case "select":
            return renderSelectFilter(filter, index);

          case "multiselect":
            return renderMultiSelectFilter(filter, index);
          case "combobox":
            return renderComboBoxFilter(filter, index);

          default:
            return renderSelectFilter(filter, index);
        }
      })}
    </>
  );
}
