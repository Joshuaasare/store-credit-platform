import { lightColors, darkColors, type ColorTokens } from "./colors";

/**
 * Radii tokens (px). Shared across themes — shape language doesn't change
 * between light and dark.
 */
export interface RadiusTokens {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  /** Fully rounded pill. */
  pill: number;
}

export const radii: RadiusTokens = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 32,
};

/**
 * Spacing tokens (px). 4px base scale.
 */
export interface SpacingTokens {
  xs: number;
  sm: number;
  md: number;
  base: number;
  lg: number;
  xl: number;
  xxl: number;
}

export const spacing: SpacingTokens = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

/**
 * Typography tokens. Font families are the loaded Inter weights; sizes/weights
 * are shared across themes (only color changes).
 */
export interface TypographyTokens {
  fontFamilyRegular: string;
  fontFamilyMedium: string;
  fontFamilySemiBold: string;
  fontFamilyBold: string;
  displayLg: number;
  displayMd: number;
  title: number;
  body: number;
  caption: number;
  label: number;
}

export const typography: TypographyTokens = {
  fontFamilyRegular: "Inter_400Regular",
  fontFamilyMedium: "Inter_500Medium",
  fontFamilySemiBold: "Inter_600SemiBold",
  fontFamilyBold: "Inter_700Bold",
  displayLg: 32,
  displayMd: 28,
  title: 22,
  body: 16,
  caption: 13,
  label: 11,
};

export interface Theme {
  dark: boolean;
  colors: ColorTokens;
  radii: RadiusTokens;
  spacing: SpacingTokens;
  typography: TypographyTokens;
}

export const lightTheme: Theme = {
  dark: false,
  colors: lightColors,
  radii,
  spacing,
  typography,
};

export const darkTheme: Theme = {
  dark: true,
  colors: darkColors,
  radii,
  spacing,
  typography,
};

export type ThemeMode = "system" | "light" | "dark";