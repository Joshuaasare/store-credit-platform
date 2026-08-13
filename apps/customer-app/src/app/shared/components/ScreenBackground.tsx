import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { View, type StyleProp, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { useThemeTokens } from "../../theme/ThemeContext";

const EDGES: Edge[] = ["top", "bottom"];

/**
 * Full-screen surface + SafeAreaView wrapper.
 *
 * Light theme: solid white surface — flat design reads on a clean canvas,
 * the surface itself does not provide color energy.
 *
 * Dark theme: deep-blue gradient backdrop (the canonical brand look).
 * The gradient color comes from the active theme so light/dark swaps
 * re-skin the whole app without per-screen edits.
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
        backgroundColor: theme.dark
          ? theme.colors.backgroundSolid
          : theme.colors.backgroundSolid,
      }}
    >
      {theme.dark ? (
        <LinearGradient
          colors={[theme.colors.backgroundStart, theme.colors.backgroundEnd]}
          style={{ flex: 1 }}
        >
          <SafeAreaView
            edges={EDGES}
            style={[{ flex: 1, padding: 24 }, style]}
          >
            {children}
          </SafeAreaView>
        </LinearGradient>
      ) : (
        <SafeAreaView edges={EDGES} style={[{ flex: 1, padding: 24 }, style]}>
          {children}
        </SafeAreaView>
      )}
    </View>
  );
}
