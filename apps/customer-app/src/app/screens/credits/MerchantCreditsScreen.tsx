import { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { CustomerCreditsApiResponse } from "@store-credit-platform/api-services";
import ScreenBackground from "../../shared/components/ScreenBackground";
import MerchantAvatar from "../../shared/components/MerchantAvatar";
import { useThemeTokens } from "../../shared/theme/ThemeContext";
import { formatGhs } from "../../shared/utils/formatGhs";
import { formatBranchLabel } from "../../shared/utils/ui.utils";
import {
  aggregateLiveByMerchant,
  type MerchantCreditBucket,
} from "./lib/aggregateCredits";
import {
  customerCreditsService,
  customerRedemptionsService,
} from "../../api/client";
import type { AppStackParamList } from "../../navigation/RootNavigator";
import MerchantTabSwitcher, {
  type MerchantTab,
} from "./components/MerchantTabSwitcher";
import MerchantRedemptionConfirmSheet from "./components/MerchantRedemptionConfirmSheet";
import { CreditsMerchantAvailable } from "./screens/CreditsMerchantAvailable";
import { CreditsMerchantPending } from "./screens/CreditsMerchantPending";

const CREDITS_QUERY_KEY = ["customer", "credits"] as const;
const PENDING_REQUEST_KEY = ["customer", "pendingRequest"] as const;

/**
 * Parent merchant credit detail screen. Owns:
 *   - The tall fixed pink header (back arrow + merchant logo + 2-line
 *     store name + meta + available total). The progress bar is
 *     removed — there's no progress to show on this surface anymore
 *     (the customer's spend is captured in the rolled-up Pending card
 *     and the per-credit Available list).
 *   - The two-option tab switcher (`MerchantTabSwitcher`): Available /
 *     Pending. The Redeemed tab is gone — the new audit model doesn't
 *     expose a per-merchant redemption history to the customer.
 *   - The cancel-confirmation bottom sheet
 *     (`MerchantRedemptionConfirmSheet`).
 *   - The cancel mutation (`DELETE /customers/me/merchants/:merchantId/
 *     redemptions` + cache invalidation).
 *
 * Pending is rendered as a single rolled-up card rather than a list —
 * the new model exposes one pending request per (customer, merchant)
 * pair (the fan-out breakdown is visible in the Available tab per
 * credit).
 */
export function MerchantCreditsScreen() {
  const route =
    useRoute<RouteProp<AppStackParamList, "CreditsMerchantDetail">>();
  const merchantId = route.params.merchantId;
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  // The `["customer", "credits"]` query is also read by the Credits
  // tab list and by the Available tab body — the parent subscribes
  // here so the header available total recomputes on invalidation.
  const creditsQuery = useQuery<CustomerCreditsApiResponse>({
    queryKey: CREDITS_QUERY_KEY,
    queryFn: () => customerCreditsService.getMyCredits(),
  });

  // The bucket for this merchant — derives the header meta + total so
  // both tabs render the same header.
  const bucket = useMemo<MerchantCreditBucket | null>(() => {
    if (!creditsQuery.data?.success) return null;
    const live = creditsQuery.data.data.live.filter(
      (c) => c.branch.merchant.id === merchantId,
    );
    return aggregateLiveByMerchant(live)[0] ?? null;
  }, [creditsQuery.data, merchantId]);

  const headerMeta = bucket
    ? (() => {
        const firstBranch = bucket.credits[0]?.branch;
        const label = firstBranch
          ? formatBranchLabel(firstBranch.name, firstBranch.city)
          : "All branches";
        return `${label} `;
      })()
    : null;

  const [tab, setTab] = useState<MerchantTab>("available");

  // Two-option pill order is the source of truth here — the switcher
  // renders whatever order this array declares.
  const tabOptions = useMemo<{ value: MerchantTab; label: string }[]>(
    () => [
      { value: "available", label: "Available" },
      { value: "pending", label: "Pending" },
    ],
    [],
  );

  // Cancel state — the parent owns the sheet + mutation so the rolled-up
  // Pending card can fire `onCancelRequest(merchantId)` without the
  // child owning its own.
  const [pendingCancel, setPendingCancel] = useState(false);

  const cancelMutation = useMutation({
    mutationFn: () =>
      customerRedemptionsService.cancelMyPendingRequest(merchantId),
    onSuccess: async (result) => {
      setPendingCancel(false);
      if (!result.success) {
        console.warn("Cancel redemption failed:", result.error);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CREDITS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: PENDING_REQUEST_KEY }),
      ]);
    },
    onError: (err) => {
      setPendingCancel(false);
      console.warn("Cancel redemption errored:", err);
    },
  });

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <DetailHeader
          merchantName={bucket?.merchantName ?? null}
          logoUrl={bucket?.logoUrl ?? null}
          meta={headerMeta}
          total={bucket?.totalRemaining ?? null}
          onBack={() => navigation.goBack()}
        />

        <View style={styles.tabSwitcherWrap}>
          <MerchantTabSwitcher
            options={tabOptions}
            value={tab}
            onChange={setTab}
          />
        </View>

        <View style={styles.scrollArea}>
          {tab === "available" ? (
            <CreditsMerchantAvailable />
          ) : (
            <CreditsMerchantPending
              merchantId={merchantId}
              merchantName={bucket?.merchantName ?? "this merchant"}
              onCancelRequest={() => setPendingCancel(true)}
            />
          )}
        </View>
      </View>

      <MerchantRedemptionConfirmSheet
        visible={pendingCancel}
        onDismiss={() => {
          if (!cancelMutation.isPending) setPendingCancel(false);
        }}
        onConfirm={() => {
          if (!pendingCancel) return;
          cancelMutation.mutate();
        }}
        isPending={cancelMutation.isPending}
      />
    </ScreenBackground>
  );
}

