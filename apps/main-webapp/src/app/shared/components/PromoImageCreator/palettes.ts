import type { PromoPalette } from "./types";

// Design content, not UI chrome: these hexes are the palette presets merchants
// pick from, so they are literals here on purpose (mirrors customer-app theme/colors.ts).
export const PROMO_PALETTES: PromoPalette[] = [
  {
    id: "classic",
    label: "Classic",
    bg: "#ffffff",
    fg: "#1a1a1a",
    accent: "#e63329",
    accentFg: "#ffffff",
  },
  {
    id: "brand",
    label: "Brand",
    bg: "#ffffff",
    fg: "#12352f",
    accent: "#109383",
    accentFg: "#ffffff",
  },
  {
    id: "berry",
    label: "Berry",
    bg: "#5C0435",
    fg: "#ffffff",
    accent: "#e8b64c",
    accentFg: "#3a0222",
  },
  {
    id: "sunset",
    label: "Sunset",
    bg: "#1a1a1a",
    fg: "#ffffff",
    accent: "#f59e0b",
    accentFg: "#1a1a1a",
  },
  {
    id: "mono",
    label: "Mono",
    bg: "#111111",
    fg: "#ffffff",
    accent: "#ffffff",
    accentFg: "#111111",
  },
];

export function getPromoPalette(id: string): PromoPalette {
  return PROMO_PALETTES.find((p) => p.id === id) ?? PROMO_PALETTES[0];
}
