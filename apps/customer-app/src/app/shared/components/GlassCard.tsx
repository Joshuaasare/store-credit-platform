import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { useThemeTokens } from "../theme/ThemeContext";

/**
 * Flat card surface — white fill in light theme, translucent navy in dark
 * theme, with a hairline border and a single-tier shadow.
 *
 * Name kept as `GlassCard` for API continuity (every screen imports it).
 * The component now renders as a flat card, not a frosted-glass plate — the
 * visual language goes flat across the whole app to match the Wearify-style
 * reference.
 */
export default function GlassCard({
  children,
  style,
  padding = 24,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Override the default 24px inner padding. Useful for tightly-packed
   * marketing surfaces that need their own padding rhythm. */
  padding?: number;
}) {
  const theme = useThemeTokens();
  return (
    <View
      style={[
        styles.card,
        {
          borderRadius: theme.radii.md,
          borderColor: theme.colors.surfaceBorder,
          backgroundColor: theme.colors.surface,
        },
        style,
      ]}
    >
      <View style={{ padding }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: "hidden",
    // Single-tier elevation — the only shadow tier in the system. Cards
    // either have this or no shadow at all; depth comes from typography and
    // the white canvas, not layered shadows.
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
});
