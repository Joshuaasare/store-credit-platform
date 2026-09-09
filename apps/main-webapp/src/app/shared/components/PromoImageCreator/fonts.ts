import type { PromoFontOption } from "./types";

export const PROMO_FONTS: PromoFontOption[] = [
  { id: "inter", label: "Inter", fontFamily: '"Inter", sans-serif' },
  {
    id: "archivo-black",
    label: "Archivo Black",
    fontFamily: '"Archivo Black", "Inter", sans-serif',
  },
  {
    id: "bebas-neue",
    label: "Bebas Neue",
    fontFamily: '"Bebas Neue", "Inter", sans-serif',
  },
];

export function getPromoFont(id: string): PromoFontOption {
  return PROMO_FONTS.find((f) => f.id === id) ?? PROMO_FONTS[0];
}
