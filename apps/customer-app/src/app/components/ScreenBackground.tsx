import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import type { StyleProp, ViewStyle } from "react-native";
import type { ReactNode } from "react";

const EDGES: Edge[] = ["top", "bottom"];

/**
 * Full-screen teal brand gradient + SafeAreaView wrapper. Every screen sits
 * on this surface so the glass cards have something to blur.
 */
export function ScreenBackground({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <LinearGradient colors={["#0d9488", "#0f766e"]} style={{ flex: 1 }}>
      <SafeAreaView edges={EDGES} style={[{ flex: 1, padding: 24 }, style]}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}