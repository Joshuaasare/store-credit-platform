import type { Theme } from "@react-navigation/native";

import type { Theme as AppTheme } from "./theme";

/**
 * Build a React Navigation `Theme` from the app's token system so the nav
 * chrome (header backgrounds, card surfaces, default text) stays in sync with
 * `useTheme()` on screen contents. Pass the result to `NavigationContainer`.
 */
export function buildNavTheme(theme: AppTheme): Theme {
  return {
    dark: theme.dark,
    colors: {
      primary: theme.colors.primary,
      background: theme.colors.backgroundStart,
      card: theme.colors.navCard,
      text: theme.colors.text,
      border: theme.colors.navBorder,
      notification: theme.colors.error,
    },
    fonts: {
      regular: {
        fontFamily: theme.typography.fontFamilyRegular,
        fontWeight: "400",
      },
      medium: {
        fontFamily: theme.typography.fontFamilyMedium,
        fontWeight: "500",
      },
      bold: {
        fontFamily: theme.typography.fontFamilySemiBold,
        fontWeight: "600",
      },
      heavy: {
        fontFamily: theme.typography.fontFamilyBold,
        fontWeight: "700",
      },
    },
  };
}