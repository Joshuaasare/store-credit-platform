import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { ParamListBase, RouteProp } from "@react-navigation/native";
import { useThemeTokens } from "../shared/theme/ThemeContext";
import { useOffsets } from "../shared/hooks/useOffsets";
import { constants } from "../shared/constants/constants";

type TabIcon = keyof typeof Ionicons.glyphMap;

// Same outline glyph in both states — the active state is the pill itself, not a glyph swap.
const TAB_ICONS: Record<string, TabIcon> = {
  Home: "home-outline",
  Credits: "wallet-outline",
  Explore: "map-outline",
  Favorites: "heart-outline",
};

const SPRING_CONFIG = { damping: 18, stiffness: 240, mass: 0.8 };

// Active slot is 1.7× an idle tab — enough to fit the label without crowding idle icons.
const IDLE_FLEX = 1;
const ACTIVE_FLEX = 1.7;

export function GlassTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const theme = useThemeTokens();
  const { bottomOffset } = useOffsets();

  return (
    <View
      style={[styles.wrapper, { bottom: bottomOffset }]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.bar,
          {
            borderRadius: theme.radii.pill,
            backgroundColor: theme.colors.pillSurface,
          },
        ]}
      >
        {state.routes.map((route: RouteProp<ParamListBase>, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : (options.title ?? route.name);
          const icon = TAB_ICONS[route.name] ?? "ellipse";

          const onPress = () => {
            if (isFocused) return;
            navigation.navigate(route.name as never);
          };

          return (
            <TabSlot
              key={route.key}
              isFocused={isFocused}
              label={label}
              icon={icon}
              onPress={onPress}
              pillSurface={theme.colors.pillSurface}
              idleIcon={theme.colors.tabIdleIcon}
              pillRadius={theme.radii.pill}
              semiBold={theme.typography.fontFamilySemiBold}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabSlot({
  isFocused,
  label,
  icon,
  onPress,
  pillSurface,
  idleIcon,
  pillRadius,
  semiBold,
}: {
  isFocused: boolean;
  label: string;
  icon: TabIcon;
  onPress: () => void;
  pillSurface: string;
  idleIcon: string;
  pillRadius: number;
  semiBold: string;
}) {
  const flexValue = useSharedValue(IDLE_FLEX);

  useEffect(() => {
    flexValue.value = withSpring(
      isFocused ? ACTIVE_FLEX : IDLE_FLEX,
      SPRING_CONFIG,
    );
  }, [isFocused, flexValue]);

  const animatedStyle = useAnimatedStyle(() => ({
    flexGrow: flexValue.value,
    flexBasis: 0,
  }));

  return (
    <Animated.View style={[styles.slotWrap, animatedStyle]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.tab,
          isFocused
            ? [
                styles.activeTab,
                {
                  backgroundColor: "#ffffff",
                  borderRadius: pillRadius,
                },
              ]
            : null,
          pressed && !isFocused ? styles.pressed : null,
        ]}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={label}
      >
        <Ionicons
          name={icon}
          size={22}
          color={isFocused ? pillSurface : idleIcon}
        />
        {isFocused ? (
          <Text
            numberOfLines={1}
            style={[
              styles.activeLabel,
              {
                color: pillSurface,
                fontFamily: semiBold,
              },
            ]}
          >
            {label}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    height: constants.SIZES.TAB_BAR_HEIGHT,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
  },
  slotWrap: {
    flexShrink: 1,
    minWidth: 0,
    height: 48,
  },
  tab: {
    flex: 1,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  activeTab: {
    paddingHorizontal: 16,
  },
  pressed: {
    opacity: 0.6,
  },
  activeLabel: {
    fontSize: 14,
    letterSpacing: 0.1,
  },
});
