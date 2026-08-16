import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { CustomerCreditsApiResponse } from "@store-credit-platform/api-services";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import ScreenBackground from "../../shared/components/ScreenBackground";
import ScreenBody from "../../shared/components/ScreenBody";
import GlassTransition from "../../shared/components/GlassTransition";
import GlassCard from "../../shared/components/GlassCard";
import MerchantActivityRow from "../../shared/components/MerchantActivityRow";
import EmptyState from "./components/EmptyState";
import ErrorState from "./components/ErrorState";
import LoadingState from "./components/LoadingState";
import { useThemeTokens } from "../../shared/theme/ThemeContext";
import { customerCreditsService } from "../../api/client";
import { formatShortDate } from "../../shared/utils/date.utils";
import {
  aggregateLiveByMerchant,
  type MerchantCreditBucket,
} from "./lib/aggregateCredits";
import type { AppStackParamList } from "../../navigation/RootNavigator";

const CREDITS_QUERY_KEY = ["customer", "credits"] as const;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Credits screen — the customer's money view of their store credit.
 *
 * The screen shows ONLY live credits (expired/redeemed credits never
 * reappear on this surface). Live credits are aggregated by merchant —
 * one row per merchant, total = sum of `remaining` across every branch
 * the customer has a live credit at. Tapping a row opens the per-merchant
 * detail screen.
 *
 * Layout follows the same compact-row pattern used on the merchant-
 * detail's Approved tab: a single shared `GlassCard` with hairline-
 * divided `MerchantActivityRow` cells — one per merchant — so the
 * whole list reads as one coherent transaction log rather than N
 * stacked hero cards.
 *
 *   ┌────────────────────────────────────────────────────┐
 *   │  ↑  [logo ring]   Merchant name           GH 12.00  │
 *   │                    Earliest expiry in 5 days       │
 *   └────────────────────────────────────────────────────┘
 *
 * `soonest` drives the meta line — see `merchantRow` for the full
 * copy matrix (lifetime / soon / today / 1 day / N days / date).
 *
 * Backend: single `/customers/me/credits` call returns `live` + `expired`;
 * only `live` is read.
 */
export function CreditsScreen() {
  const theme = useThemeTokens();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const query = useQuery<CustomerCreditsApiResponse>({
    queryKey: CREDITS_QUERY_KEY,
    queryFn: () => customerCreditsService.getMyCredits(),
  });

  const buckets = aggregateLiveByMerchant(
    query.data?.success ? query.data.data.live : [],
  );

  return (
    <ScreenBackground>
      <ScreenBody>
      <GlassTransition>
        <View style={styles.container}>
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.text,
                fontFamily: theme.typography.fontFamilyBold,
              },
            ]}
          >
            Credits
          </Text>

          <View style={styles.listArea}>
            {query.isLoading ? (
              <LoadingState />
            ) : query.isError ? (
              <ErrorState
                message={
                  query.error instanceof Error
                    ? query.error.message
                    : "Couldn't load your credits."
                }
              />
            ) : buckets.length === 0 ? (
              <EmptyState
                title="No live credits yet"
                subtitle="Visit a merchant to start earning credit on your purchases."
              />
            ) : (
              <GlassCard padding={0} style={styles.listCard}>
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
                      style={({ pressed }) => [
                        pressed ? { opacity: 0.7 } : null,
                      ]}
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
                        marginHorizontal: 16,
                      }}
                    />
                  )}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                />
              </GlassCard>
            )}
          </View>
        </View>
      </GlassTransition>
      </ScreenBody>
    </ScreenBackground>
  );
}

/**
 * Build the row payload for the main list. Meta text comes from
 * `bucket.soonest`:
 *
 *   - `expires_at === null`        → "Lifetime credit" (no expiry)
 *   - already past / within 60s   → "Earliest expiry soon" (warning tone)
 *   - later today (same calendar day, > 60s out) → "Earliest expiry today"
 *   - within 1 day                → "Earliest expiry in 1 day"
 *   - N days out                  → "Earliest expiry in {N} days"
 *   - far future (months/years)   → "Earliest expiry on 14 Aug 2027"
 *
 * Tone flips to warning when the credit is "soon" — either already
 * past, later today, or within the next 48 hours — so the row scans
 * as urgent without needing a separate chip.
 */
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
      // Months/years out — fall back to absolute date so the meta
      // line never reads "in 27 days" for far-future expiry.
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
  container: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    letterSpacing: -0.3,
    marginBottom: 16,
  },
  listArea: {
    flex: 1,
  },
  listCard: {
    overflow: "hidden",
  },
  listContent: {
    paddingBottom: 24,
  },
  });
