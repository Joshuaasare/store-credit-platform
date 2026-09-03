import type { ReactNode } from "react";
import {
  PROMO_IMAGE_SIZE,
  type PromoFontOption,
  type PromoPalette,
} from "../types";

interface PromoCanvasProps {
  palette: PromoPalette;
  font: PromoFontOption;
  children: ReactNode;
}

// Root 1080x1080 export surface. Inline styles only: html-to-image serializes
// computed styles, and inline styles keep the output identical to the preview.
export function PromoCanvas({ palette, font, children }: PromoCanvasProps) {
  return (
    <div
      style={{
        width: PROMO_IMAGE_SIZE,
        height: PROMO_IMAGE_SIZE,
        backgroundColor: palette.bg,
        color: palette.fg,
        fontFamily: font.fontFamily,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

export function valueFontSize(length: number): number {
  if (length > 8) return 130;
  if (length > 4) return 185;
  return 235;
}
