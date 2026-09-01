import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import type { BranchCategoryValues } from "@store-credit-platform/api-services";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";

const DURATION_IN = 180;
const DURATION_OUT = 120;

export const CATEGORY_LABELS: Record<BranchCategoryValues, string> = {
  electronics: "Electronics",
  home_appliances: "Home Appliances",
  furniture: "Furniture",
  retail_shops: "Retail Shops",
  restaurants: "Restaurants",
  schools: "Schools",
};

const CATEGORY_ORDER: BranchCategoryValues[] = [
  "electronics",
  "home_appliances",
  "furniture",
  "retail_shops",
  "restaurants",
  "schools",
];

type Selection = BranchCategoryValues | null;

export default function CategoryFilterModal({
  visible,
  activeCategory,
  onApply,
  onDismiss,
}: {
  visible: boolean;
  activeCategory: BranchCategoryValues | null;
  onApply: (category: Selection) => void;
  onDismiss: () => void;
}) {
  const theme = useThemeTokens();
  const [draft, setDraft] = useState<Selection>(activeCategory);

  useEffect(() => {
    if (visible) setDraft(activeCategory);
  }, [visible, activeCategory]);

  const opacity = useSharedValue(visible ? 1 : 0);
  const scale = useSharedValue(visible ? 1 : 0.92);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, {
        duration: DURATION_IN,
        easing: Easing.out(Easing.cubic),
      });
      scale.value = withSpring(1, { damping: 45, stiffness: 500 });
    } else {
      opacity.value = withTiming(0, {
        duration: DURATION_OUT,
        easing: Easing.in(Easing.cubic),
      });
      scale.value = withTiming(0.92, { duration: DURATION_OUT });
    }
  }, [visible, opacity, scale]);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const handleApply = () => {
    onApply(draft);
    onDismiss();
  };

  const chips: { key: BranchCategoryValues | "all"; label: string }[] = [
    { key: "all", label: "All categories" },
    ...CATEGORY_ORDER.map((c) => ({ key: c, label: CATEGORY_LABELS[c] })),
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.sheet,
              borderRadius: theme.radii.md,
            },
            sheetAnimatedStyle,
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text
                style={{
                  color: theme.colors.sheetText,
                  fontFamily: theme.typography.fontFamilyBold,
                  fontSize: theme.typography.title,
                  letterSpacing: -0.2,
                }}
              >
                Filter by category
              </Text>
              <Text
                style={{
                  color: theme.colors.sheetTextMuted,
                  fontFamily: theme.typography.fontFamilyRegular,
                  fontSize: 13,
                  lineHeight: 19,
                  marginTop: 8,
                }}
              >
                Pick one category to narrow the nearby list.
              </Text>

              <View style={styles.chipWrap}>
                {chips.map((chip) => {
                  const isActive =
                    chip.key === "all" ? draft == null : draft === chip.key;
                  return (
                    <Pressable
                      key={chip.key}
                      onPress={() =>
                        setDraft(chip.key === "all" ? null : chip.key)
                      }
                      accessibilityRole="button"
                      accessibilityLabel={chip.label}
                      style={({ pressed }) => [
                        styles.chip,
                        {
                          backgroundColor: isActive
                            ? theme.colors.primary
                            : theme.colors.sheetInput,
                          borderColor: isActive
                            ? theme.colors.primary
                            : theme.colors.surfaceBorder,
                          borderRadius: theme.radii.pill,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={{
                          color: isActive
                            ? theme.colors.textOnPrimary
                            : theme.colors.sheetText,
                          fontFamily: isActive
                            ? theme.typography.fontFamilySemiBold
                            : theme.typography.fontFamilyMedium,
                          fontSize: 13,
                        }}
                      >
                        {chip.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  onPress={onDismiss}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.keepButton,
                    {
                      borderColor: theme.colors.surfaceBorder,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.colors.sheetText,
                      fontFamily: theme.typography.fontFamilySemiBold,
                      fontSize: 15,
                    }}
                  >
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleApply}
                  accessibilityRole="button"
                  accessibilityLabel="Apply filter"
                  style={({ pressed }) => [
                    styles.actionButton,
                    {
                      backgroundColor: theme.colors.primary,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.colors.textOnPrimary,
                      fontFamily: theme.typography.fontFamilySemiBold,
                      fontSize: 15,
                    }}
                  >
                    Apply
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "90%",
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  keepButton: {
    borderWidth: 1,
  },
});