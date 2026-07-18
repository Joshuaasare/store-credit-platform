import { useState } from "react";
import { Calendar } from "lucide-react";
import type { DateRange } from "react-day-picker";
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
import { LeaderboardSort } from "@shared/types/api.types";

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
  { value: "all", label: "All" },
  { value: "custom", label: "Custom" },
];

function epochFromDate(d: Date | undefined): number | null {
  if (!d) return null;
  return Math.floor(d.getTime() / 1000);
}

function dateFromEpoch(epoch: number | null): Date | undefined {
  if (!epoch) return undefined;
  return new Date(epoch * 1000);
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function formatRangeLabel(range: DateRange | undefined): string {
  const from = range?.from;
  const to = range?.to;
  const fmt = (d: Date) =>
    d.toLocaleDateString("default", { month: "short", day: "numeric" });
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return `${fmt(from)} –`;
  return "Pick a date range";
}

// Days in the visible month that fall strictly between `from` and `to`,
// used to highlight the in-range middle days on each single-mode calendar.
function inRangeDays(visibleMonth: Date, from?: Date, to?: Date): Date[] {
  if (!from || !to) return [];
  const first = startOfMonth(visibleMonth);
  const last = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth() + 1,
    0,
  );
  const start = from < first ? first : new Date(from);
  const end = to > last ? last : new Date(to);
  const out: Date[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const fromT = from.getTime();
  const toT = to.getTime();
  while (cur.getTime() <= end.getTime()) {
    const t = cur.getTime();
    if (t !== fromT && t !== toT) out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function CustomersFilters({
  value,
  onChange,
  branches,
  showSort = false,
  rightSlot,
}: CustomersFiltersProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customRange, setCustomRange] = useState<DateRange | undefined>(() => ({
    from: dateFromEpoch(value.start),
    to: dateFromEpoch(value.end),
  }));
  const [fromMonth, setFromMonth] = useState<Date>(() => {
    const f = dateFromEpoch(value.start) ?? new Date();
    return startOfMonth(f);
  });
  const [toMonth, setToMonth] = useState<Date>(() => {
    const t = dateFromEpoch(value.end);
    if (t) return startOfMonth(t);
    const d = new Date();
    return startOfMonth(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  });

  const from = customRange?.from;
  const to = customRange?.to;
  const setFrom = (d: Date | undefined) =>
    setCustomRange((r) => ({ from: d, to: r?.to }));
  const setTo = (d: Date | undefined) =>
    setCustomRange((r) => ({ from: r?.from, to: d }));

  const applyCustomRange = () => {
    let from = customRange?.from;
    let to = customRange?.to;
    if (from && to && to < from) {
      const tmp = from;
      from = to;
      to = tmp;
    }
    onChange({
      ...value,
      datePreset: "custom",
      start: epochFromDate(from),
      end: epochFromDate(to),
    });
    setCustomOpen(false);
  };

  const applyDatePreset = (preset: DatePreset) => {
    if (preset === "this_year") {
      // "This year" = Jan 1 of the current year onwards, with no upper bound.
      // Using end=null (instead of end=now) means transactions created after
      // the preset is applied still fall in-window and appear immediately on
      // refetch — otherwise a freshly-added purchase would be filtered out
      // until the user manually re-applies the filter.
      const now = new Date();
      const start = Math.floor(
        new Date(now.getFullYear(), 0, 1).getTime() / 1000,
      );
      onChange({ ...value, datePreset: preset, start, end: null });
    } else if (preset === "all") {
      onChange({ ...value, datePreset: preset, start: null, end: null });
    } else {
      // custom — persist the selection immediately so the tab stays active,
      // then seed the picker with the current values and open the popover.
      // The actual start/end update when the user applies a range; if they
      // cancel, datePreset remains "custom" with the previous range.
      setCustomRange({
        from: dateFromEpoch(value.start),
        to: dateFromEpoch(value.end),
      });
      if (value.datePreset !== "custom") {
        onChange({ ...value, datePreset: "custom" });
      }
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      {showSort && (
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs">Sort by</Label>
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
        <Label className="text-muted-foreground text-xs">Branch</Label>
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
        <Label className="text-muted-foreground text-xs">
          <Calendar className="mr-1 inline h-3.5 w-3.5" />
          Date range
        </Label>
        <div className="bg-muted/40 flex items-center gap-1 rounded-lg border p-0.5">
          {DATE_PRESETS.map((p) => {
            const active = value.datePreset === p.value;
            if (p.value === "custom") {
              return (
                <Popover
                  key={p.value}
                  open={customOpen}
                  onOpenChange={(open) => {
                    setCustomOpen(open);
                    if (open) {
                      const f = dateFromEpoch(value.start);
                      const t = dateFromEpoch(value.end);
                      setCustomRange({ from: f, to: t });
                      setFromMonth(startOfMonth(f ?? new Date()));
                      setToMonth(
                        startOfMonth(
                          t ??
                            new Date(
                              new Date().getFullYear(),
                              new Date().getMonth() + 1,
                              1,
                            ),
                        ),
                      );
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {p.label}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="start">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-muted-foreground text-xs font-medium">
                          Custom date range
                        </div>
                        <div className="text-foreground text-xs font-semibold tabular-nums">
                          {formatRangeLabel(customRange)}
                        </div>
                      </div>
                      <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="space-y-1">
                          <div className="text-primary px-1 text-[11px] font-semibold uppercase tracking-wide">
                            From
                          </div>
                          <CalendarPicker
                            mode="single"
                            month={fromMonth}
                            onMonthChange={setFromMonth}
                            selected={from}
                            onSelect={setFrom}
                            endMonth={to}
                            disabled={to ? { after: to } : undefined}
                            modifiers={{
                              range: inRangeDays(fromMonth, from, to),
                            }}
                            modifiersClassNames={{
                              range:
                                "bg-accent text-accent-foreground rounded-md",
                            }}
                            className="rounded-md border"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="px-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                            To
                          </div>
                          <CalendarPicker
                            mode="single"
                            month={toMonth}
                            onMonthChange={setToMonth}
                            selected={to}
                            onSelect={setTo}
                            startMonth={from}
                            disabled={from ? { before: from } : undefined}
                            modifiers={{
                              range: inRangeDays(toMonth, from, to),
                            }}
                            modifiersClassNames={{
                              range:
                                "bg-accent text-accent-foreground rounded-md",
                            }}
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
                        <Button
                          size="sm"
                          onClick={applyCustomRange}
                          disabled={!customRange?.from}
                        >
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
                    ? "bg-primary text-primary-foreground shadow-sm"
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
