import { StyleSheet, Text, View, Pressable } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useThemeTokens } from "../theme/ThemeContext";

export interface GlassSegmentedControlOption<T extends string | number> {
  value: T;
  label: string;
  badge?: number;
}

export default function GlassSegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  style,
  accessibilityLabel,
}: {
  options: GlassSegmentedControlOption<T>[];
  value: T;
  onChange: (next: T) => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const theme = useThemeTokens();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surfacePill,
          borderColor: theme.colors.surfacePillBorder,
          borderRadius: theme.radii.pill,
        },
        style,
      ]}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((opt, index) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[
              styles.segment,
              {
                backgroundColor: active ? theme.colors.primary : "transparent",
                borderColor: active ? theme.colors.primary : "transparent",
                borderRadius: theme.radii.pill,
                marginLeft: index === 0 ? 0 : 2,
                marginRight: index === options.length - 1 ? 0 : 2,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: active
                    ? theme.colors.textOnPrimary
                    : theme.colors.textSecondary,
                  fontFamily: active
                    ? theme.typography.fontFamilySemiBold
                    : theme.typography.fontFamilyMedium,
                },
              ]}
            >
              {opt.label}
              {opt.badge != null && opt.badge > 0 ? `  ${opt.badge}` : ""}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
    borderWidth: 1,
    alignSelf: "stretch",
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  label: {
    fontSize: 14,
    letterSpacing: 0.1,
  },
});
