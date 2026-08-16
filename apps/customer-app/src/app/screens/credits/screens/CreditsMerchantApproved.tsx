import { StyleSheet, Text, View } from "react-native";
import { FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import GlassCard from "../../../shared/components/GlassCard";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";
import { formatGhs } from "../../../shared/utils/formatGhs";
import { formatRelativeTimestamp } from "../../../shared/utils/date.utils";
import type { CustomerApprovedRedemption } from "@store-credit-platform/api-services";

/**
 * "Approved" tab body. Cursor-paginated audit-trail from
 * `customer_credit_redemptions` (one row per approved request, ordered
 * `approved_at DESC`). The parent `MerchantCreditsScreen` owns the
 * `useInfiniteQuery` so the cache survives tab switches; this component
 * is purely presentational.
 *
 * Visual treatment follows the Home tab's `ActivityRow` family — the
 * approval row IS an activity row, just scoped to a single merchant:
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │  ↓  [logo ring]   Branch name               GH 12.00  │
 *   │                    Approved 2 days ago               │
 *   └──────────────────────────────────────────────────────┘
 *
 *   - A down-arrow tinted in `primary` (the brand accent) carries the
 *     "redeemed" semantic across the app. ActivityRow uses the same
 *     brand tint for both its up- and down-arrow variants, so a
 *     customer scanning either tab gets the same directional grammar.
 *   - The branch placeholder is a small `storefront-outline` glyph
 *     inside a `surface` ring (matches ActivityRow's avatar-ring
 *     treatment without bringing in a per-branch logo URL we don't
 *     have on the audit row).
 *   - Amount sits right-aligned at the same baseline as the branch
 *     name (the "top line"), so the row reads as one horizontal
 *     block instead of stacking the amount over the timestamp.
 *   - "Approved {relative timestamp}" sits underneath at the
 *     `textMuted` tone — `formatRelativeTimestamp` collapses to
 *     "Just now / Nm / Nh / Yesterday / 14 Aug" so the secondary
 *     line stays one piece of copy.
 *
 * The whole list sits inside one `GlassCard`. A single card with
 * hairline-divided rows reads as "one coherent transaction log" rather
 * than a stack of cards — which is the same move the Home tab's
 * activity feed makes.
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
          renderItem={({ item }) => <ApprovedRow item={item} />}
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

/**
 * One row in the Approved list. Three siblings inside a single
 * horizontal block:
 *   1. Direction arrow — `primary`-tinted down-arrow, sized to sit
 *      tight against the avatar ring (matches ActivityRow's spacing
 *      without a tinted background).
 *   2. Branch placeholder ring — same shape as ActivityRow's avatar
 *      ring (`surface` fill + hairline border) but with a
 *      storefront glyph instead of a logo. Size 36 keeps it in
 *      family with ActivityRow's 36 MerchantAvatar.
 *   3. Branch name on the top line + "Approved {relative}" muted
 *      underneath, with the amount (in `primary`) right-aligned to the
 *      top line.
 *
 * No tap behaviour — the list is read-only. Tapping a row could open
 * a per-approval detail screen later.
 */
function ApprovedRow({ item }: { item: CustomerApprovedRedemption }) {
  const theme = useThemeTokens();

  // Branch fallback — when the merchant soft-deleted the branch after
  // the redemption was approved we still want a label. "—" reads as
  // "unknown location" without claiming a branch name.
  const branchLabel = item.branch_name ?? "—";
  const amountText = formatGhs(item.amount_redeemed);
  const relative = formatRelativeTimestamp(item.approved_at);

  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={`Redeemed ${amountText} at ${branchLabel}, ${relative}`}
    >
      <Ionicons name="arrow-down" size={18} color={theme.colors.primary} />

      <View
        style={[
          styles.branchRing,
          {
            borderColor: theme.colors.surfaceBorder,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <View
          style={[
            styles.branchInner,
            { backgroundColor: theme.colors.surfaceInput },
          ]}
        >
          <Ionicons
            name="storefront-outline"
            size={18}
            color={theme.colors.textSecondary}
          />
        </View>
      </View>

      <View style={styles.center}>
        <View style={styles.topLine}>
          <Text
            style={[
              styles.branch,
              {
                color: theme.colors.text,
                fontFamily: theme.typography.fontFamilySemiBold,
              },
            ]}
            numberOfLines={1}
          >
            {branchLabel}
          </Text>
          <Text
            style={[
              styles.amount,
              {
                color: theme.colors.primary,
                fontFamily: theme.typography.fontFamilySemiBold,
              },
            ]}
            numberOfLines={1}
          >
            {amountText}
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
          Approved {relative}
        </Text>
      </View>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  branchRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  branchInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  branch: {
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
