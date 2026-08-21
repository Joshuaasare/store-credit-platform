import { useState } from "react";
import { Smile } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger, cn } from "@store-credit-platform/web-components";

const PROMO_EMOJIS = [
  "🎉", "🔥", "🎁", "✨", "💰", "🛍️", "📅", "⏰",
  "🏷️", "🤑", "💯", "⭐", "🏆", "🎊", "💥", "🚀",
  "😍", "🙌", "💝", "💳", "🛒", "📉", "📈", "🌟",
  "😋", "🥳", "🏪", "📌", "🔔", "💝", "🤝", "👍",
];

interface EmojiPickerProps {
  onPick: (emoji: string) => void;
  className?: string;
  disabled?: boolean;
}

export function EmojiPicker({ onPick, className, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50",
            className,
          )}
          aria-label="Insert emoji"
          title="Insert emoji"
        >
          <Smile className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="grid grid-cols-8 gap-0.5">
          {PROMO_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onPick(e);
                setOpen(false);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-md text-lg leading-none hover:bg-accent"
            >
              {e}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}