import type {
  PromoConfigType,
  PromoTemplateDef,
  PromoTextFieldDef,
} from "./types";
import RadialBurst from "./templates/RadialBurst";
import RoundStamp from "./templates/RoundStamp";
import AngledBanner from "./templates/AngledBanner";
import TypographicPoster from "./templates/TypographicPoster";
import CouponTicket from "./templates/CouponTicket";
import SealBadge from "./templates/SealBadge";
import HexBadge from "./templates/HexBadge";
import RibbonStack from "./templates/RibbonStack";
import DiamondBadge from "./templates/DiamondBadge";
import CashbackBurst from "./templates/CashbackBurst";
import ReceiptCard from "./templates/ReceiptCard";
import CircleBadge from "./templates/CircleBadge";
import SplitBanner from "./templates/SplitBanner";
import ShoppingBag from "./templates/ShoppingBag";
import ShoppingCart from "./templates/ShoppingCart";

const FIXED_TEMPLATES: PromoTemplateDef[] = [
  {
    id: "radial-burst",
    label: "Burst",
    configType: "fixed",
    Component: RadialBurst,
  },
  {
    id: "round-stamp",
    label: "Stamp",
    configType: "fixed",
    Component: RoundStamp,
  },
  {
    id: "angled-banner",
    label: "Banner",
    configType: "fixed",
    Component: AngledBanner,
  },
  {
    id: "typographic-poster",
    label: "Poster",
    configType: "fixed",
    Component: TypographicPoster,
  },
  {
    id: "coupon-ticket",
    label: "Ticket",
    configType: "fixed",
    Component: CouponTicket,
  },
  {
    id: "seal-badge",
    label: "Seal",
    configType: "fixed",
    Component: SealBadge,
  },
  {
    id: "hex-badge",
    label: "Hex",
    configType: "fixed",
    Component: HexBadge,
  },
  {
    id: "ribbon-stack",
    label: "Ribbons",
    configType: "fixed",
    Component: RibbonStack,
  },
  {
    id: "diamond-badge",
    label: "Diamond",
    configType: "fixed",
    Component: DiamondBadge,
  },
  {
    id: "shopping-bag",
    label: "Bag",
    configType: "fixed",
    Component: ShoppingBag,
  },
  {
    id: "shopping-cart",
    label: "Cart",
    configType: "fixed",
    Component: ShoppingCart,
  },
];

const RUNNING_TEMPLATES: PromoTemplateDef[] = [
  {
    id: "cashback-burst",
    label: "Burst",
    configType: "running",
    Component: CashbackBurst,
  },
  {
    id: "receipt-card",
    label: "Card",
    configType: "running",
    Component: ReceiptCard,
  },
  {
    id: "circle-badge",
    label: "Badge",
    configType: "running",
    Component: CircleBadge,
  },
  {
    id: "split-banner",
    label: "Split",
    configType: "running",
    Component: SplitBanner,
  },
  {
    id: "shopping-bag",
    label: "Bag",
    configType: "running",
    Component: ShoppingBag,
  },
  {
    id: "shopping-cart",
    label: "Cart",
    configType: "running",
    Component: ShoppingCart,
  },
];

// Every template within a config type exposes the same text slots, so the
// editor can render one shared set of inputs per config type.
export const PROMO_FIELD_SETS: Record<PromoConfigType, PromoTextFieldDef[]> = {
  fixed: [
    {
      id: "value",
      label: "Value",
      placeholder: "e.g. 50% OFF",
      maxLength: 12,
      required: true,
    },
    {
      id: "headline",
      label: "Headline",
      placeholder: "e.g. SPECIAL OFFER",
      maxLength: 24,
    },
  ],
  running: [
    {
      id: "value",
      label: "Value",
      placeholder: "e.g. 5% Cashback",
      maxLength: 16,
      required: true,
    },
    {
      id: "headline",
      label: "Qualifier",
      placeholder: "e.g. For purchases over GH₵300",
      maxLength: 48,
    },
  ],
};

export function getPromoTemplates(
  configType: PromoConfigType,
): PromoTemplateDef[] {
  return configType === "running" ? RUNNING_TEMPLATES : FIXED_TEMPLATES;
}

export function getPromoTemplate(
  id: string,
  configType: PromoConfigType,
): PromoTemplateDef {
  const set = getPromoTemplates(configType);
  return set.find((t) => t.id === id) ?? set[0];
}
