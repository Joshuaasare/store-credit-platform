import { Pressable, StyleSheet, Text, View } from "react-native";
import type { CustomerRedemptionRow } from "@store-credit-platform/api-services";
import GlassCard from "../../../shared/components/GlassCard";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";
import { formatGhs } from "../../../shared/utils/formatGhs";
import { formatRelativeTimestamp } from "../../../shared/utils/date.utils";
import {
  redemptionStatusChip,
  type RedemptionStatus,
} from "../../../shared/utils/credits.utils";

/**
 * Single redemption row on the "Credits Redeemed" tab.
 *
 * Three lines:
 *   - Top: amount (displayMd, primary text colour, bold) on the left,
 *     status chip on the right.
 *   - Bottom: relative timestamp on the left, "Cancel request" link
 *     button on the right (only when the row is pending).
 *
 * No avatar — the row reads as a ledger entry, not a feed item, and the
 * merchant name + branch are already established by the header above.
 *
 * The cancel action is lifted to the parent — the row just fires
 * `onCancelRequest` and the parent owns the confirmation sheet + mutation.
 */
export default function RedemptionRow({
  redemption,
  onCancelRequest,
}: {
  redemption: CustomerRedemptionRow;
  onCancelRequest?: (id: number) => void;
}) {
  const theme = useThemeTokens();

  const status: RedemptionStatus =
    redemption.rejected_at != null
      ? "rejected"
      : redemption.approved_at != null
        ? "approved"
        : "pending";

  const chip = redemptionStatusChip(status);
  const chipBg = theme.colors[chip.bgToken];
  const chipFg = theme.colors[chip.fgToken];

  const amount = Number(redemption.amount_redeemed) || 0;

  return (
    <GlassCard style={styles.card} padding={16}>
      <View style={styles.topRow}>
        <Text
          style={{
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamilyBold,
            fontSize: theme.typography.displayMd,
            letterSpacing: -0.5,
            lineHeight: 28,
            flexShrink: 1,
          }}
          accessibilityLabel={`Amount ${formatGhs(amount)}`}
        >
          {formatGhs(amount)}
        </Text>
        <View
          style={[styles.chip, { backgroundColor: chipBg }]}
          accessibilityLabel={`Status ${chip.label}`}
        >
          <Text
            style={{
              color: chipFg,
              fontFamily: theme.typography.fontFamilySemiBold,
              fontSize: 11,
              letterSpacing: 0.3,
            }}
          >
            {chip.label}
          </Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.fontFamilyRegular,
            fontSize: theme.typography.caption,
          }}
          accessibilityLabel={`Requested ${formatRelativeTimestamp(redemption.created_at)}`}
        >
          {formatRelativeTimestamp(redemption.created_at)}
        </Text>
        {status === "pending" && onCancelRequest ? (
          <Pressable
            onPress={() => onCancelRequest(redemption.id)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Cancel request"
          >
            <Text
              style={{
                color: theme.colors.error,
                fontFamily: theme.typography.fontFamilySemiBold,
                fontSize: theme.typography.caption,
              }}
            >
              Cancel request
            </Text>
          </Pressable>
        ) : null}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    flexShrink: 0,
  },
});
