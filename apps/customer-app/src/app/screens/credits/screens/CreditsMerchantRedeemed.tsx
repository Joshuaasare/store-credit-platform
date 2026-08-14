import { useCallback } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { CustomerRedemptionRow } from "@store-credit-platform/api-services";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";
import RedemptionRow from "../components/RedemptionRow";
import RejectedSection from "../components/RejectedSection";
import RedeemedEmptyState from "../components/RedeemedEmptyState";
import { useMerchantRedemptions } from "../lib/useMerchantRedemptions";

/**
 * "Credits Redeemed" tab body. Reads from the merchant-scoped
 * redemption query (own cache, invalidated on cancel), splits into
 * active (pending + approved) and rejected buckets, and renders a flat
 * chronological feed:
 *
 *   - Active rows (pending + approved mixed) — newest-first by
 *     `created_at` (already sorted server-side).
 *   - Rejected rows are NOT inline in the active list; they're shown
 *     inside a collapsed disclosure at the bottom of the list
 *     (RejectedSection). Tap to expand.
 *
 * On cancel: the row fires `onCancelRequest(id)` and the parent owns
 * the confirmation sheet + DELETE mutation + cache invalidation.
 */
export function CreditsMerchantRedeemed({
  merchantId,
  merchantName,
  onCancelRequest,
}: {
  merchantId: number;
  merchantName: string;
  onCancelRequest: (id: number) => void;
}) {
  const theme = useThemeTokens();

  const { pending, approved, rejected, isLoading, isError, error } =
    useMerchantRedemptions(merchantId);

  // Active feed = pending + approved merged. The service already returns
  // everything in `created_at desc` order, but each bucket is sorted
  // independently — merge by timestamp so the two streams interleave
  // naturally newest-first.
  const active: CustomerRedemptionRow[] = [...pending, ...approved].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const renderItem = useCallback(
    ({ item }: { item: CustomerRedemptionRow }) => (
      <RedemptionRow
        redemption={item}
        onCancelRequest={item.approved_at == null && item.rejected_at == null
          ? onCancelRequest
          : undefined}
      />
    ),
    [onCancelRequest],
  );

  if (isLoading) {
    return (
      <View style={styles.centerFill}>
        <Text style={{ color: theme.colors.textMuted }}>Loading…</Text>
      </View>
    );
  }
  if (isError) {
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
          {error instanceof Error
            ? error.message
            : "Couldn't load your redemptions."}
        </Text>
      </View>
    );
  }
  if (active.length === 0 && rejected.length === 0) {
    return <RedeemedEmptyState merchantName={merchantName} />;
  }

  return (
    <FlatList
      data={active}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      ListFooterComponent={<RejectedSection rejected={rejected} />}
    />
  );
}

const styles = StyleSheet.create({
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  listContent: {
    paddingBottom: 24,
  },
});
