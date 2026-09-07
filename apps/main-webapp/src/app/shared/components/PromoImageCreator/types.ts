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
  palette: PromoPalette;
  font: PromoFontOption;
}

export interface PromoDesignConfig {
  templateId: string;
  value: string;
  headline: string;
  paletteId: string;
  fontId: string;
}

export type PromoConfigType = "fixed" | "running";

export interface PromoTextFieldDef {
  id: "value" | "headline";
  label: string;
  placeholder: string;
  maxLength: number;
  required?: boolean;
}

export interface PromoTemplateDef {
  id: string;
  label: string;
  configType: PromoConfigType;
  Component: ComponentType<PromoTemplateProps>;
}
