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
import type { BranchWithOffers } from "@store-credit-platform/api-services";
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
  branch: BranchWithOffers;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useThemeTokens();
  const merchantName = branch.merchant?.name ?? "Merchant";
  const [gradientStart, gradientEnd] = pickAvatarGradient(merchantName);
  const placeText = branch.place_label ?? branch.city ?? "Unknown place";
  const branchName = branch.name ?? branch.city ?? "Branch";
  const offerCount =
    branch.running_configs.length + branch.fixed_configs.length;

  return (
    <Pressable
      onPress={onPress}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={`${merchantName} at ${branch.name ?? branch.city}`}
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
        {branch.merchant?.logo_url ? (
          <Image
            source={{ uri: branch.merchant!.logo_url! }}
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
                  {merchantName}
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
          {offerCount}{" "}
          {offerCount === 1
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
  categoryChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
