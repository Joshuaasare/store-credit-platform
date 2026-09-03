import type { NearbyOfferRow } from "@store-credit-platform/api-services";
import { cashbackHeadline } from "./configDisplay";
import { formatGhs } from "./formatGhs";
import type { Ionicons } from "@expo/vector-icons";

type StripIcon = keyof typeof Ionicons.glyphMap;

// Strip copy is the deal in its punchiest form — a concrete value when the
// config carries one ("5% Cashback" / "GH₵20 Cashback"), a type label otherwise.
export function offerStripLabel(offer: NearbyOfferRow): string {
  if (offer.config_type === "running") {
    const c = offer.config;
    if (c.credit_type === "percentage" && c.percentage_credit_value != null) {
      return `${c.percentage_credit_value}% Cashback`;
    }
    if (c.credit_type === "fixed" && c.fixed_credit_value != null) {
      return `${formatGhs(c.fixed_credit_value)} Cashback`;
    }
    return "Cashback offer";
  }
  return "Discount";
}

export function offerStripIcon(offer: NearbyOfferRow): StripIcon {
  return offer.config_type === "fixed" ? "pricetag" : "gift";
}

export function offerHeadline(offer: NearbyOfferRow): string {
  return offer.config_type === "fixed"
    ? offer.config.title?.trim() || "Discount offer"
    : cashbackHeadline(offer.config);
}

// Thumb chain: campaign image → merchant logo (null → card renders its
// gradient + pricetag fallback).
export function offerThumbUri(offer: NearbyOfferRow): string | null {
  return offer.config.images?.[0] ?? offer.merchant?.logo_url ?? null;
}