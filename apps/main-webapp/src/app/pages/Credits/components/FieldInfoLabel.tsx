import { Info } from "lucide-react";
import {
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@store-credit-platform/web-components";

interface FieldInfoLabelProps {
  htmlFor?: string;
  info: string;
  children: React.ReactNode;
}

export function FieldInfoLabel({
  htmlFor,
  info,
  children,
}: FieldInfoLabelProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{children}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`More info on ${typeof children === "string" ? children : "this field"}`}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          className="w-72 text-sm leading-relaxed"
        >
          {info}
        </PopoverContent>
      </Popover>
    </div>
  );
}