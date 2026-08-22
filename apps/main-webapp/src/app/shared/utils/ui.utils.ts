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
  { label: string; chip: string; accent: string }
> = {
  purchase: {
    label: "Purchase",
    chip: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    accent: "text-emerald-600 dark:text-emerald-400",
  },
  credit_issue: {
    label: "Issued",
    chip: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    accent: "text-amber-600 dark:text-amber-400",
  },
  credit_redeem: {
    label: "Redeemed",
    chip: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400",
    accent: "text-rose-600 dark:text-rose-400",
  },
};
