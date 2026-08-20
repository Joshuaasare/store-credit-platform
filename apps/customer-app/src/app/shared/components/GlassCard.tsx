import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { useThemeTokens } from "../theme/ThemeContext";

export default function GlassCard({
  children,
  style,
  padding = 24,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
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
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
});
