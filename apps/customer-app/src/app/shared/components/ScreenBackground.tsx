import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { View, type StyleProp, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { useThemeTokens } from "../theme/ThemeContext";

const EDGES: Edge[] = ["top", "bottom"];

/**
 * Full-screen surface + SafeAreaView wrapper.
 *
 * Both light and dark themes render a gradient backdrop so the canvas
 * itself does the color work — light theme softens the wine wash from
 * top (#1F0810) to bottom (#160610), dark theme runs the slate gradient.
 * Solid fallback colour sits underneath so the gradient has a base fill
 * before it mounts.
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
      style={{
        flex: 1,
        backgroundColor: theme.colors.backgroundSolid,
      }}
    >
      <LinearGradient
        colors={[theme.colors.backgroundStart, theme.colors.backgroundEnd]}
        style={{ flex: 1 }}
      >
        <SafeAreaView edges={EDGES} style={[{ flex: 1, padding: 24 }, style]}>
          {children}
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
