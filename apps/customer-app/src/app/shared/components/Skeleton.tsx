import { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useThemeTokens } from "../theme/ThemeContext";

// Shared loading placeholder: a soft block that pulses between two opacities.
// All skeleton shapes compose this so timing and color stay in one place.
export function Skeleton({
  width,
  height,
  radius,
  color,
  style,
}: {
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  radius?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useThemeTokens();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radii.sm,
          backgroundColor: color ?? theme.colors.skeletonSurface,
          opacity,
        },
        style,
      ]}
    />
  );
}

// Mirrors OfferCard: bordered 148-tall card with sticker block top-right.
export function OfferCardSkeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useThemeTokens();
  return (
    <View
      style={[
        styles.offerCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.surfaceBorderStrong,
          borderRadius: theme.radii.md,
        },
        style,
      ]}
    >
      <Skeleton
        width={104}
        height={104}
        radius={theme.radii.sm}
        style={styles.offerSticker}
      />
      <View style={styles.offerBody}>
        <Skeleton width={150} height={10} />
        <Skeleton width="70%" height={16} style={{ marginTop: "auto" }} />
        <Skeleton width="45%" height={12} style={{ marginTop: 10 }} />
      </View>
    </View>
  );
}

// Mirrors BranchCard: 16:10 banner with a glass bar at the bottom, plus the
// travel chips row underneath.
export function BranchCardSkeleton() {
  const theme = useThemeTokens();
  return (
    <View>
      <View
        style={[
          styles.branchBanner,
          {
            borderRadius: theme.radii.lg,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <Skeleton width="100%" height="100%" radius={theme.radii.lg} />
        <View style={styles.branchGlassBar}>
          <Skeleton width={30} height={30} radius={15} />
          <View style={styles.branchGlassText}>
            <Skeleton width={120} height={11} />
            <Skeleton width={80} height={9} style={{ marginTop: 7 }} />
          </View>
          <Skeleton width={86} height={27} radius={theme.radii.pill} />
        </View>
      </View>
      <View style={styles.travelRow}>
        <Skeleton width={68} height={26} radius={theme.radii.pill} />
        <Skeleton width={68} height={26} radius={theme.radii.pill} />
      </View>
    </View>
  );
}

// Mirrors MerchantActivityRow / ActivityRow: avatar + two text lines + amount.
export function RowSkeleton() {
  return (
    <View style={styles.row}>
      <Skeleton width={42} height={42} radius={21} />
      <View style={styles.rowText}>
        <Skeleton width="42%" height={13} />
        <Skeleton width="60%" height={11} style={{ marginTop: 8 }} />
      </View>
      <Skeleton width={64} height={14} />
    </View>
  );
}

const styles = StyleSheet.create({
  offerCard: {
    height: 148,
    width: "100%",
    borderWidth: 1,
    overflow: "hidden",
  },
  offerSticker: {
    position: "absolute",
    top: -14,
    right: -10,
  },
  offerBody: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
  },
  branchBanner: {
    width: "100%",
    aspectRatio: 16 / 10,
    overflow: "hidden",
  },
  branchGlassBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "40%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  branchGlassText: {
    flex: 1,
  },
  travelRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  rowText: {
    flex: 1,
  },
});
