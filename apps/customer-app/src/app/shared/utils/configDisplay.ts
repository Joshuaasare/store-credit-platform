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
      return `Spend ${formatGhs(threshold)}${windowPhrase}, get ${pct}% back as credit`;
    }
    return `Get ${pct}% back`;
  }
  if (c.credit_type === "fixed") {
    const val = c.fixed_credit_value;
    if (val == null) return "Cashback offer";
    if (threshold != null && threshold > 0) {
      return `Spend ${formatGhs(threshold)}${windowPhrase}, get ${formatGhs(val)} back as credit`;
    }
    return `Get ${formatGhs(val)} back as credit`;
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
        ? "Valid for 1 day"
        : `Valid for ${c.credit_validity} days`,
    );
  }
  parts.push(
    c.cumulative_scope === "merchant_wide"
      ? "Earns across all branches"
      : "Earns at this branch",
  );
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