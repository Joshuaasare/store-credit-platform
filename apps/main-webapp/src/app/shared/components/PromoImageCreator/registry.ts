import type { PromoTemplateDef } from "./types";
import RadialBurst from "./templates/RadialBurst";
import RoundStamp from "./templates/RoundStamp";
import AngledBanner from "./templates/AngledBanner";
import TypographicPoster from "./templates/TypographicPoster";
import CouponTicket from "./templates/CouponTicket";

export const PROMO_TEMPLATES: PromoTemplateDef[] = [
  { id: "radial-burst", label: "Burst", Component: RadialBurst },
  { id: "round-stamp", label: "Stamp", Component: RoundStamp },
  { id: "angled-banner", label: "Banner", Component: AngledBanner },
  { id: "typographic-poster", label: "Poster", Component: TypographicPoster },
  { id: "coupon-ticket", label: "Ticket", Component: CouponTicket },
];

export function getPromoTemplate(id: string): PromoTemplateDef {
  return PROMO_TEMPLATES.find((t) => t.id === id) ?? PROMO_TEMPLATES[0];
}
