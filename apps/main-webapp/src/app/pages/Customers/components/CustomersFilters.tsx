import { useState } from "react";
import { Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Button,
  Calendar as CalendarPicker,
  Label,
  cn,
} from "@store-credit-platform/web-components";
import { BranchWithAggregates } from "@shared/types/api.types";
import { LeaderboardSort } from "@shared/types/customer.types";

export type DatePreset = "this_year" | "custom" | "all";

export interface CustomersFiltersValue {
  sort?: LeaderboardSort;
  branchId: number | null;
  datePreset: DatePreset;
  start: number | null;
  end: number | null;
}

interface CustomersFiltersProps {
  value: CustomersFiltersValue;
  onChange: (next: CustomersFiltersValue) => void;
  branches: BranchWithAggregates[];
  showSort?: boolean;
  rightSlot?: React.ReactNode;
}

const SORT_OPTIONS: { value: LeaderboardSort; label: string }[] = [
  { value: "purchases", label: "Purchases made" },
  { value: "credits_issued", label: "Credits issued" },
  { value: "credits_redeemed", label: "Credits redeemed" },
];

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "this_year", label: "This year" },
  { value: "custom", label: "Custom" },
  { value: "all", label: "All" },
];

function epochFromDatePickerDate(d: Date | undefined): number | null {
  if (!d) return null;
  return Math.floor(d.getTime() / 1000);
}

function datePickerDateFromEpoch(epoch: number | null): Date | undefined {
  if (!epoch) return undefined;
  return new Date(epoch * 1000);
}

export function CustomersFilters({
  value,
  onChange,
  branches,
  showSort = false,
  rightSlot,
}: CustomersFiltersProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState<Date | undefined>(
    datePickerDateFromEpoch(value.start),
  );
  const [customEnd, setCustomEnd] = useState<Date | undefined>(
    datePickerDateFromEpoch(value.end),
  );

  const applyCustomRange = () => {
    let s = customStart;
    let e = customEnd;
    if (s && e && e < s) {
      const tmp = s;
      s = e;
      e = tmp;
    }
    onChange({
      ...value,
      datePreset: "custom",
      start: epochFromDatePickerDate(s),
      end: epochFromDatePickerDate(e),
    });
    setCustomOpen(false);
  };

  const applyDatePreset = (preset: DatePreset) => {
    if (preset === "this_year") {
      const now = new Date();
      const start = Math.floor(
        new Date(now.getFullYear(), 0, 1).getTime() / 1000,
      );
      const end = Math.floor(now.getTime() / 1000);
      onChange({ ...value, datePreset: preset, start, end });
    } else if (preset === "all") {
      onChange({ ...value, datePreset: preset, start: null, end: null });
    } else {
      // custom — seed picker with current values; popover opens via the button.
      setCustomStart(datePickerDateFromEpoch(value.start));
      setCustomEnd(datePickerDateFromEpoch(value.end));
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      {showSort && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Sort by</Label>
          <Select
            value={value.sort ?? "purchases"}
            onValueChange={(v) =>
              onChange({ ...value, sort: v as LeaderboardSort })
            }
          >
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Branch</Label>
        <Select
          value={value.branchId == null ? "all" : String(value.branchId)}
          onValueChange={(v) =>
            onChange({ ...value, branchId: v === "all" ? null : Number(v) })
          }
        >
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder="All branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.name?.trim() || "Unnamed branch"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">
          <Calendar className="mr-1 inline h-3.5 w-3.5" />
          Date range
        </Label>
        <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5">
          {DATE_PRESETS.map((p) => {
            const active = value.datePreset === p.value;
            if (p.value === "custom") {
              return (
                <Popover key={p.value} open={customOpen} onOpenChange={setCustomOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {p.label}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="start">
                    <div className="space-y-3">
                      <div className="text-xs font-medium text-muted-foreground">
                        Custom date range
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Start</Label>
                          <CalendarPicker
                            mode="single"
                            selected={customStart}
                            onSelect={setCustomStart}
                            className="rounded-md border"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">End</Label>
                          <CalendarPicker
                            mode="single"
                            selected={customEnd}
                            onSelect={setCustomEnd}
                            className="rounded-md border"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCustomOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={applyCustomRange}>
                          Apply
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              );
            }
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => applyDatePreset(p.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {rightSlot && <div className="ml-auto self-end">{rightSlot}</div>}
    </div>
  );
}