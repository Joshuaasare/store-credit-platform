import { useCallback } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { CustomerRedemptionRow } from "@store-credit-platform/api-services";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";
import RedemptionRow from "../components/RedemptionRow";
import PendingEmptyState from "../components/PendingEmptyState";
import { useMerchantRedemptions } from "../lib/useMerchantRedemptions";

/**
 * "Pending" tab body. Reads only the `pending` bucket from the
 * merchant-scoped redemption query (own cache, invalidated on cancel)
 * and renders a flat chronological feed of rows waiting for the
 * merchant to approve.
 *
 * Every row carries the "Cancel request" action — the parent owns the
 * confirmation sheet + DELETE mutation + cache invalidation, so
 * cancelling a pending row:
 *   1. dismisses the row from this tab (cache re-buckets it as gone),
 *   2. recomputes the Available tab's `pending_total` / `remaining`
 *      (`["customer", "credits"]` invalidated alongside).
 *
 * Service returns rows already in `created_at desc` order, so no
 * client-side sorting here.
 */
export function CreditsMerchantPending({
  merchantId,
  merchantName,
  onCancelRequest,
}: {
  merchantId: number;
  merchantName: string;
  onCancelRequest: (id: number) => void;
}) {
  const theme = useThemeTokens();

  const { pending, isLoading, isError, error } =
    useMerchantRedemptions(merchantId);

  const renderItem = useCallback(
    ({ item }: { item: CustomerRedemptionRow }) => (
      <RedemptionRow
        redemption={item}
        onCancelRequest={
          item.approved_at == null && item.rejected_at == null
            ? onCancelRequest
            : undefined
        }
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
            : "Couldn't load your pending redemptions."}
        </Text>
      </View>
    );
  }
  if (pending.length === 0) {
    return <PendingEmptyState merchantName={merchantName} />;
  }

  return (
    <FlatList
      data={pending}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
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
