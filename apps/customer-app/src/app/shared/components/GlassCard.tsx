import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { useThemeTokens } from "../theme/ThemeContext";

export default function GlassCard({
  children,
  style,
  padding = 24,
  contentStyle,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const theme = useThemeTokens();
  return (
    <View
      style={[
        styles.card,
        {
          borderRadius: theme.radii.md,
          borderColor: theme.colors.surfaceBorderStrong,
          backgroundColor: theme.colors.surface,
        },
        style,
      ]}
    >
      <View style={[{ padding }, contentStyle]}>{children}</View>
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
