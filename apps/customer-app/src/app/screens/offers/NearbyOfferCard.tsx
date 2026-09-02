import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import type { NearbyOfferRow } from "@store-credit-platform/api-services";
import { cashbackHeadline } from "../../shared/utils/configDisplay";
import { formatDistance } from "../../shared/utils/travel.utils";
import { pickAvatarGradient } from "../../shared/utils/avatarPalette";
import { useThemeTokens } from "../../shared/theme/ThemeContext";

// Photo chain: campaign image → merchant logo → gradient + pricetag glyph.
// The gradient always renders beneath so the card never flashes blank while
// the remote image loads.
export default function NearbyOfferCard({
  offer,
  onPress,
  style,
}: {
  offer: NearbyOfferRow;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useThemeTokens();
  const merchantName = offer.merchant?.name ?? "Merchant";
  const headline =
    offer.config_type === "fixed"
      ? offer.config.title?.trim() || "Discount offer"
      : cashbackHeadline(offer.config);
  const photoUri = offer.config.images?.[0] ?? offer.merchant?.logo_url ?? null;
  const [gradientStart, gradientEnd] = pickAvatarGradient(merchantName);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.outer, style]}
      accessibilityRole="button"
      accessibilityLabel={`${headline} at ${merchantName}`}
    >
      <View style={styles.card}>
        <View style={[styles.photo, { borderRadius: theme.radii.lg }]}>
          <LinearGradient
            colors={[gradientStart, gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: theme.radii.lg }]}
          />
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: theme.radii.lg },
              ]}
              contentFit="cover"
              transition={150}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Ionicons
              name="pricetag"
              size={64}
              color={theme.colors.primary}
              style={styles.fallbackGlyph}
            />
          )}
        </View>

        <View style={styles.meta}>
          <View style={styles.metaTopRow}>
            <Text
              style={[
                styles.merchantName,
                {
                  color: theme.colors.text,
                  fontFamily: theme.typography.fontFamilySemiBold,
                },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {merchantName}
            </Text>
            {offer.distance_km != null ? (
              <View
                style={[
                  styles.distanceChip,
                  {
                    backgroundColor: theme.colors.surfaceInput,
                    borderRadius: theme.radii.pill,
                  },
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={12}
                  color={theme.colors.textMuted}
                />
                <Text
                  style={{
                    color: theme.colors.text,
                    fontFamily: theme.typography.fontFamilySemiBold,
                    fontSize: 12,
                    marginLeft: 3,
                  }}
                >
                  {formatDistance(offer.distance_km)}
                </Text>
              </View>
            ) : null}
          </View>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.fontFamilyRegular,
              fontSize: 12,
              lineHeight: 17,
              marginTop: 4,
            }}
            numberOfLines={2}
          >
            {headline}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: 292,
  },
  card: {
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    aspectRatio: 4 / 3,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fallbackGlyph: {
    opacity: 0.16,
  },
  distanceChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  meta: {
    paddingHorizontal: 5,
    paddingTop: 10,
    paddingBottom: 12,
  },
  metaTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  merchantName: {
    flex: 1,
    fontSize: 14,
    letterSpacing: 0.1,
  },
});