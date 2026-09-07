import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import MerchantAvatar from "./MerchantAvatar";
import { useThemeTokens } from "../theme/ThemeContext";

type StripIcon = keyof typeof Ionicons.glyphMap;

// Experiment: OfferCard on a lighter berry base with ink/berry content, so
// the two can alternate in a feed without touching the original.
export default function OfferCard2({
  value,
  subtitle,
  stripIcon = "pricetag",
  imageUri,
  merchantName,
  merchantLogoUrl = null,
  onPress,
  style,
}: {
  value: string;
  subtitle: string;
  stripIcon?: StripIcon;
  imageUri?: string | null;
  merchantName?: string | null;
  merchantLogoUrl?: string | null;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useThemeTokens();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.outer, style]}
      accessibilityRole="button"
      accessibilityLabel={
        merchantName != null ? `${value} at ${merchantName}` : value
      }
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.mainSurface,
            borderColor: theme.colors.surfaceBorder,
            borderRadius: theme.radii.md,
          },
        ]}
      >
        <View style={styles.sticker}>
          {imageUri != null ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.stickerImage}
              contentFit="cover"
              transition={200}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View
              style={[
                styles.stickerImage,
                styles.stickerFallback,
                {
                  backgroundColor: theme.colors.primary,
                  borderRadius: theme.radii.sm,
                },
              ]}
            >
              <Ionicons
                name={stripIcon}
                size={36}
                color={theme.colors.textOnPrimary}
                style={styles.fallbackGlyph}
              />
            </View>
          )}
        </View>

        <View style={styles.content}>
          {merchantName != null ? (
            <View style={styles.merchantRow}>
              <MerchantAvatar
                merchantName={merchantName}
                logoUrl={merchantLogoUrl}
                size={15}
              />
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.fontFamilyMedium,
                  fontSize: 10,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  marginLeft: 6,
                  paddingRight: 86,
                }}
              >
                {merchantName}
              </Text>
            </View>
          ) : null}
          <Text
            numberOfLines={2}
            style={{
              color: theme.colors.primary,
              fontFamily: theme.typography.fontFamilySemiBold,
              fontSize: 14,
              lineHeight: 19,
              letterSpacing: 0.1,
              marginTop: "auto",
              paddingRight: 104,
            }}
          >
            {value}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.textMuted,
              fontFamily: theme.typography.fontFamilyRegular,
              fontSize: 12,
              marginTop: "auto",
            }}
          >
            {subtitle}
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
    height: 148,
    borderWidth: 1,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 16,
    paddingRight: 16,
  },
  merchantRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sticker: {
    position: "absolute",
    top: -15,
    right: -8,
    width: 108,
    height: 108,
    transform: [{ rotate: "8deg" }],
    shadowColor: "rgba(0,0,0,1)",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 2, height: 6 },
    elevation: 8,
  },
  stickerImage: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
  },
  stickerFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackGlyph: {
    opacity: 0.85,
  },
});