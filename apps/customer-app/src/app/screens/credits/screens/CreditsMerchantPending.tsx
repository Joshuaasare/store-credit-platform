import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";
import { formatGhs } from "../../../shared/utils/formatGhs";
import { customerCreditsService } from "../../../api/client";
import { useQuery } from "@tanstack/react-query";
import type { CustomerCreditsApiResponse } from "@store-credit-platform/api-services";
import { useMemo } from "react";

const CREDITS_QUERY_KEY = ["customer", "credits"] as const;

/**
 * "Pending" tab body. After the row-state collapse there is at most one
 * pending request per (customer, merchant) pair — the per-credit
 * breakdown is visible on the Available tab. We render a single
 * rolled-up card showing the requested amount + a "Cancel request"
 * action. No FlatList, no per-row cancel — just one card or an empty
 * state.
 *
 * The pending total is read from the customer's `customer_credit` rows
 * at this merchant — `pending_redemption_amount` is the source of
 * truth (it's updated atomically by the SQL fan-out RPC). The
 * Available tab and this card read the same query, so the totals
 * always agree.
 */
export function CreditsMerchantPending({
  merchantId,
  merchantName,
  onCancelRequest,
}: {
  merchantId: number;
  merchantName: string;
  onCancelRequest: () => void;
}) {
  const theme = useThemeTokens();

  const creditsQuery = useQuery<CustomerCreditsApiResponse>({
    queryKey: CREDITS_QUERY_KEY,
    queryFn: () => customerCreditsService.getMyCredits(),
  });

  // Roll up the merchant's `pending_redemption_amount` across every
  // live customer_credit row at this merchant. The credits query
  // returns both `live` and `expired` — pending is always live (the
  // fan-out zero-touches a row on revoke / expire via the auto-shrink
  // trigger), so we only sum live.
  const total = useMemo(() => {
    if (!creditsQuery.data?.success) return 0;
    let sum = 0;
    for (const credit of creditsQuery.data.data.live) {
      if (credit.branch.merchant.id !== merchantId) continue;
      sum += Number(credit.pending_redemption_amount) || 0;
    }
    return sum;
  }, [creditsQuery.data, merchantId]);

  if (creditsQuery.isLoading) {
    return (
      <View style={styles.centerFill}>
        <Text style={{ color: theme.colors.textMuted }}>Loading…</Text>
      </View>
    );
  }
  if (creditsQuery.isError) {
    return (
      <View style={styles.centerFill}>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.fontFamilyRegular,
            fontSize: 14,
            textAlign: "center",
          }}
        >
          {creditsQuery.error instanceof Error
            ? creditsQuery.error.message
            : "Couldn't load your pending request."}
        </Text>
      </View>
    );
  }

  if (total <= 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons
          name="time-outline"
          size={56}
          color={theme.colors.textMuted}
          style={styles.emptyIcon}
        />
        <Text
          style={[
            styles.emptyTitle,
            {
              color: theme.colors.text,
              fontFamily: theme.typography.fontFamilyMedium,
            },
          ]}
        >
          No pending request
        </Text>
        <Text
          style={[
            styles.emptySubtitle,
            {
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.fontFamilyRegular,
            },
          ]}
        >
          You don't have any pending redemption at {merchantName}.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.cardWrap}>
      <PendingCard
        amount={total}
        merchantName={merchantName}
        onCancelRequest={onCancelRequest}
      />
    </View>
  );
}

function PendingCard({
  amount,
  merchantName,
  onCancelRequest,
}: {
  amount: number;
  merchantName: string;
  onCancelRequest: () => void;
}) {
  const theme = useThemeTokens();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.surfaceBorder,
        },
      ]}
    >
      <Text
        style={[
          styles.eyebrow,
          {
            color: theme.colors.textMuted,
            fontFamily: theme.typography.fontFamilyMedium,
          },
        ]}
      >
        Pending request
      </Text>
      <Text
        style={[
          styles.amount,
          {
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamilyBold,
          },
        ]}
        accessibilityLabel={`Pending ${formatGhs(amount)}`}
      >
        {formatGhs(amount)}
      </Text>
      <Text
        style={[
          styles.caption,
          {
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.fontFamilyRegular,
          },
        ]}
      >
        Waiting for {merchantName} to confirm. Cancel any time before
        they approve.
      </Text>

      <Pressable
        onPress={onCancelRequest}
        accessibilityRole="button"
        accessibilityLabel="Cancel request"
        style={({ pressed }) => [
          styles.cancelButton,
          {
            backgroundColor: pressed
              ? theme.colors.surfaceInput
              : theme.colors.surface,
            borderColor: theme.colors.error,
          },
        ]}
      >
        <Text
          style={[
            styles.cancelLabel,
            {
              color: theme.colors.error,
              fontFamily: theme.typography.fontFamilySemiBold,
            },
          ]}
        >
          Cancel request
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    flex: 1,
    paddingTop: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  amount: {
    fontSize: 32,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  caption: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  cancelButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 4,
  },
  cancelLabel: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 6,
  },
  emptyIcon: {
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
