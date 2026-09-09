import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { CustomerCreditsApiResponse } from "@store-credit-platform/api-services";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import ScreenBackground from "../../shared/components/ScreenBackground";
import ScreenBody from "../../shared/components/ScreenBody";
import AppRefreshControl from "../../shared/components/AppRefreshControl";
import PageHeader from "../../shared/components/PageHeader";
import GlassTransition from "../../shared/components/GlassTransition";
import GlassCard from "../../shared/components/GlassCard";
import MerchantActivityRow from "../../shared/components/MerchantActivityRow";
import EmptyState from "../../shared/components/EmptyState";
import ErrorState from "../../shared/components/ErrorState";
import { RowSkeleton } from "../../shared/components/Skeleton";
import { friendlyErrorMessage } from "../../shared/utils/errorDisplay";
import { useThemeTokens } from "../../shared/theme/ThemeContext";
import { customerCreditsService } from "../../api/client";
import { formatShortDate } from "../../shared/utils/date.utils";
import {
  aggregateLiveByMerchant,
  type MerchantCreditBucket,
} from "./lib/aggregateCredits";
import type { AppStackParamList } from "../../navigation/RootNavigator";
import { useOffsets } from "../../shared/hooks/useOffsets";

const CREDITS_QUERY_KEY = ["customer", "credits"] as const;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function CreditsScreen() {
  const theme = useThemeTokens();
  const { tabBarOffset, bottomOffset } = useOffsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const query = useQuery<CustomerCreditsApiResponse>({
    queryKey: CREDITS_QUERY_KEY,
    queryFn: () => customerCreditsService.getMyCredits(),
  });

  const buckets = aggregateLiveByMerchant(
    query.data?.success ? query.data.data.live : [],
  );

  const renderContent = () => {
    if (query.isLoading) {
      return (
        <View style={styles.skeletonList}>
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </View>
      );
    }
    if (query.isError) {
      return (
        <ErrorState
          title="Couldn't load your credits"
          message={friendlyErrorMessage(
            query.error,
            "We couldn't reach your wallet right now. Please try again.",
          )}
          onRetry={() => {
            void query.refetch();
          }}
          retrying={query.isRefetching}
        />
      );
    }
    if (buckets.length === 0) {
      return (
        <EmptyState
          icon="wallet-outline"
          title="No live credits yet"
          message="Visit a merchant to start earning credit on your purchases."
        />
      );
    }
    return (
      <FlatList
        data={buckets}
        keyExtractor={(item) => String(item.merchantId)}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate("CreditsMerchantDetail", {
                merchantId: item.merchantId,
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`${item.merchantName} credits`}
            style={({ pressed }) => [pressed ? { opacity: 0.7 } : null]}
          >
            <MerchantActivityRow
              kind="merchant-available"
              item={merchantRow(item)}
              metaTone={merchantRow(item).metaTone}
            />
          </Pressable>
        )}
        ItemSeparatorComponent={() => (
          <View
            style={{
              height: 1,
              backgroundColor: theme.colors.surfaceBorder,
              marginHorizontal: 10,
            }}
          />
        )}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <AppRefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => {
              void query.refetch();
            }}
          />
        }
        contentContainerStyle={{
          ...styles.listContent,
          paddingBottom: tabBarOffset + bottomOffset,
        }}
      />
    );
  };

  return (
    <ScreenBackground>
      <PageHeader />
      <ScreenBody edges={["bottom"]}>
        <View style={styles.listArea}>{renderContent()}</View>
      </ScreenBody>
    </ScreenBackground>
  );
}

// Meta text from `bucket.soonest`. Tone flips to warning when expiry is
// already past, today, or within 48h — urgent without a separate chip.
function merchantRow(bucket: MerchantCreditBucket): {
  key: string;
  initials: string;
  logoUrl: string | null;
  title: string;
  meta: string;
  amount: number;
  metaTone: "muted" | "warning";
  idSeed: number;
} {
  const soonest = bucket.soonest;
  let meta = "Lifetime credit";
  let tone: "muted" | "warning" = "muted";

  if (soonest !== null && soonest.expires_at !== null) {
    const msUntil = soonest.expires_at - Date.now();
    const days = Math.floor(msUntil / MS_PER_DAY);

    if (msUntil <= 60_000) {
      meta = "Earliest expiry soon";
      tone = "warning";
    } else if (days < 1) {
      meta = "Earliest expiry today";
      tone = "warning";
    } else if (days === 1) {
      meta = "Earliest expiry in 1 day";
      tone = "warning";
    } else if (days < 30) {
      meta = `Earliest expiry in ${days} days`;
      tone = msUntil <= 1000 * 60 * 60 * 48 ? "warning" : "muted";
    } else {
      // Far-future expiry falls back to absolute date so the meta never reads "in 27 days".
      meta = `Earliest expiry on ${formatShortDate(soonest.expires_at)}`;
    }
  }

  return {
    key: String(bucket.merchantId),
    initials:
      bucket.merchantName
        .split(/\s+/)
        .map((w) => w[0] ?? "")
        .slice(0, 2)
        .join("")
        .toUpperCase() || "—",
    logoUrl: bucket.logoUrl,
    title: bucket.merchantName,
    meta,
    amount: bucket.totalRemaining,
    metaTone: tone,
    idSeed: bucket.merchantId,
  };
}

const styles = StyleSheet.create({
  listArea: {
    flex: 1,
    paddingTop: 16,
  },
  listCard: {
    overflow: "hidden",
  },
  listContent: {
    paddingBottom: 24,
  },
  skeletonList: {
    flex: 1,
    justifyContent: "center",
  },
});
