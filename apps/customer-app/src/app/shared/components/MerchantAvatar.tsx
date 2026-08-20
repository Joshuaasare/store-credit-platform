import {
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { computeInitials } from "../utils/computeInitials";
import { pickAvatarGradient, pickAvatarGradientById } from "../utils/avatarPalette";

export default function MerchantAvatar({
  merchantName,
  logoUrl,
  size = 40,
  initialsFontSize,
  style,
  initials,
  idSeed,
}: {
  merchantName: string;
  logoUrl: string | null;
  size?: number;
  initials?: string;
  initialsFontSize?: number;
  style?: StyleProp<ViewStyle | ImageStyle>;
  // Stable ID for the placeholder palette so a branch/merchant renders the
  // same gradient across every tab/screen regardless of name casing. Falls
  // back to name-based hashing when nullish.
  idSeed?: number | string | null;
}) {
  const [photoStart, photoEnd] = idSeed != null
    ? pickAvatarGradientById(idSeed)
    : pickAvatarGradient(merchantName);
  const radius = size / 2;

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
        {initials ?? computeInitials(merchantName)}
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
      {/* Placeholder layer, covered by the image once it loads. */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: radius, overflow: "hidden" },
        ]}
      >
        <LinearGradient
          colors={[photoStart, photoEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
      </View>
      <Image
        source={{ uri: logoUrl }}
        style={[styles.image, { width: size, height: size }]}
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
    backgroundColor: "transparent",
  },
  initials: {
    color: "rgba(15,23,42,0.42)",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
  },
});
