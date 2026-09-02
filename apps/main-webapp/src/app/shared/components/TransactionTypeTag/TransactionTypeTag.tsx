import { ArrowUp, ArrowDown, Gift, type LucideIcon } from "lucide-react";
import { cn } from "@store-credit-platform/web-components";
import { CustomerTransactions } from "@shared/types/api.types";

export type TransactionType = CustomerTransactions["transaction_type"];

interface TransactionTypeTagProps {
  type: TransactionType;
  className?: string;
}

const LABELS: Record<TransactionType, string> = {
  purchase: "Purchase",
  credit_issue: "Issued",
  credit_redeem: "Redeemed",
};

const SLATE: Record<TransactionType, string> = {
  purchase: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  credit_issue: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  credit_redeem: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

const ICONS: Record<TransactionType, LucideIcon> = {
  purchase: ArrowUp,
  credit_issue: ArrowDown,
  credit_redeem: Gift,
};

export function getTransactionTypeMeta(type: TransactionType) {
  return { label: LABELS[type], slate: SLATE[type], Icon: ICONS[type] };
}

export function TransactionTypeTag({
  type,
  className,
}: TransactionTypeTagProps) {
  const { Icon, label, slate } = getTransactionTypeMeta(type);
  return (
    <span
      className={cn(
        "text-foreground inline-flex items-center gap-2 text-sm font-medium tabular-nums",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-lg",
          slate,
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      </span>
      <span>{label}</span>
    </span>
  );
}

interface TypeChipProps {
  type: TransactionType;
  className?: string;
}

export function TransactionTypeChip({ type, className }: TypeChipProps) {
  const { Icon, slate } = getTransactionTypeMeta(type);
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 items-center justify-center rounded-md",
        slate,
        className,
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={2.25} />
    </span>
  );
}
