import { useEffect, type ReactNode } from "react";
import { useIsFocused } from "@react-navigation/native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";

const DURATION_IN = 110;
const DURATION_OUT = 60;

/**
 * Glass-style cross-fade between tab screens. Wraps a tab's content and
 * animates opacity + a subtle scale lift on focus change. Pair with
 * `detachInactiveScreens: false` on the Tab.Navigator so the outgoing tab
 * stays mounted and fades out while the incoming tab fades in — the two
 * overlaps read as a soft glass transition over the constant teal gradient
 * background.
 */
export function GlassTransition({ children }: { children: ReactNode }) {
  const isFocused = useIsFocused();

  const opacity = useSharedValue(isFocused ? 1 : 0);
  const scale = useSharedValue(isFocused ? 1 : 0.97);
  const translateY = useSharedValue(isFocused ? 0 : 10);

  useEffect(() => {
    if (isFocused) {
      opacity.value = withTiming(1, {
        duration: DURATION_IN,
        easing: Easing.out(Easing.cubic),
      });
      scale.value = withSpring(1, { damping: 45, stiffness: 500 });
      translateY.value = withTiming(0, {
        duration: DURATION_IN,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      opacity.value = withTiming(0, {
        duration: DURATION_OUT,
        easing: Easing.in(Easing.cubic),
      });
      scale.value = withTiming(0.97, { duration: DURATION_OUT });
      translateY.value = withTiming(10, { duration: DURATION_OUT });
    }
  }, [isFocused, opacity, scale, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
