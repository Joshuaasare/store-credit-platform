import { useEffect, useRef, useState } from "react";
import { BlurView } from "expo-blur";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  interpolateColor,
  type SharedValue,
} from "react-native-reanimated";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import type { ParamListBase, RouteProp } from "@react-navigation/native";

type TabIcon = keyof typeof Ionicons.glyphMap;

const TAB_ICONS: Record<string, TabIcon> = {
  Home: "home-outline",
  Credits: "card-outline",
  Explore: "map-outline",
  Profile: "person-outline",
};

const TAB_ICONS_ACTIVE: Record<string, TabIcon> = {
  Home: "home",
  Credits: "card",
  Explore: "map",
  Profile: "person",
};

const PILL_WIDTH = 72;
const BAR_HORIZONTAL_PADDING = 16; // 8px each side — tabs split the inner width
const SPRING_CONFIG = { damping: 52, stiffness: 600 };

/**
 * A single tab button with reanimated icon scale + color cross-fade driven
 * by the shared `activeIndex` (animated) vs its own `index`. The icon scales
 * up and brightens as the pill slides under it.
 */
function TabItem({
  route,
  index,
  activeIndex,
  label,
  isFocused,
  onPress,
}: {
  route: RouteProp<ParamListBase>;
  index: number;
  activeIndex: SharedValue<number>;
  label: string;
  isFocused: boolean;
  onPress: () => void;
}) {
  const icon = isFocused
    ? TAB_ICONS_ACTIVE[route.name] ?? "ellipse"
    : TAB_ICONS[route.name] ?? "ellipse";

  const animatedIconStyle = useAnimatedStyle(() => {
    const distance = Math.abs(activeIndex.value - index);
    const scale = interpolate(distance, [0, 0.5, 1], [1.12, 1.06, 1]);
    return {
      transform: [{ scale }],
    };
  });

  const animatedColorStyle = useAnimatedStyle(() => {
    const t = Math.max(0, 1 - Math.abs(activeIndex.value - index));
    const color = interpolateColor(
      t,
      [0, 1],
      ["rgba(255,255,255,0.55)", "#ffffff"],
    );
    return { color };
  });

  return (
    <Pressable
      onPress={onPress}
      style={styles.tab}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
    >
      <Animated.View style={animatedIconStyle}>
        <Animated.Text style={[styles.iconWrap, animatedColorStyle]}>
          <Ionicons name={icon} size={24} />
        </Animated.Text>
      </Animated.View>
      <Animated.Text style={[styles.label, animatedColorStyle]}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

/**
 * Glassmorphic floating tab bar with a sliding frosted pill indicator that
 * springs between tabs, plus icon scale + color cross-fade per tab.
 */
export function GlassTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const [barWidth, setBarWidth] = useState(0);
  const activeIndex = useSharedValue(state.index);
  const pillTranslateX = useSharedValue(0);
  const didMountRef = useRef(false);

  const slotWidth =
    barWidth > 0
      ? (barWidth - BAR_HORIZONTAL_PADDING) / state.routes.length
      : 0;
  const pillTargetX =
    8 + state.index * slotWidth + (slotWidth - PILL_WIDTH) / 2;

  useEffect(() => {
    if (barWidth === 0) return;
    if (!didMountRef.current) {
      // Snap the pill to the initial active tab without animating.
      activeIndex.value = state.index;
      pillTranslateX.value = pillTargetX;
      didMountRef.current = true;
      return;
    }
    activeIndex.value = withSpring(state.index, SPRING_CONFIG);
    pillTranslateX.value = withSpring(pillTargetX, SPRING_CONFIG);
  }, [state.index, barWidth, pillTargetX, activeIndex, pillTranslateX]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillTranslateX.value }],
  }));

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <BlurView
        intensity={50}
        tint="light"
        style={styles.bar}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {barWidth > 0 && (
          <Animated.View style={[styles.pill, pillStyle]} />
        )}
        {state.routes.map((route: RouteProp<ParamListBase>, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : (options.title ?? route.name);

          const onPress = () => {
            if (isFocused) return;
            navigation.navigate(route.name as never);
          };

          return (
            <TabItem
              key={route.key}
              route={route}
              index={index}
              activeIndex={activeIndex}
              label={label}
              isFocused={isFocused}
              onPress={onPress}
            />
          );
        })}
      </BlurView>
    </View>
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
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    borderColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    paddingHorizontal: 8,
  },
  pill: {
    position: "absolute",
    top: 8,
    left: 0,
    width: PILL_WIDTH,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    zIndex: 1,
  },
  iconWrap: {
    fontSize: 24,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});