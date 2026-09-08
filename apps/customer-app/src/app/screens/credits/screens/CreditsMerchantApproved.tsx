import { StyleSheet, Text, View } from "react-native";
import { FlatList } from "react-native";
import GlassCard from "../../../shared/components/GlassCard";
import MerchantActivityRow from "../../../shared/components/MerchantActivityRow";
import EmptyState from "../../../shared/components/EmptyState";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";
import { formatRelativeTimestamp } from "../../../shared/utils/date.utils";
import type { CustomerApprovedRedemption } from "@store-credit-platform/api-services";
import { getInitials } from "../../../shared/utils/ui.utils";
import ScreenBody from "../../../shared/components/ScreenBody";
import { useOffsets } from "../../../shared/hooks/useOffsets";

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
  const { bottomOffset } = useOffsets();

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
      <EmptyState
        compact
        icon="checkmark-circle-outline"
        title="No approved redemptions"
        message="Approved redemption requests will appear here once the merchant confirms them."
      />
    );
  }

  const renderFooter = () => {
    if (isFetchingNextPage) {
      return (
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
      );
    }
    if (!hasNextPage) {
      return (
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
      );
    }
    return null;
  };

  return (
    <View style={styles.cardWrap}>
      <ScreenBody
        style={{ paddingBottom: bottomOffset + 20 }}
        edges={["bottom"]}
        padding={0}
      >
        <GlassCard padding={0} style={styles.listCard}>
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => {
              const title = item.branch?.name ?? "—";
              const meta = `Approved ${formatRelativeTimestamp(item.approved_at)}`;
              return (
                <MerchantActivityRow
                  kind="merchant-approved"
                  item={{
                    key: String(item.id),
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
            ListFooterComponent={renderFooter}
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
      </ScreenBody>
    </View>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    flex: 1,
  },
  listCard: {
    overflow: "hidden",
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  listContent: {
    paddingBottom: 5,
  },
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 16,
  },
});
