import { cn, Input } from "@store-credit-platform/web-components";
import { XIcon } from "lucide-react";
import React from "react";

interface SearchInputProps {
  searchQuery?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  className?: string;
}
function SearchInput({
  searchQuery,
  onSearch,
  searchPlaceholder,
  className,
}: SearchInputProps) {
  const ref = React.useRef<HTMLInputElement>(null);

  return (
    <div className={cn("relative w-auto", className)}>
      <Input
        value={searchQuery}
        ref={ref}
        placeholder={searchPlaceholder}
        className="relative"
        onChange={(e) => onSearch?.(e.target.value)}
      />
      {searchQuery && (
        <button
          type="button"
          onClick={() => {
            ref?.current?.blur();
            onSearch?.("");
          }}
          className="absolute right-2 top-1.5 cursor-pointer rounded-full p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <XIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
        </button>
      )}
    </div>
  );
}

export default SearchInput;
