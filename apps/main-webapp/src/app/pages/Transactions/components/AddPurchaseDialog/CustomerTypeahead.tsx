import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  Popover,
  PopoverAnchor,
  PopoverContent,
  Monogram,
  cn,
} from "@store-credit-platform/web-components";
import { customerService } from "@store-credit-platform/api-services";
import { BaseCustomer } from "@shared/types/api.types";
import { formatDisplayNumber } from "@shared/utils/ui.utils";
import { customerRowInitials } from "@shared/utils/customers.utils";
import useDebounce from "@shared/hooks/useDebounce";

interface CustomerTypeaheadProps {
  rawPhone: string;
  onSelect: (customer: BaseCustomer) => void;
  disabled?: boolean;
}

const MIN_DIGITS = 3;
const DEBOUNCE_MS = 400;
const RESULT_LIMIT = 5;

// Strip non-digits to derive a numeric substring search key. The backend
// expects a digits-only string so `ilike '%<digits>%'` hits both local and
// E.164 stored phones.
function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export function CustomerTypeahead({
  rawPhone,
  onSelect,
  disabled,
}: CustomerTypeaheadProps) {
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(digitsOnly(rawPhone), DEBOUNCE_MS);
  const inputContainerRef = useRef<HTMLDivElement | null>(null);
  const hadResultsRef = useRef(false);
  // After a row is picked, the parent writes the picked phone back into the
  // form, which triggers another query. Don't reopen the popover for that
  // echo — only reopen when the user has actually typed something new.
  const lastPickedDigitsRef = useRef<string | null>(null);

  const enabled = debounced.length >= MIN_DIGITS && !disabled;

  const query = useQuery({
    queryKey: ["customers", "global-search", debounced, RESULT_LIMIT],
    enabled,
    queryFn: async () => {
      const res = await customerService.globalSearchByPhone(
        debounced,
        RESULT_LIMIT,
      );
      if (!res.success) throw new Error(res.error);
      return res.data.rows;
    },
    staleTime: 30_000,
  });

  const rows = query.data ?? [];
  const showPopover = enabled && open && rows.length > 0;

  useEffect(() => {
    if (rows.length > 0) hadResultsRef.current = true;
    if (!enabled) {
      setOpen(false);
      return;
    }
    // Suppress the reopen that comes from the form being refilled with the
    // picked customer's phone. Once the user starts typing new digits we
    // want the popover back.
    if (
      lastPickedDigitsRef.current &&
      debounced === lastPickedDigitsRef.current
    ) {
      return;
    }
    if (rows.length > 0) setOpen(true);
  }, [rows.length, enabled, debounced]);

  return (
    <div ref={inputContainerRef} className="relative">
      <Popover open={showPopover} onOpenChange={setOpen} modal={false}>
        <PopoverAnchor asChild>
          <div aria-hidden />
        </PopoverAnchor>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-[var(--radix-popover-trigger-width)] p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandList>
              {query.isFetching && rows.length === 0 ? (
                <div className="text-muted-foreground flex items-center justify-center gap-2 px-3 py-4 text-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Searching…
                </div>
              ) : (
                <CommandEmpty>No matching customers.</CommandEmpty>
              )}
              <CommandGroup>
                {rows.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={String(c.id)}
                    onSelect={() => {
                      lastPickedDigitsRef.current = digitsOnly(c.phone ?? "");
                      onSelect(c);
                      setOpen(false);
                    }}
                    className="flex items-center gap-3 py-2"
                  >
                    <Monogram
                      text={customerRowInitials({
                        user_id: c.user_id,
                        customer_name: customerName(c),
                        phone: c.phone,
                      })}
                      seed={c.user_id ?? c.phone ?? String(c.id)}
                      imageUrl={c.avatar_url}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "truncate text-sm font-semibold tracking-tight",
                        )}
                      >
                        {customerName(c)}
                      </div>
                      {c.phone && (
                        <div className="text-muted-foreground truncate text-xs">
                          {formatDisplayNumber(c.phone)}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function customerName(c: BaseCustomer): string {
  const surname = (c.surname ?? "").trim();
  const otherNames = (c.other_names ?? "").trim();
  const full = `${surname}${otherNames ? " " + otherNames : ""}`.trim();
  return full || formatDisplayNumber(c.phone) || "Unnamed customer";
}
