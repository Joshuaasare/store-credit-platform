import { StyleSheet, Text, View } from "react-native";
import { FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import GlassCard from "../../../shared/components/GlassCard";
import MerchantActivityRow from "../../../shared/components/MerchantActivityRow";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";
import { formatRelativeTimestamp } from "../../../shared/utils/date.utils";
import type { CustomerApprovedRedemption } from "@store-credit-platform/api-services";
import { getInitials } from "../../../shared/utils/ui.utils";

/**
 * "Approved" tab body. Cursor-paginated audit-trail from
 * `customer_credit_redemptions` (one row per approved request, ordered
 * `approved_at DESC`). The parent `MerchantCreditsScreen` owns the
 * `useInfiniteQuery` so the cache survives tab switches; this component
 * is purely presentational.
 *
 * The list reuses the shared `MerchantActivityRow` primitive so the
 * three credit surfaces (main list, per-merchant Available, approved
 * history) render with one coherent row shape. The whole list sits
 * inside one `GlassCard` so a stack of approved rows reads as a single
 * transaction log rather than N stacked cards.
 *
 * Loading / error / empty states mirror the Pending tab so the three
 * tabs stay a single coherent merchant detail surface.
 */
export function CreditsMerchantApproved({
  items,
  isLoading,
  isError,
  error,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  refetch,
}: {
  items: CustomerApprovedRedemption[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
}) {
  const theme = useThemeTokens();

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
            : "Couldn't load approved redemptions."}
        </Text>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons
          name="checkmark-circle-outline"
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
          No approved redemptions
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
          Approved redemption requests will appear here once the merchant
          confirms them.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.cardWrap}>
      <GlassCard padding={0} style={styles.listCard}>
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.redemption_id)}
          renderItem={({ item }) => {
            const title = item.branch_name ?? "—";
            const meta = `Approved ${formatRelativeTimestamp(item.approved_at)}`;
            return (
              <MerchantActivityRow
                kind="merchant-approved"
                item={{
                  key: String(item.redemption_id),
                  initials: getInitials(title),
                  logoUrl: null,
                  title,
                  meta,
                  amount: item.amount_redeemed,
                  idSeed: item.branch_id,
                }}
              />
            );
          }}
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: 1,
                backgroundColor: theme.colors.surfaceBorder,
                marginHorizontal: 16,
              }}
            />
          )}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footer}>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontFamily: theme.typography.fontFamilyRegular,
                    fontSize: 13,
                  }}
                >
                  Loading more…
                </Text>
              </View>
            ) : !hasNextPage ? (
              <View style={styles.footer}>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontFamily: theme.typography.fontFamilyRegular,
                    fontSize: 12,
                    opacity: 0.7,
                  }}
                >
                  End of approved history
                </Text>
              </View>
            ) : null
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          refreshing={false}
          onRefresh={refetch}
        />
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    paddingTop: 4,
  },
  listCard: {
    overflow: "hidden",
  },
  listContent: {
    paddingBottom: 8,
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
  footer: {
    alignItems: "center",
    paddingVertical: 16,
  },
});
