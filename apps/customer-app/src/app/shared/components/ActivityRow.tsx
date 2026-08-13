import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CustomerActivity } from "@store-credit-platform/api-services";
import { useThemeTokens } from "../../theme/ThemeContext";
import { formatGhs } from "../utils/formatGhs";

/**
 * Recent-Activity row — one entry from the unified credit activity feed
 * (issuance or approved redemption). The icon disc flips between the
 * `success` and `error` semantic tokens based on `activity.kind`:
 *
 *   credit_issued    → green up-arrow, "+ GHS xxx.xx" in success color
 *   credit_redeemed  → red down-arrow, "- GHS xxx.xx" in error color
 *
 * The sign prefix is always shown so the money direction is unambiguous
 * at a glance. The merchant name sits center-left; the timestamp sits
 * underneath in the muted caption color.
 *
 * Light and dark themes are handled entirely through `useThemeTokens()` —
 * no hardcoded hex colors.
 */
export default function ActivityRow({
  activity,
  showSeparator,
}: {
  activity: CustomerActivity;
  /**
   * Render a hairline divider above this row. The caller passes `true` for
   * every row after the first so the divider sits between rows rather than
   * dangling above the first or below the last.
   */
  showSeparator?: boolean;
}) {
  const theme = useThemeTokens();

  const isIssued = activity.kind === "credit_issued";
  const tintColor = isIssued ? theme.colors.success : theme.colors.error;
  const surfaceColor = isIssued
    ? theme.colors.successSurface
    : theme.colors.surfacePill;
  const iconName = isIssued ? "arrow-up-circle" : "arrow-down-circle";
  const amountPrefix = isIssued ? "+" : "−";
  const amountText = formatGhs(activity.amount);

  // Issuer — prefer the merchant name (the brand the customer
  // recognizes). Branch name (if any) is shown underneath in muted
  // caption, since it identifies the specific location.
  const merchantName = activity.merchant.name;
  const branchName = activity.branch.name;
  const locationLine = branchName ? branchName : activity.branch.city;

  const timestamp = formatTimestamp(activity.created_at);

  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={`${isIssued ? "Credit issued" : "Credit redeemed"} ${amountText} at ${merchantName}, ${timestamp}`}
    >
      {showSeparator ? (
        <View
          style={[
            styles.separator,
            { borderBottomColor: theme.colors.surfaceBorder },
          ]}
        />
      ) : null}
      <View
        style={[
          styles.iconDisc,
          { backgroundColor: surfaceColor, borderRadius: theme.radii.pill },
        ]}
      >
        <Ionicons name={iconName} size={22} color={tintColor} />
      </View>

      <View style={styles.center}>
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

      <Text
        style={[
          styles.amount,
          {
            color: tintColor,
            fontFamily: theme.typography.fontFamilySemiBold,
          },
        ]}
      >
        {amountPrefix} {amountText}
      </Text>
    </View>
  );
}

/**
 * Compact timestamp — "Just now", "5m ago", "2h ago", "Yesterday", or a
 * short date. Activities are typically recent so the relative form reads
 * more naturally than a full date.
 */
function formatTimestamp(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const now = Date.now();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const thenDate = new Date(then);
  const nowDate = new Date(now);
  const isYesterday =
    thenDate.getFullYear() === nowDate.getFullYear() &&
    thenDate.getMonth() === nowDate.getMonth() &&
    nowDate.getDate() - thenDate.getDate() === 1;
  if (isYesterday) return "Yesterday";

  // Older than 24h — show short date.
  return thenDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  iconDisc: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    gap: 2,
  },
  merchant: {
    fontSize: 16,
    letterSpacing: 0.1,
  },
  timestamp: {
    fontSize: 13,
  },
  amount: {
    fontSize: 15,
    letterSpacing: 0.1,
  },
  separator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
