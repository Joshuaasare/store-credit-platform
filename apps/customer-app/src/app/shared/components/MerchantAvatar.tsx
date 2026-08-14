import { StyleSheet, Text, View, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { computeInitials } from "../utils/computeInitials";
import { pickAvatarGradient } from "../utils/avatarPalette";

/**
 * Merchant avatar — preferred: the merchant's logo URL (rendered via
 * `expo-image` for disk + memory cache + progressive loading). Fallback:
 * a pastel gradient with the merchant initials watermarked on top.
 *
 * `expo-image` gives us persistent disk caching across screen visits, so
 * the avatar renders from cache on the second visit instead of re-fetching
 * the merchant logo. The pastel gradient + initials block lives behind
 * the network image so the row never shows a blank square while the
 * image is in flight — once the image loads, it fades over the placeholder.
 *
 * Square by default; the caller controls the size via the `size` prop.
 * The gradient picks a stable palette from the merchant name so the same
 * merchant always gets the same colours (matches the wider "merchant
 * identity" visual used in `OfferCard`).
 */
export default function MerchantAvatar({
  merchantName,
  logoUrl,
  size = 40,
  initialsFontSize,
  style,
}: {
  merchantName: string;
  logoUrl: string | null;
  size?: number;
  /** Override the default initials font size — useful for the larger
   *  offer-card photo (40px) versus the activity-row avatar (40px keeps
   *  the same weight). */
  initialsFontSize?: number;
  style?: StyleProp<ViewStyle | ImageStyle>;
}) {
  const [photoStart, photoEnd] = pickAvatarGradient(merchantName);
  const initials = computeInitials(merchantName);
  const radius = size / 2;

  // Fallback placeholder — gradient + initials watermark. Used as the
  // entire avatar when no logo URL is provided, and as the layered
  // background while a network image is loading.
  const placeholder = (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: radius },
        style,
      ]}
    >
      <LinearGradient
        colors={[photoStart, photoEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      <Text
        style={[
          styles.initials,
          { fontSize: initialsFontSize ?? Math.round(size * 0.42) },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no"
        numberOfLines={1}
      >
        {initials}
      </Text>
    </View>
  );

  if (!logoUrl) return placeholder;

  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: radius },
        style,
      ]}
    >
      {/* Placeholder layer — always rendered, covered by the image once
          it loads. Reads from the same gradient palette as the no-logo
          fallback so the avatar visually anchors before the network
          image arrives. */}
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden" }]}>
        <LinearGradient
          colors={[photoStart, photoEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
      </View>
      <Image
        source={{ uri: logoUrl }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: radius },
        ]}
        contentFit="cover"
        transition={150}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    // Transparent background so the gradient placeholder bleeds through
    // any rounded-corner anti-aliasing seams while the image is loading.
    backgroundColor: "transparent",
  },
  initials: {
    color: "rgba(15,23,42,0.42)",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
});