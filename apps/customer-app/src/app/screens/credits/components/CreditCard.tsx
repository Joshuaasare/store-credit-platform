import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import GlassCard from "../../../shared/components/GlassCard";
import MerchantAvatar from "../../../shared/components/MerchantAvatar";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";
import { formatGhs } from "../../../shared/utils/formatGhs";
import { pickAvatarGradient } from "../../../shared/utils/avatarPalette";
import { formatExpiryDistance } from "../../../shared/utils/credits.utils";
import type { MerchantCreditBucket } from "../lib/aggregateCredits";

export default function CreditCard({
  bucket,
  onRedeem,
  style,
}: {
  bucket: MerchantCreditBucket;
  onRedeem: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useThemeTokens();

  const total = bucket.totalRemaining;
  const soonest = bucket.soonest;

  const palette = pickAvatarGradient(bucket.merchantName);

  // Validity line — three states:
  //   1. `soonest === null`  → "Lifetime credit"
  //   2. expires within 48h or already past → "{amount} expires soon"
  //      in the warning colour
  //   3. otherwise → "{amount} in N days" in the slate text colour
  let validityText: string;
  let validityTone = theme.colors.textSecondary;
  if (soonest === null || soonest.expires_at === null) {
    validityText = "Lifetime credit";
  } else {
    const distance = formatExpiryDistance(soonest.expires_at) ?? "soon";
    if (distance === "soon") {
      validityText = `${formatGhs(soonest.remaining)} expires soon`;
      validityTone = theme.colors.warning;
    } else {
      validityText = `${formatGhs(soonest.remaining)} expires ${distance}`;
      // `expires_at` arrives in seconds from the backend; promote to ms
      // before comparing against `Date.now()` (ms).
      const msUntilExpiry = soonest.expires_at * 1000 - Date.now();
      if (msUntilExpiry <= 1000 * 60 * 60 * 48) {
        validityTone = theme.colors.warning;
      }
    }
  }

  return (
    <GlassCard
      style={[styles.card, style, { borderRadius: theme.radii.lg }]}
      padding={0}
    >
      <View style={styles.row}>
        {/* Left column — logo + 2-line store name. The avatar ring uses
            the merchant's pastel accent as a soft fill so each card
            has a distinct color identity, matching the reference. */}
        <View style={styles.left}>
          <MerchantAvatar
            merchantName={bucket.merchantName}
            logoUrl={bucket.logoUrl}
            size={66}
          />
          <Text
            style={[
              styles.storeName,
              {
                color: theme.colors.text,
                fontFamily: theme.typography.fontFamilySemiBold,
              },
            ]}
            numberOfLines={1}
          >
            {bucket.merchantName}
          </Text>
        </View>

        {/* Right column — total, validity line, Redeem CTA. */}
        <View style={styles.right}>
          <Text
            style={[
              styles.total,
              {
                color: theme.colors.heroSurface,
                fontFamily: theme.typography.fontFamilyBold,
                fontSize: theme.typography.displayLg,
              },
            ]}
            accessibilityLabel={`Available ${formatGhs(total)}`}
          >
            {formatGhs(total)}
          </Text>

          <Text
            style={[
              styles.validity,
              {
                color: validityTone,
                fontFamily: theme.typography.fontFamilyMedium,
              },
            ]}
            numberOfLines={1}
          >
            {validityText}
          </Text>

          {/* Soft CTA — fills the right edge of the card. Pale berry
              fill (lighter shade of the brand) + brand-coloured text,
              more rectangular than the standard pill. */}
          <View style={styles.ctaWrap}>
            <TouchableOpacity
              onPress={onRedeem}
              activeOpacity={0.8}
              style={[
                styles.cta,
                {
                  backgroundColor: theme.colors.heroSurface,
                  borderRadius: theme.radii.sm,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Redeem credit"
            >
              <Text
                style={[
                  styles.ctaText,
                  {
                    color: theme.colors.surface,
                    fontFamily: theme.typography.fontFamilySemiBold,
                  },
                ]}
              >
                Redeem Now
              </Text>
              <Ionicons
                name="gift-outline"
                size={14}
                color={theme.colors.surface}
                style={styles.ctaIcon}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </GlassCard>
  );
}

function hexWithAlpha(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 0,
    marginVertical: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingVertical: 18,
  },
  left: {
    flex: 0.95,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    gap: 8,
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  storeName: {
    fontSize: 14,
    letterSpacing: 0.1,
    textAlign: "center",
  },
  storeSub: {
    fontSize: 12,
    textAlign: "center",
  },
  divider: {
    width: 0,
    borderLeftWidth: 1,
    borderStyle: "dashed",
    marginVertical: 14,
  },
  seam: {
    width: 0,
    position: "relative",
  },
  notch: {
    position: "absolute",
    left: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  notchTop: {
    top: -8,
  },
  notchBottom: {
    bottom: -8,
  },
  right: {
    flex: 1.4,
    paddingHorizontal: 16,
    justifyContent: "space-between",
    gap: 6,
  },
  total: {
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  validity: {
    fontSize: 12,
    lineHeight: 16,
  },
  ctaWrap: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  cta: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    flexDirection: "row",
  },
  ctaText: {
    fontSize: 14,
    letterSpacing: 0.2,
  },
  ctaIcon: {
    marginLeft: 6,
  },
});
