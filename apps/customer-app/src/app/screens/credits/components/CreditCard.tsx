import { StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import type { CustomerCreditWithBranch } from "@store-credit-platform/api-services";
import GlassCard from "../../../shared/components/GlassCard";
import { useThemeTokens } from "../../../theme/ThemeContext";

/**
 * Credit card — the money-themed anchor of the Credits screen. Each card
 * represents a single `customer_credit` row belonging to the customer.
 *
 * Visual hierarchy (per the feature spec):
 *   1. Branch / merchant name — the issuer, top-left, secondary weight.
 *   2. Credit type badge — "Running" / "Fixed" — pill next to the branch.
 *   3. Redeemed amount — small, secondary, sits under the branch line.
 *   4. REMAINING AMOUNT — the visual anchor: displayLg typography in
 *      `theme.colors.primary` so the money pops against the glass surface.
 *   5. Expiry / revocation date — caption, bottom of the card.
 *   6. Progress indicator — a slim bar showing redeemed vs total credit.
 *
 * Light and dark themes are handled entirely through `useThemeTokens()` —
 * no hardcoded hex colors.
 */
export default function CreditCard({
  credit,
  style,
}: {
  credit: CustomerCreditWithBranch;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useThemeTokens();

  // Numbers — the backend returns credit_amount / redeemed_total / remaining
  // as numbers (GHS). Format with 2 decimal places and a thousands separator
  // so the money reads cleanly.
  const formatGhs = (n: number) =>
    `GHS ${n.toLocaleString("en-GH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const remaining = Number(credit.remaining) || 0;
  const redeemedTotal = Number(credit.redeemed_total) || 0;
  const creditAmount = Number(credit.credit_amount) || 0;
  // Progress: redeemed / total. Clamped to [0, 1] so a stray over-redemption
  // doesn't render a bar wider than the track.
  const progress =
    creditAmount > 0
      ? Math.max(0, Math.min(1, redeemedTotal / creditAmount))
      : 0;

  // Issuer display — prefer the merchant name (the brand the customer
  // recognizes); the branch name is the specific location. If the branch
  // name is missing, fall back to just the merchant.
  const merchantName = credit.branch?.merchant?.name ?? "Merchant";
  const branchName = credit.branch?.name ?? null;
  const issuerLine = branchName
    ? `${merchantName} · ${branchName}`
    : merchantName;

  // Credit type label — "Running" / "Fixed" / null. Null hides the badge.
  const typeLabel =
    credit.credit_type === "running"
      ? "Running"
      : credit.credit_type === "fixed"
        ? "Fixed"
        : null;

  // Date line. Live credits show the expiry ("Expires ..."); revoked
  // credits show the revocation ("Revoked ..."); expired credits show the
  // expiry in the past ("Expired ..."). Lifetime credits (expires_at null)
  // show "No expiry".
  const dateLine = formatDateLine(credit);

  return (
    <GlassCard style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text
            style={[
              styles.issuer,
              {
                color: theme.colors.text,
                fontFamily: theme.typography.fontFamilySemiBold,
              },
            ]}
            numberOfLines={1}
          >
            {issuerLine}
          </Text>
          <Text
            style={[
              styles.redeemed,
              {
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.fontFamilyRegular,
              },
            ]}
          >
            Redeemed {formatGhs(redeemedTotal)}
          </Text>
        </View>
        {typeLabel != null && (
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor: theme.colors.surfacePill,
                borderColor: theme.colors.surfacePillBorder,
                borderRadius: theme.radii.pill,
              },
            ]}
          >
            <Text
              style={[
                styles.typeBadgeText,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.fontFamilySemiBold,
                },
              ]}
            >
              {typeLabel}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.amountRow}>
        <Text
          style={[
            styles.remainingLabel,
            {
              color: theme.colors.textMuted,
              fontFamily: theme.typography.fontFamilyMedium,
            },
          ]}
        >
          Remaining
        </Text>
        <Text
          style={[
            styles.remainingAmount,
            {
              color: theme.colors.primary,
              fontFamily: theme.typography.fontFamilyBold,
              fontSize: theme.typography.displayLg,
            },
          ]}
          accessibilityLabel={`Remaining ${formatGhs(remaining)}`}
        >
          {formatGhs(remaining)}
        </Text>
      </View>

      {/* Progress track — redeemed / total. Slim bar sitting on the surfacePill
          fill with the active portion in the brand primary. */}
      <View
        style={[
          styles.progressTrack,
          {
            backgroundColor: theme.colors.surfacePill,
            borderRadius: theme.radii.pill,
          },
        ]}
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          now: Math.round(progress * 100),
          max: 100,
          text: `${Math.round(progress * 100)}% redeemed`,
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${progress * 100}%`,
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radii.pill,
          }}
        />
      </View>

      <Text
        style={[
          styles.dateLine,
          {
            color:
              credit.status === "live"
                ? theme.colors.textSecondary
                : theme.colors.textMuted,
            fontFamily: theme.typography.fontFamilyRegular,
          },
        ]}
      >
        {dateLine}
      </Text>
    </GlassCard>
  );
}

function formatDateLine(credit: CustomerCreditWithBranch): string {
  if (credit.status === "revoked" && credit.revoked_at) {
    const d = new Date(credit.revoked_at);
    return `Revoked ${d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`;
  }
  if (credit.expires_at == null) {
    return "No expiry — lifetime credit";
  }
  const d = new Date(Number(credit.expires_at) * 1000);
  const label = credit.status === "live" ? "Expires" : "Expired";
  return `${label} ${d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 0,
    marginVertical: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  issuer: {
    fontSize: 16,
    letterSpacing: 0.1,
  },
  redeemed: {
    fontSize: 13,
  },
  typeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  typeBadgeText: {
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  amountRow: {
    marginTop: 16,
    gap: 4,
  },
  remainingLabel: {
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  remainingAmount: {
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  progressTrack: {
    marginTop: 16,
    height: 4,
    overflow: "hidden",
  },
  dateLine: {
    marginTop: 12,
    fontSize: 13,
  },
});
