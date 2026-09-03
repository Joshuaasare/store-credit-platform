import type { ComponentType } from "react";

export const PROMO_IMAGE_SIZE = 1080;

export interface PromoPalette {
  id: string;
  label: string;
  bg: string;
  fg: string;
  accent: string;
  accentFg: string;
}

export interface PromoFontOption {
  id: string;
  label: string;
  fontFamily: string;
}

export interface PromoTemplateProps {
  value: string;
  headline: string;
  subline: string;
  palette: PromoPalette;
  font: PromoFontOption;
}

export interface PromoDesignConfig {
  templateId: string;
  value: string;
  headline: string;
  subline: string;
  paletteId: string;
  fontId: string;
}

export interface PromoTemplateDef {
  id: string;
  label: string;
  Component: ComponentType<PromoTemplateProps>;
}
