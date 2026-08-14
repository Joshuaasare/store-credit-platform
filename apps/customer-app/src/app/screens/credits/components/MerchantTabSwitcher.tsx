import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolateColor,
  type SharedValue,
} from "react-native-reanimated";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";

const PILL_DURATION = 220;

/**
 * Pill switcher for the merchant credit detail screen.
 *
 * Generic over the option value type — callers pass an array of
 * `{ value, label }` and the component renders N options with a single
 * sliding white pill that animates behind whichever one is active.
 *
 * Visual:
 *   - Outer container is a soft tinted "pill track" using
 *     `surfacePill` / `surfacePillBorder` with `borderRadius: 6` (more
 *     rectangular than the system pill so the switcher reads as a
 *     control, not a button).
 *   - The active option flips to a solid `surface` fill with stronger
 *     ink weight; inactive options stay transparent with subdued ink
 *     weight.
 *
 * Animation:
 *   - One absolutely-positioned `Animated.View` slides behind the
 *     active label. Its `left` and `width` are driven by reanimated
 *     shared values that spring on `value` change.
 *   - The label color tweens between `textSecondary` (inactive) and
 *     `text` (active) via `interpolateColor`.
 *
 * Deliberately distinct from the existing `GlassSegmentedControl`: the
 * segmented control uses a fully rounded pill and brand-coloured fills,
 * which is the wrong visual for this context — these tabs sit directly
 * under the tall pink detail header and need a quieter, neutral surface.
 */
export type MerchantTab = "available" | "pending" | "redeemed";

export interface MerchantTabOption<T extends string> {
  value: T;
  label: string;
}

export default function MerchantTabSwitcher<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: MerchantTabOption<T>[];
  value: T;
  onChange: (next: T) => void;
  style?: object;
}) {
  const theme = useThemeTokens();

  // Track each option's measured layout (x position within the row,
  // width) so we can drive the sliding pill.
  const [slots, setSlots] = useState<{ x: number; width: number }[]>(() =>
    options.map(() => ({ x: 0, width: 0 })),
  );

  const activeIndex = options.findIndex((o) => o.value === value);
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;
  const target = slots[safeIndex] ?? { x: 0, width: 0 };

  const animatedLeft = useSharedValue(target.x);
  const animatedWidth = useSharedValue(target.width);
  const progress = useSharedValue(safeIndex);

  // Animate the sliding pill whenever the active option or its measured
  // layout changes. The first render lands at the right position
  // without an entrance animation because `useSharedValue` is seeded
  // with the initial target.
  useEffect(() => {
    if (target.width === 0) return;
    animatedLeft.value = withTiming(target.x, { duration: PILL_DURATION });
    animatedWidth.value = withTiming(target.width, { duration: PILL_DURATION });
    progress.value = withTiming(safeIndex, { duration: PILL_DURATION });
  }, [target.x, target.width, safeIndex, animatedLeft, animatedWidth, progress]);

  const sliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: animatedLeft.value }],
    width: animatedWidth.value,
  }));

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surfacePill,
          borderRadius: 6,
          borderColor: theme.colors.surfacePillBorder,
        },
        style,
      ]}
      accessibilityRole="tablist"
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.slider,
          sliderStyle,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: 6,
          },
        ]}
      />
      {options.map((opt, i) => (
        <Option
          key={String(opt.value)}
          label={opt.label}
          active={opt.value === value}
          progress={progress}
          optionIndex={i}
          onPress={() => onChange(opt.value)}
          onLayout={(x, width) => {
            setSlots((prev) => {
              const cur = prev[i];
              if (cur && cur.x === x && cur.width === width) return prev;
              const next = [...prev];
              next[i] = { x, width };
              return next;
            });
          }}
        />
      ))}
    </View>
  );
}

function Option({
  label,
  active,
  progress,
  optionIndex,
  onPress,
  onLayout,
}: {
  label: string;
  active: boolean;
  progress: SharedValue<number>;
  optionIndex: number;
  onPress: () => void;
  onLayout: (x: number, width: number) => void;
}) {
  const theme = useThemeTokens();
  // Animated text color — tweens between textSecondary (inactive) and
  // text (active) as the shared `progress` value lands on this option's
  // index.
  const animatedTextStyle = useAnimatedStyle(() => {
    // Each option owns a small band of `progress` — when progress is at
    // this option's index the band reports `1`, otherwise `0`. A flat
    // step is fine because the indicator only stops on integer indices.
    const t = progress.value >= optionIndex - 0.5 && progress.value <= optionIndex + 0.5 ? 1 : 0;
    return {
      color: interpolateColor(
        t,
        [0, 1],
        [theme.colors.textSecondary, theme.colors.text],
      ),
    };
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onLayout={(e) => {
        const { x, width } = e.nativeEvent.layout;
        onLayout(x, width);
      }}
      style={({ pressed }) => [
        styles.option,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Animated.Text
        style={[
          styles.label,
          {
            fontFamily: active
              ? theme.typography.fontFamilySemiBold
              : theme.typography.fontFamilyMedium,
          },
          animatedTextStyle,
        ]}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 4,
    borderWidth: 1,
  },
  slider: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 0,
    // Border is painted on the container, so the slider doesn't need
    // its own border — keeps the indicator edge crisp on the
    // `surfacePill` background.
  },
  option: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    letterSpacing: 0.1,
  },
});
