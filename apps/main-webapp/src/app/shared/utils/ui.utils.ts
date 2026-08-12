import { CustomerTransactions, RedemptionStatus } from "@shared/types/api.types";
import parsePhoneNumber, { CountryCode } from "libphonenumber-js";

export function formatDisplayNumber(
  phone?: string | null | undefined,
  countryCode: CountryCode = "GH",
) {
  return parsePhoneNumber(phone ?? "", countryCode)?.formatInternational();
}

export const TYPE_META: Record<
  CustomerTransactions["transaction_type"],
  { label: string; chip: string }
> = {
  purchase: {
    label: "Purchase",
    chip: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  credit_issue: {
    label: "Credit issued",
    chip: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  credit_redeem: {
    label: "Credit redeemed",
    chip: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
};

export const AMOUNT_COLOR: Record<
  CustomerTransactions["transaction_type"],
  string
> = {
  purchase: "text-foreground",
  credit_issue: "text-emerald-600 dark:text-emerald-400",
  credit_redeem: "text-amber-600 dark:text-amber-400",
};

// Redemption status badge meta. The three states are derived from
// approved_at / rejected_at on the row (no status enum on the backend).
// Brand voltage: Pending = neutral, Approved = teal/primary, Rejected =
// destructive — semantic colors stay literal per the brand convention.
export const REDEMPTION_STATUS_META: Record<
  RedemptionStatus,
  { label: string; chip: string }
> = {
  pending: {
    label: "Pending",
    chip: "border-muted-foreground/20 bg-muted/40 text-muted-foreground",
  },
  approved: {
    label: "Approved",
    chip: "border-primary/20 bg-primary/10 text-primary",
  },
  rejected: {
    label: "Rejected",
    chip: "border-destructive/20 bg-destructive/10 text-destructive",
  },
};

// Derive the redemption status of a row from its approved_at / rejected_at
// timestamps. Mirrors the backend's derivation rule.
export function deriveRedemptionStatus(row: {
  approved_at: string | null;
  rejected_at: string | null;
}): RedemptionStatus {
  if (row.approved_at != null) return "approved";
  if (row.rejected_at != null) return "rejected";
  return "pending";
}
