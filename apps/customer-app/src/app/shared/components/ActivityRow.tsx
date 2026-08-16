import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CustomerActivity } from "@store-credit-platform/api-services";
import MerchantAvatar from "./MerchantAvatar";
import { useThemeTokens } from "../theme/ThemeContext";
import { formatGhs } from "../utils/formatGhs";
import { formatRelativeTimestamp } from "../utils/date.utils";

/**
 * Recent-Activity row — one entry from the unified credit activity feed
 * (issuance or approved redemption).
 *
 * Visual hierarchy (left → right):
 *   1. Direction arrow — green up-arrow for credit issued, red down-arrow
 *      for credit redeemed. No background, sits tight against the avatar.
 *   2. Merchant avatar (circled) — the merchant's logo if available,
 *      otherwise a pastel gradient with initials. A soft surface-ring
 *      border ties it back to the card's surface.
 *   3. Merchant name + location/timestamp block.
 *   4. Coloured amount sitting in the top line, right-aligned.
 *
 * Light and dark themes are handled entirely through `useThemeTokens()` —
 * no hardcoded hex colors.
 */
export default function ActivityRow({
  activity,
}: {
  activity: CustomerActivity;
}) {
  const theme = useThemeTokens();

  const isIssued = activity.kind === "credit_issued";
  const tintColor = isIssued ? theme.colors.success : theme.colors.error;
  const iconName = isIssued ? "arrow-up" : "arrow-down";
  const amountPrefix = isIssued ? "+" : "−";
  const amountText = formatGhs(activity.amount);

  // Issuer — prefer the merchant name (the brand the customer recognizes).
  // Branch name (if any) is shown underneath in muted caption, since it
  // identifies the specific location.
  const merchantName = activity.merchant.name;
  const logoUrl = activity.merchant.logo_url ?? null;
  const branchName = activity.branch.name;
  const locationLine = branchName ? branchName : activity.branch.city;

  const timestamp = formatTimestamp(activity.created_at);

  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={`${isIssued ? "Credit issued" : "Credit redeemed"} ${amountText} at ${merchantName}, ${timestamp}`}
    >
      {/* Direction arrow — bare, no fill, sits tight against the avatar. */}
      <Ionicons name={iconName} size={18} color={tintColor} />

      <View
        style={[
          styles.avatarRing,
          {
            borderColor: theme.colors.surfaceBorder,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <MerchantAvatar
          merchantName={merchantName}
          logoUrl={logoUrl}
          size={36}
        />
      </View>

      <View style={styles.center}>
        <View style={styles.topLine}>
          <Text
            style={[
              styles.merchant,
              {
                color: theme.colors.text,
                fontFamily: theme.typography.fontFamilySemiBold,
              },
            ]}
            numberOfLines={1}
          >
            {merchantName}
          </Text>
          <Text
            style={[
              styles.amount,
              {
                color: tintColor,
                fontFamily: theme.typography.fontFamilySemiBold,
              },
            ]}
            numberOfLines={1}
          >
            {amountPrefix} {amountText}
          </Text>
        </View>
        <Text
          style={[
            styles.timestamp,
            {
              color: theme.colors.textMuted,
              fontFamily: theme.typography.fontFamilyRegular,
            },
          ]}
          numberOfLines={1}
        >
          {locationLine ? `${locationLine} · ${timestamp}` : timestamp}
        </Text>
      </View>
    </View>
  );
}

/**
 * Compact timestamp — delegates to the shared `formatRelativeTimestamp`
 * helper so the relative-vs-absolute logic lives in one place.
 */
function formatTimestamp(iso: string): string {
  return formatRelativeTimestamp(iso);
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
  },
  avatarRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    gap: 2,
    marginLeft: 4,
  },
  topLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  merchant: {
    flex: 1,
    fontSize: 14,
    letterSpacing: 0.1,
  },
  timestamp: {
    fontSize: 12,
  },
  amount: {
    fontSize: 14,
    letterSpacing: 0.1,
  },
});
