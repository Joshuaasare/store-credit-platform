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
import MerchantAvatar from "./MerchantAvatar";
import { pickAvatarGradient } from "../utils/avatarPalette";
import { useThemeTokens } from "../theme/ThemeContext";

type StripIcon = keyof typeof Ionicons.glyphMap;

// Generic coupon-style offer card: branded strip → headline + thumb →
// merchant footer. Knows nothing about offer types — the parent derives all
// copy and images. The thumb falls back to a gradient (seeded by
// merchantName) + pricetag glyph so it never flashes blank.
export default function OfferCard({
  stripText,
  stripIcon = "pricetag",
  headline,
  headlineNumberOfLines = 2,
  thumbUri,
  merchantName,
  merchantLogoUrl = null,
  distanceLabel = null,
  onPress,
  style,
}: {
  stripText: string;
  stripIcon?: StripIcon;
  headline: string;
  headlineNumberOfLines?: number;
  thumbUri?: string | null;
  merchantName: string;
  merchantLogoUrl?: string | null;
  distanceLabel?: string | null;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useThemeTokens();
  const [gradientStart, gradientEnd] = pickAvatarGradient(merchantName);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.outer, style]}
      accessibilityRole="button"
      accessibilityLabel={`${stripText} at ${merchantName}`}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.surfaceBorder,
            borderRadius: theme.radii.sm,
          },
        ]}
      >
        <View
          style={[
            styles.strip,
            {
              backgroundColor: theme.colors.primary,
              borderTopLeftRadius: theme.radii.sm,
              borderTopRightRadius: theme.radii.sm,
            },
          ]}
        >
          <Ionicons
            name={stripIcon}
            size={13}
            color={theme.colors.textOnPrimary}
          />
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.textOnPrimary,
              fontFamily: theme.typography.fontFamilyBold,
              fontSize: 12,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              marginLeft: 5,
              flex: 1,
            }}
          >
            {stripText}
          </Text>
        </View>

        <View style={styles.body}>
          <Text
            style={{
              color: theme.colors.text,
              fontFamily: theme.typography.fontFamilySemiBold,
              fontSize: 14,
              lineHeight: 19,
              flex: 1,
              marginRight: 10,
            }}
            numberOfLines={headlineNumberOfLines}
          >
            {headline}
          </Text>
          <View
            style={[
              styles.thumb,
              { borderRadius: theme.radii.md, overflow: "hidden" },
            ]}
          >
            <LinearGradient
              colors={[gradientStart, gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {thumbUri ? (
              <Image
                source={{ uri: thumbUri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={150}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <Ionicons
                name="pricetag"
                size={30}
                color={theme.colors.primary}
                style={styles.fallbackGlyph}
              />
            )}
          </View>
        </View>

        <View
          style={[
            styles.footer,
            { borderTopColor: theme.colors.surfaceBorder },
          ]}
        >
          <MerchantAvatar
            merchantName={merchantName}
            logoUrl={merchantLogoUrl}
            size={20}
          />
          <Text
            style={{
              color: theme.colors.textMuted,
              fontFamily: theme.typography.fontFamilyRegular,
              fontSize: 12,
              marginLeft: 4,
            }}
            numberOfLines={1}
          >
            {merchantName}
            {distanceLabel != null ? ` · ${distanceLabel}` : ""}
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
    borderWidth: 1,
    overflow: "hidden",
  },
  strip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  body: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    minHeight: 84,
  },
  thumb: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackGlyph: {
    opacity: 0.35,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
});