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
import type { BranchWithOffers } from "@store-credit-platform/api-services";
import { pickAvatarGradient } from "../../../shared/utils/avatarPalette";
import {
  DRIVE_KMH,
  WALK_KMH,
  formatDistance,
  formatTravel,
  travelMinutes,
} from "../../../shared/utils/travel.utils";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";
import MerchantAvatar from "../../../shared/components/MerchantAvatar";
import { getInitials } from "../../../shared/utils/ui.utils";

// Single berry chip summarizing all offers on the branch.
function OfferCountChip({ count }: { count: number }) {
  const theme = useThemeTokens();
  return (
    <View
      style={[
        styles.offerPill,
        {
          backgroundColor: theme.colors.primary,
          borderRadius: theme.radii.pill,
        },
      ]}
    >
      <Ionicons name="pricetag" size={15} color={theme.colors.textOnPrimary} />
      <Text
        style={{
          color: theme.colors.textOnPrimary,
          fontFamily: theme.typography.fontFamilySemiBold,
          fontSize: 13,
          letterSpacing: 0.2,
        }}
      >
        {count} {count === 1 ? "Offer" : "Offers"}
      </Text>
    </View>
  );
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
  // fixed_configs = promotional/time-bound = discount; running_configs =
  // ongoing earn-credit-back = cashback.
  const discountCount = branch.fixed_configs.length;
  const cashbackCount = branch.running_configs.length;
  const walkMin = travelMinutes(branch.distance_km, WALK_KMH);
  const driveMin = travelMinutes(branch.distance_km, DRIVE_KMH);

  return (
    <Pressable
      onPress={onPress}
      style={style}
      accessibilityRole="button"
      accessibilityLabel={`${merchantName} at ${branch.name ?? branch.city}${
        walkMin != null ? `, ${formatTravel(walkMin)} walk` : ""
      }${driveMin != null ? `, ${formatTravel(driveMin)} drive` : ""}, ${cashbackCount} cashback, ${discountCount} discount offers`}
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
          <>
            <Image
              source={{
                uri:
                  branch.merchant?.cover_photo_url ?? branch.merchant?.logo_url,
              }}
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: theme.radii.lg },
              ]}
              contentFit="cover"
              transition={150}
              accessibilityIgnoresInvertColors
            />
            <LinearGradient
              colors={["transparent", theme.colors.imageScrim]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: theme.radii.lg },
              ]}
              pointerEvents="none"
            />
          </>
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
              <MerchantAvatar
                logoUrl={branch?.merchant?.logo_url ?? null}
                size={30}
                merchantName={merchantName}
                initials={getInitials(merchantName)}
              />
              <View style={styles.glassText}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: theme.colors.textOnPrimary,
                    fontFamily: theme.typography.fontFamilySemiBold,
                    fontSize: 13,
                  }}
                >
                  {merchantName}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: theme.colors.textOnPrimary,
                    fontFamily: theme.typography.fontFamilyRegular,
                    fontSize: 11,
                    opacity: 0.85,
                    marginTop: 2,
                  }}
                >
                  {branchName === placeText
                    ? branchName
                    : `${branchName} • ${placeText}`}
                </Text>
              </View>

              <View style={styles.offerPillsCol} pointerEvents="none">
                {discountCount + cashbackCount > 0 ? (
                  <OfferCountChip count={discountCount + cashbackCount} />
                ) : null}
              </View>
            </View>
          </BlurView>
        </View>
      </View>

      <View style={styles.travelRow}>
        <View style={styles.travelChip}>
          <Ionicons name="walk" size={14} color={theme.colors.textMuted} />
          <Text
            style={{
              color: theme.colors.text,
              fontFamily: theme.typography.fontFamilySemiBold,
              fontSize: 12,
            }}
          >
            {walkMin != null ? formatTravel(walkMin) : "—"}
          </Text>
        </View>
        <View style={styles.travelChip}>
          <Ionicons name="car" size={14} color={theme.colors.textMuted} />
          <Text
            style={{
              color: theme.colors.text,
              fontFamily: theme.typography.fontFamilySemiBold,
              fontSize: 12,
            }}
          >
            {driveMin != null ? formatTravel(driveMin) : "—"}
          </Text>
        </View>
        {branch.distance_km != null ? (
          <Text
            style={{
              color: theme.colors.textMuted,
              fontFamily: theme.typography.fontFamilyRegular,
              fontSize: 12,
            }}
          >
            · {formatDistance(branch.distance_km)}
          </Text>
        ) : null}
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
  offerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
  offerPillsCol: {
    alignItems: "flex-end",
    gap: 6,
  },
  travelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  travelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
