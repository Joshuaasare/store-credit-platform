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
import { computeInitials } from "../../../shared/utils/computeInitials";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";

/**
 * Build a stable two-color pastel gradient from a merchant name. Soft tones
 * that read as "photo placeholder" (think Wearify's product tile) and stay
 * visually distinct between merchants without being noisy.
 */
function pickPhotoGradient(merchantName: string): [string, string] {
  const palettes: Array<[string, string]> = [
    ["#e0e7ff", "#c7d2fe"], // sky
    ["#fce7f3", "#fbcfe8"], // rose
    ["#d1fae5", "#a7f3d0"], // emerald
    ["#fef3c7", "#fde68a"], // amber
    ["#ede9fe", "#ddd6fe"], // violet
    ["#cffafe", "#a5f3fc"], // cyan
  ];
  const idx = hashString(merchantName) % palettes.length;
  return palettes[idx] ?? ["#e0e7ff", "#c7d2fe"];
}

/** Tiny djb2-style hash — stable across reloads, fits in a 32-bit int. */
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export default function OfferCard({
  merchantName,
  offerCopy,
  accentText,
  logoUrl,
  onPress,
  style,
}: {
  merchantName: string;
  offerCopy: string;
  accentText: string;
  logoUrl: string | null;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useThemeTokens();

  const accentIdx = offerCopy.indexOf(accentText);
  const before = accentIdx >= 0 ? offerCopy.slice(0, accentIdx) : offerCopy;
  const accent =
    accentIdx >= 0
      ? offerCopy.slice(accentIdx, accentIdx + accentText.length)
      : "";
  const after =
    accentIdx >= 0 ? offerCopy.slice(accentIdx + accentText.length) : "";

  const initials = computeInitials(merchantName);
  const [photoStart, photoEnd] = pickPhotoGradient(merchantName);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.outer, style]}
      accessibilityRole="button"
      accessibilityLabel={`${offerCopy} at ${merchantName}`}
    >
      <View style={[styles.card]}>
        <View style={[styles.photo, { borderRadius: theme.radii.lg }]}>
          {/* Logo fills the entire photo section. The gradient + initials
              placeholder always renders beneath so the card never flashes
              blank while the logo is in flight; the expo-image logo then
              fades over the placeholder via `transition={150}`. When no
              logo is supplied we keep the same gradient + initials as the
              fallback — the card looks the same as before from the user's
              perspective. */}
          <LinearGradient
            colors={[photoStart, photoEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: theme.radii.lg }]}
          />
          {logoUrl ? (
            <Image
              source={{ uri: logoUrl }}
              style={[StyleSheet.absoluteFill, { borderRadius: theme.radii.lg }]}
              contentFit="cover"
              transition={150}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Text
              style={styles.photoInitials}
              accessibilityElementsHidden
              importantForAccessibility="no"
              numberOfLines={1}
            >
              {initials}
            </Text>
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
            <View style={styles.ratingChip}>
              <Ionicons name="star" size={12} color="#f59e0b" />
              <Text
                style={{
                  color: theme.colors.text,
                  fontFamily: theme.typography.fontFamilySemiBold,
                  fontSize: 12,
                  marginLeft: 3,
                }}
              >
                4.8
              </Text>
            </View>
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
            {before}
            {accent ? (
              <Text
                style={{
                  color: theme.colors.primary,
                  fontFamily: theme.typography.fontFamilySemiBold,
                }}
              >
                {accent}
              </Text>
            ) : null}
            {after}
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
    borderWidth: 0,
    overflow: "hidden",
    // Single-tier elevation, like Airbnb's property card.
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  photo: {
    width: "100%",
    aspectRatio: 4 / 3,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoInitials: {
    color: "rgba(15,23,42,0.42)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 40,
    letterSpacing: 1,
  },
  ratingChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.06)",
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
