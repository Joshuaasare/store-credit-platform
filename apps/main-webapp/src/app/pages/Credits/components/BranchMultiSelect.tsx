import {
  MultiSelect,
  MultiSelectTrigger,
  MultiSelectValue,
  MultiSelectContent,
  MultiSelectItem,
  MultiSelectGroup,
} from "@store-credit-platform/web-components";
import type { BaseBranch } from "@shared/types/api.types";

interface BranchMultiSelectProps {
  value: number[];
  onChange: (ids: number[]) => void;
  branches: Pick<BaseBranch, "id" | "name" | "city">[];
  disabled?: boolean;
  placeholder?: string;
}

export function BranchMultiSelect({
  value,
  onChange,
  branches,
  disabled,
  placeholder = "Select branches",
}: BranchMultiSelectProps) {
  const selected = value.map(String);
  return (
    <MultiSelect
      values={selected}
      onValuesChange={(vals) => onChange(vals.map(Number))}
    >
      <MultiSelectTrigger disabled={disabled} className="h-auto min-h-9 w-full">
        <MultiSelectValue placeholder={placeholder} />
      </MultiSelectTrigger>
      <MultiSelectContent>
        <MultiSelectGroup>
          {branches.map((b) => {
            const label = b.name?.trim() || "Unnamed branch";
            return (
              <MultiSelectItem
                key={b.id}
                value={String(b.id)}
                badgeLabel={label}
              >
                {label} · {b.city}
              </MultiSelectItem>
            );
          })}
        </MultiSelectGroup>
      </MultiSelectContent>
    </MultiSelect>
  );
}