/**
 * Tall fixed pink header. The structure is 2 stacked rows inside the
 * pink surface (the previous progress row is removed):
 *   1. Back arrow (own row at the top — sits above everything else)
 *   2. Avatar + 2-line store name + meta + available total
 *
 * The progress bar that previously showed "X% redeemed of GHc Y of
 * GHc Z" is gone — the new redemption model exposes pending state
 * per credit on the Available tab and a rolled-up card on the Pending
 * tab, so a global progress bar in the header no longer matches the
 * mental model.
 */
function DetailHeader({
  merchantName,
  logoUrl,
  meta,
  total,
  onBack,
}: {
  merchantName: string | null;
  logoUrl: string | null;
  meta: string | null;
  total: number | null;
  onBack: () => void;
}) {
  const theme = useThemeTokens();
  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.header, { backgroundColor: theme.colors.heroSurface }]}
    >
      {/* Decorative coupon layer — sits behind the row of content.
          A rotated ticket-style rectangle with a dashed perforation
          stripe + a circular discount badge, both at low opacity.
          Mirrors the hero card's soft-orb treatment so the brand
          surface carries the same energy on both screens. */}
      <View style={styles.headerDecoration} pointerEvents="none">
        <View style={styles.couponTicket} />
        <View style={styles.couponPerforation} />
        <View style={styles.couponBadge}>
          <Text style={styles.couponBadgeLabel}>%</Text>
        </View>
      </View>

      {/* Row 1 — back arrow on its own row, sitting above everything.
          Pushed to the left edge so it reads as the universal 'leave
          this screen' affordance without competing with the merchant
          info beneath. */}
      <TouchableOpacity
        onPress={onBack}
        style={styles.headerBackRow}
        accessibilityRole="button"
        accessibilityLabel="Back"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name="arrow-back"
          size={22}
          color={theme.colors.textOnPrimary}
        />
      </TouchableOpacity>

      {/* Row 2 — avatar + store name + available total. */}
      <View style={styles.headerTopRow}>
        <MerchantAvatar
          merchantName={merchantName ?? "Merchant"}
          logoUrl={logoUrl}
          size={56}
          style={{ marginRight: 10 }}
        />

        <View style={styles.headerText}>
          <Text
            style={[
              styles.headerTitle,
              {
                color: theme.colors.textOnPrimary,
                fontFamily: theme.typography.fontFamilyBold,
              },
            ]}
            numberOfLines={2}
          >
            {merchantName ?? "Merchant"}
          </Text>
          {meta !== null ? (
            <Text
              style={[
                styles.headerMeta,
                {
                  color: theme.colors.textOnPrimary,
                  fontFamily: theme.typography.fontFamilyMedium,
                },
              ]}
              numberOfLines={1}
            >
              {meta}
            </Text>
          ) : null}
        </View>

        {total !== null ? (
          <View style={styles.headerTotalWrap}>
            <Text
              style={[
                styles.headerTotalLabel,
                {
                  color: theme.colors.textOnPrimary,
                  fontFamily: theme.typography.fontFamilyMedium,
                },
              ]}
            >
              Available
            </Text>
            <Text
              style={[
                styles.headerTotalValue,
                {
                  color: theme.colors.textOnPrimary,
                  fontFamily: theme.typography.fontFamilyBold,
                },
              ]}
              accessibilityLabel={`Total ${formatGhs(total)}`}
            >
              {formatGhs(total)}
            </Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  tabSwitcherWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  header: {
    flexDirection: "column",
    alignItems: "stretch",
    paddingTop: 10,
    paddingBottom: 24,
    paddingHorizontal: 20,
    overflow: "hidden",
    gap: 12,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerDecoration: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: "55%",
  },
  couponTicket: {
    position: "absolute",
    top: 18,
    right: -14,
    width: 180,
    height: 96,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.18)",
    transform: [{ rotate: "-12deg" }],
  },
  couponPerforation: {
    position: "absolute",
    top: 64,
    right: -14,
    width: 180,
    height: 0,
    borderTopWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.18)",
    transform: [{ rotate: "-12deg" }],
  },
  couponBadge: {
    position: "absolute",
    top: 18,
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  couponBadgeLabel: {
    color: "rgba(255,255,255,0.32)",
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    letterSpacing: -0.5,
  },
  headerBackRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: -4,
  },

  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 14,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  headerMeta: {
    fontSize: 11,
    opacity: 0.78,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  headerTotalWrap: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  headerTotalLabel: {
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    opacity: 0.78,
  },
  headerTotalValue: {
    fontSize: 20,
    letterSpacing: -0.3,
    marginTop: 2,
  },
});
