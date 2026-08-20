import { LinearGradient } from "expo-linear-gradient";
import { View, type StyleProp, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { useThemeTokens } from "../theme/ThemeContext";

// No padding or safe-area insets — screens that bleed edge-to-edge (e.g. the
// merchant-detail pink header) can do so without fighting a global wrapper.
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