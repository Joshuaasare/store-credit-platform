import { BlurView } from "expo-blur";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { ReactNode } from "react";

/**
 * Frosted-glass card: real backdrop blur on iOS, tinted translucent overlay
 * on Android (expo-blur limitation — accepted per the plan).
 */
export function GlassCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <BlurView intensity={40} tint="light" style={[styles.card, style]}>
      <View style={styles.inner}>{children}</View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    overflow: "hidden",
  },
  inner: {
    padding: 24,
  },
});