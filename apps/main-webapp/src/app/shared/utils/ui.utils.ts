import { CustomerTransactions } from "@shared/types/api.types";
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
