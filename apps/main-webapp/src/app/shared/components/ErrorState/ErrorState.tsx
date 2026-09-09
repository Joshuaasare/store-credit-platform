import { CloudOff, RefreshCw } from "lucide-react";
import { Button } from "@store-credit-platform/web-components";
import { cn } from "@store-credit-platform/web-components";
import { getErrorMessage } from "@shared/utils/errors.utils";

interface ErrorStateProps {
  error?: unknown;
  title?: string;
  description?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  compact?: boolean;
}

export default function ErrorState({
  error,
  title = "Something went wrong",
  description,
  onRetry,
  isRetrying,
  compact,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 text-center",
        compact ? "py-8" : "py-16",
      )}
    >
      <CloudOff
        className={cn("text-muted-foreground", compact ? "h-6 w-6" : "h-8 w-8")}
      />
      <p className="text-sm font-medium">{title}</p>
      <p className="text-muted-foreground max-w-md text-xs">
        {description ?? getErrorMessage(error)}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={onRetry}
          disabled={isRetrying}
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", isRetrying && "animate-spin")}
          />
          Try again
        </Button>
      )}
    </div>
  );
}
