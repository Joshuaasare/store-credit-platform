import { LinearGradient } from "expo-linear-gradient";
import { View, type StyleProp, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { useThemeTokens } from "../theme/ThemeContext";

/**
 * Full-screen surface + gradient backdrop.
 *
 * Deliberately does NOT apply padding or safe-area insets — those are
 * per-screen concerns so screens that need to bleed edge-to-edge
 * (e.g. the merchant-detail pink header) can do so without fighting
 * a global wrapper. Every consumer is responsible for its own
 * `padding` and any `SafeAreaView` edges it needs.
 *
 * Light and dark themes both render a gradient backdrop so the canvas
 * itself does the color work. Solid fallback colour sits underneath so
 * the gradient has a base fill before it mounts.
 */
export default function ScreenBackground({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useThemeTokens();
  return (
    <View
      style={[
        { flex: 1, backgroundColor: theme.colors.backgroundSolid },
        style,
      ]}
    >
      <LinearGradient
        colors={[theme.colors.backgroundStart, theme.colors.backgroundEnd]}
        style={{ flex: 1 }}
      >
        {children}
      </LinearGradient>
    </View>
  );
}