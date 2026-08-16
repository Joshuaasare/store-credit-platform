import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";
import { formatGhs } from "../../../shared/utils/formatGhs";

/**
 * Finance-app style hero "credit card" — the brand color as the surface,
 * white type, oversized balance as the dominant element, and an
 * "across N stores" subline that frames the number as a wallet total (not a
 * balance on a single account). The CTA is a white pill on the card surface.
 *
 * Every brand-derived color is read from the theme so the card re-skins
 * when the brand changes. The static stylesheet only carries layout + the
 * white decorative tints.
 */
export default function HeroBalanceCard({
  totalRemaining,
  storeCount,
  creditsLoading,
  onViewCredits,
}: {
  totalRemaining: number;
  storeCount: number;
  creditsLoading: boolean;
  onViewCredits: () => void;
}) {
  const theme = useThemeTokens();
  const formattedAmount = formatGhs(totalRemaining);
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.heroSurface }]}>
      {/* Soft white highlight at the top so the gradient doesn't read as a flat
          block. Pure white at low alpha gives the card a "lit edge" without
          committing to a photo or pattern. */}
      <LinearGradient
        colors={["rgba(255,255,255,0.14)", "rgba(255,255,255,0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.highlight}
        pointerEvents="none"
      />
      {/* Decorative orb bottom-right — gives the surface some movement so it
          doesn't feel like a flat slab. Matches the credit-card aesthetic. */}
      <View style={styles.orb} pointerEvents="none" />

      <View style={styles.topRow}>
        <Text style={styles.label}>TOTAL CREDIT AVAILABLE</Text>
        <Ionicons
          name="wallet-outline"
          size={18}
          color="rgba(255,255,255,0.7)"
        />
      </View>

      <View style={styles.balanceBlock}>
        {creditsLoading ? (
          <ActivityIndicator size="large" color="#ffffff" />
        ) : (
          <Text
            style={styles.balance}
            accessibilityLabel={`Total credit available ${formattedAmount}`}
          >
            {formattedAmount}
          </Text>
        )}
        <Text style={styles.storeSubline}>
          {storeCount === 0
            ? "Across your saved stores"
            : storeCount === 1
              ? "Across 1 store"
              : `Across ${storeCount} stores`}
        </Text>
      </View>

      <View style={styles.ctaRow}>
        <Text style={styles.cardMeta}>StoreCredit Wallet</Text>
        <TouchableOpacity
          onPress={onViewCredits}
          activeOpacity={0.8}
          style={styles.pillCta}
          accessibilityRole="button"
          accessibilityLabel="View credits"
        >
          <Text
            style={[styles.pillCtaLabel, { color: theme.colors.heroSurface }]}
          >
            View credits
          </Text>
          <Ionicons
            name="arrow-forward"
            size={14}
            color={theme.colors.heroSurfaceCta}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingVertical: 20,
    // Subtle elevation — credit cards have very little shadow because they
    // are themselves the brand surface, not a panel on top of one.
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    minHeight: 168,
    justifyContent: "space-between",
  },
  highlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 90,
  },
  orb: {
    position: "absolute",
    bottom: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.2,
  },
  balanceBlock: {
    marginTop: 8,
  },
  balance: {
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    letterSpacing: -1,
  },
  storeSubline: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 4,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
  },
  cardMeta: {
    color: "rgba(255,255,255,0.65)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1,
  },
  pillCta: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    borderRadius: 5,
  },
  pillCtaLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginRight: 6,
  },
});
