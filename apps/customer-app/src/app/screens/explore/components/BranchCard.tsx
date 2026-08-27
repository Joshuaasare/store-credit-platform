import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import type { ExploreBranch } from "@store-credit-platform/api-services";
import { pickAvatarGradient } from "../../../shared/utils/avatarPalette";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";

function formatDistance(km: number | null): string {
  if (km == null) return "—";
  if (km < 1) return `${km.toFixed(1)} km`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export default function BranchCard({
  branch,
  onPress,
  style,
}: {
  branch: ExploreBranch;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useThemeTokens();
  const [gradientStart, gradientEnd] = pickAvatarGradient(branch.merchant.name);
  const placeText =
    branch.branch.place_label ?? branch.branch.city ?? "Unknown place";
  const branchName = branch.branch.name ?? branch.branch.city ?? "Branch";

  return (
    <Pressable
      onPress={onPress}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={`${branch.merchant.name} at ${branch.branch.name ?? branch.branch.city}`}
    >
      <View
        style={[
          styles.banner,
          {
            borderRadius: theme.radii.lg,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        {branch.merchant.logo_url ? (
          <Image
            source={{ uri: branch.merchant.logo_url }}
            style={[StyleSheet.absoluteFill, { borderRadius: theme.radii.lg }]}
            contentFit="cover"
            transition={150}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <LinearGradient
            colors={[gradientStart, gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: theme.radii.lg }]}
          />
        )}

        <View
          style={[styles.glassWrap, { borderRadius: theme.radii.lg }]}
          pointerEvents="box-none"
        >
          <BlurView
            intensity={40}
            tint="dark"
            style={[styles.blur, { borderRadius: theme.radii.lg }]}
          >
            <View style={styles.glassContent}>
              <View style={styles.glassText}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: theme.colors.textOnPrimary,
                    fontFamily: theme.typography.fontFamilySemiBold,
                    fontSize: 15,
                  }}
                >
                  {branch.merchant.name || "Merchant"}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: theme.colors.textOnPrimary,
                    fontFamily: theme.typography.fontFamilyRegular,
                    fontSize: 12,
                    opacity: 0.85,
                    marginTop: 2,
                  }}
                >
                  {branchName === placeText
                    ? branchName
                    : `${branchName} • ${placeText}`}
                </Text>
              </View>
            </View>
          </BlurView>
        </View>
      </View>

      <Text
        numberOfLines={1}
        style={{
          color: theme.colors.textMuted,
          fontFamily: theme.typography.fontFamilyRegular,
          fontSize: 12,
          marginTop: 8,
        }}
      >
        Distance: {formatDistance(branch.distance_km)}
      </Text>
      <View style={styles.offersRow}>
        <Text
          style={{
            color: theme.colors.primary,
            fontSize: 16,
            marginRight: 6,
          }}
        >
          🎁
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.text,
            fontWeight: "600",
            fontSize: 14,
          }}
        >
          {branch.offers_summary.count}{" "}
          {branch.offers_summary.count === 1
            ? "discount and cashback offer available"
            : "discount and cashback offers available"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: "100%",
    aspectRatio: 16 / 10,
    overflow: "hidden",
  },
  glassWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "40%",
    overflow: "hidden",
  },
  blur: {
    flex: 1,
    overflow: "hidden",
  },
  glassContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  glassText: {
    flex: 1,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  offersRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
});
