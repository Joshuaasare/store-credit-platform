import type { BaseRunningCreditConfig } from "@store-credit-platform/api-services";
import { formatGhs } from "./formatGhs";
import { formatShortDate } from "./date.utils";

export function cashbackHeadline(c: BaseRunningCreditConfig): string {
  const threshold = c.threshold_amount;
  // eligible_window is the lookback (days) over which spend is summed toward
  // the threshold. Only surface it when set — null means "current purchase only".
  const window = c.eligible_window;
  const windowPhrase = window != null && window > 0 ? ` in ${window} days` : "";
  if (c.credit_type === "percentage") {
    const pct = c.percentage_credit_value;
    if (pct == null) return "Cashback offer";
    if (threshold != null && threshold > 0) {
      return `Get ${pct}% cashback when you spend ${formatGhs(threshold)}${windowPhrase}`;
    }
    return `Get ${pct}% cashback`;
  }
  if (c.credit_type === "fixed") {
    const val = c.fixed_credit_value;
    if (val == null) return "Cashback offer";
    if (threshold != null && threshold > 0) {
      return `Get ${formatGhs(val)} cashback when you spend ${formatGhs(threshold)}${windowPhrase}`;
    }
    return `Get ${formatGhs(val)} cashback`;
  }
  return "Cashback offer";
}

export function cashbackMeta(c: BaseRunningCreditConfig): string {
  const parts: string[] = [];
  if (c.maximum_allowed_credit != null) {
    parts.push(`Up to ${formatGhs(c.maximum_allowed_credit)} credit`);
  }
  if (c.credit_validity != null) {
    parts.push(
      c.credit_validity === 1
        ? "1 day validity"
        : `${c.credit_validity} days validity`,
    );
  }
  // parts.push(
  //   c.cumulative_scope === "merchant_wide"
  //     ? "Earns across all branches"
  //     : "Earns at this branch",
  // );
  return parts.join(" · ");
}

export function formatFixedDateRange(
  start: number | null,
  end: number | null,
): string {
  if (start != null && end != null) {
    return `${formatShortDate(start)} – ${formatShortDate(end)}`;
  }
  if (start != null) return `From ${formatShortDate(start)}`;
  if (end != null) return `Until ${formatShortDate(end)}`;
  return "";
}

// Fixed-campaign meta line: how long is left on the expiry rather than raw
// dates. No end date → the campaign simply runs ("Active").
export function fixedExpiryMeta(end: number | null): string {
  if (end == null) return "Active";
  const days = Math.ceil((end - Date.now()) / 86_400_000);
  if (days <= 0) return "Expired";
  if (days === 1) return "Active - Expires today";
  return `Active - Expires in ${days} days`;
}

// Same clock as fixedExpiryMeta, as a pill tone: green while there's runway,
// amber inside the last 5 days, red once expired.
export function fixedExpiryTone(
  end: number | null,
): "success" | "warning" | "danger" {
  if (end == null) return "success";
  const days = Math.ceil((end - Date.now()) / 86_400_000);
  if (days <= 0) return "danger";
  return days <= 5 ? "warning" : "success";
}
