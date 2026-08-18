import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import type {
  BaseBranch,
  CustomerApprovedRedemption,
  CustomerApprovedRedemptionApiResponse,
  CustomerCreditsApiResponse,
  CustomerMerchantBranchesApiResponse,
  CustomerPendingRedemption,
  CustomerPendingRedemptionApiResponse,
} from "@store-credit-platform/api-services";
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
import RedemptionAmountSheet from "./components/RedemptionAmountSheet";
import { CreditsMerchantAvailable } from "./screens/CreditsMerchantAvailable";
import { CreditsMerchantApproved } from "./screens/CreditsMerchantApproved";
import { CreditsMerchantPending } from "./screens/CreditsMerchantPending";

const CREDITS_QUERY_KEY = ["customer", "credits"] as const;
const PENDING_REQUEST_KEY = ["customer", "pendingRequest"] as const;
const BRANCHES_KEY_PREFIX = ["customer", "merchantBranches"] as const;
const APPROVED_REDEMPTIONS_KEY = ["customer", "approvedRedemptions"] as const;

/**
 * Parent merchant credit detail screen. Owns:
 *   - The tall fixed purple header (back arrow + merchant logo + 2-line
 *     store name + meta + available total).
 *   - The two-option tab switcher (`MerchantTabSwitcher`): Available /
 *     Pending.
 *   - The cancel-confirmation bottom-cancel modal
 *     (`MerchantRedemptionConfirmSheet`) + the cancellation mutation.
 *   - The amount + branch redemption sheet (`RedemptionAmountSheet`)
 *     and its create-vs-edit mutation pair
 *     (`createMyRedemptionRequest` / `updateMyRedemptionRequest`).
 *
 * Branches and the pending audit row are fetched in parallel so the
 * sheet can render the branch picker immediately on open. Single-
 * branch merchants collapse the picker to a static label (handled by
 * the sheet itself).
 */
export function MerchantCreditsScreen() {
  const route =
    useRoute<RouteProp<AppStackParamList, "CreditsMerchantDetail">>();
  const merchantId = route.params.merchantId;
  const autoOpenRedemption = route.params.autoOpenRedemption ?? false;
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  // The `["customer", "credits"]` query is also read by the Credits
  // tab list and by the Available tab body — the parent subscribes
  // here so the header available total recomputes on invalidation.
  const creditsQuery = useQuery<CustomerCreditsApiResponse>({
    queryKey: CREDITS_QUERY_KEY,
    queryFn: () => customerCreditsService.getMyCredits(),
  });

  // Branches at this merchant. Drives the redemption sheet's branch
  // picker. Cached per-merchant so re-opening the sheet after a
  // network blip doesn't reflash the picker.
  const branchesQuery = useQuery<CustomerMerchantBranchesApiResponse>({
    queryKey: [...BRANCHES_KEY_PREFIX, merchantId],
    queryFn: () => customerRedemptionsService.getMyBranches(merchantId),
  });

  // The customer's pending redemption at this merchant. `data` is null
  // when no pending row exists, which is the source-of-truth signal
  // for "no request out". Carries the 4-digit `redemption_code` that
  // the Pending tab renders.
  const pendingQuery = useQuery<CustomerPendingRedemptionApiResponse>({
    queryKey: [...PENDING_REQUEST_KEY, merchantId],
    queryFn: () => customerRedemptionsService.getMyPendingRequest(merchantId),
  });

  // The customer's approved history at this merchant — drives the
  // Approved tab. Cursor-paginated 20-per-page; the parent owns the
  // query so the cache survives tab switches. The child
  // `CreditsMerchantApproved` reads `items` + `hasNextPage` /
  // `fetchNextPage` and renders the FlatList.
  const approvedInfinite = useInfiniteQuery<
    CustomerApprovedRedemptionApiResponse,
    Error,
    { pages: CustomerApprovedRedemptionApiResponse[]; pageParams: unknown[] },
    readonly ["customer", "approvedRedemptions", number],
    number | undefined
  >({
    queryKey: [...APPROVED_REDEMPTIONS_KEY, merchantId] as readonly [
      "customer",
      "approvedRedemptions",
      number,
    ],
    initialPageParam: undefined,
    queryFn: ({ pageParam }) =>
      customerRedemptionsService.getMyApprovedRedemptions(merchantId, {
        cursor: pageParam,
        limit: 20,
      }),
    getNextPageParam: (last) => {
      if (!last.success) return undefined;
      const next = last.data?.nextCursor;
      return next == null ? undefined : next;
    },
  });

  // Flatten the infinite-query pages into a single items array for
  // the child. Failed pages are skipped so a transient mid-feed error
  // doesn't blank the list — the child surfaces the latest failure
  // separately via `approvedInfinite.error`.
  const approvedItems: CustomerApprovedRedemption[] = useMemo(() => {
    const pages = approvedInfinite.data?.pages ?? [];
    const items: CustomerApprovedRedemption[] = [];
    for (const page of pages) {
      if (page.success && page.data) {
        items.push(...page.data.items);
      }
    }
    return items;
  }, [approvedInfinite.data]);

  const branches: BaseBranch[] = useMemo(() => {
    const data = branchesQuery.data;
    if (data?.success) return data.data;
    return [];
  }, [branchesQuery.data]);

  const pendingRow: CustomerPendingRedemption | null = useMemo(() => {
    const data = pendingQuery.data;
    if (data?.success) return data.data;
    return null;
  }, [pendingQuery.data]);

  // The bucket for this merchant — derives the header meta + total so
  // both tabs render the same header.
  const bucket = useMemo<MerchantCreditBucket | null>(() => {
    if (!creditsQuery.data?.success) return null;
    const live = creditsQuery.data.data.live.filter(
      (c) => c.branch.merchant.id === merchantId,
    );
    return aggregateLiveByMerchant(live)[0] ?? null;
  }, [creditsQuery.data, merchantId]);

  const [tab, setTab] = useState<MerchantTab>("available");

  const tabOptions = useMemo<{ value: MerchantTab; label: string }[]>(
    () => [
      { value: "available", label: "Available" },
      { value: "pending", label: "Pending" },
      { value: "approved", label: "Approved" },
    ],
    [],
  );

  // Pending totals at this merchant — drives both the redeem-button
  // disable state (any pending → both CTAs disabled) and the sheet's
  // cap (available + current_pending, per the grilled decision).
  const pendingTotal = useMemo(() => {
    if (!creditsQuery.data?.success) return 0;
    let sum = 0;
    for (const credit of creditsQuery.data.data.live) {
      if (credit.branch.merchant.id !== merchantId) continue;
      sum += Number(credit.pending_redemption_amount) || 0;
    }
    return sum;
  }, [creditsQuery.data, merchantId]);

  const availableTotal = bucket?.totalRemaining ?? 0;
  const redemptionCap = availableTotal + pendingTotal;
  const isRedeemDisabled = redemptionCap <= 0;

  // Cancel state — the parent owns the sheet + mutation so the rolled-up
  // Pending card can fire `onCancelRequest(merchantId)` without the
  // child owning its own.
  const [pendingCancel, setPendingCancel] = useState(false);

  // Create / edit redemption sheet — `'closed' | 'create' | 'edit'`. The
  // mode drives the sheet copy + initial value.
  const [redemptionSheet, setRedemptionSheet] = useState<
    "closed" | "create" | "edit"
  >("closed");

  // `create` and `update` are sibling mutations: `create` POSTs a new
  // audit row (rejects 409 if pending already exists — the parent
  // guards the entry-point to never POST in that case), `update`
  // PATCHes the existing row (404 if no pending). The RPC returns the
  // new code on each successful round-trip; we just invalidate the
  // relevant queries.
  const upsertMutation = useMutation({
    mutationFn: (params: { amount: number; branchId: number }) => {
      // Create vs edit drives the right verb — `pendingRow` is null
      // for `create`. We deliberately READ `pendingRow` here rather
      // than switching on `redemptionSheet === "edit"` so a stale
      // sheet-mode state can't fire POST against an existing row.
      if (pendingRow) {
        return customerRedemptionsService.updateMyRedemptionRequest({
          merchantId,
          amount: params.amount,
          branchId: params.branchId,
        });
      }
      return customerRedemptionsService.createMyRedemptionRequest({
        merchantId,
        amount: params.amount,
        branchId: params.branchId,
      });
    },
    onSuccess: async (result) => {
      if (!result.success) {
        console.warn("Upsert redemption failed:", result.error);
        return;
      }
      setRedemptionSheet("closed");
      // After create / update the customer wants to see (or share) the
      // freshly-issued 4-digit code, so jump straight to the Pending
      // tab — that's where the code chip lives.
      setTab("pending");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CREDITS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: PENDING_REQUEST_KEY }),
      ]);
    },
    onError: (err) => {
      console.warn("Upsert redemption errored:", err);
    },
  });

  // Auto-open the redemption sheet when navigated from the main Credits
  // screen with `autoOpenRedemption: true`. Only fires once after the
  // credits query has data (so the cap is correct) and the redeem
  // affordance isn't disabled.
  useEffect(() => {
    if (!autoOpenRedemption) return;
    if (redemptionSheet !== "closed") return;
    if (creditsQuery.isLoading) return;
    if (isRedeemDisabled) return;
    setRedemptionSheet(pendingTotal > 0 ? "edit" : "create");
    // We only want this to fire once on mount with the param set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenRedemption, creditsQuery.isLoading]);

  const cancelMutation = useMutation({
    mutationFn: () =>
      customerRedemptionsService.cancelMyRedemptionRequest(merchantId),
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
            <CreditsMerchantAvailable
              onRedeemPress={() => {
                if (isRedeemDisabled) return;
                setRedemptionSheet(pendingTotal > 0 ? "edit" : "create");
              }}
              isRedeemDisabled={isRedeemDisabled}
              redeemCtaLabel={
                pendingTotal > 0 ? "Edit pending request" : "Redeem Now"
              }
            />
          ) : tab === "pending" ? (
            <CreditsMerchantPending
              merchantId={merchantId}
              merchantName={bucket?.merchantName ?? "this merchant"}
              onCancelRequest={() => setPendingCancel(true)}
              onEditRequest={() => setRedemptionSheet("edit")}
            />
          ) : (
            <CreditsMerchantApproved
              items={approvedItems}
              isLoading={approvedInfinite.isLoading}
              isError={approvedInfinite.isError}
              error={approvedInfinite.error}
              isFetchingNextPage={approvedInfinite.isFetchingNextPage}
              hasNextPage={approvedInfinite.hasNextPage}
              fetchNextPage={approvedInfinite.fetchNextPage}
              refetch={approvedInfinite.refetch}
            />
          )}
        </View>
      </View>

      <RedemptionAmountSheet
        visible={redemptionSheet !== "closed"}
        mode={redemptionSheet === "edit" ? "edit" : "create"}
        initialAmount={pendingRow?.amount_redeemed ?? pendingTotal}
        maxAmount={redemptionCap}
        branches={branches}
        initialBranchId={pendingRow?.branch_id ?? null}
        branchesLoading={branchesQuery.isLoading}
        merchantName={bucket?.merchantName ?? "this merchant"}
        isSubmitting={upsertMutation.isPending}
        onSubmit={(amount, branchId) => {
          if (upsertMutation.isPending) return;
          upsertMutation.mutate({ amount, branchId });
        }}
        onDismiss={() => {
          if (upsertMutation.isPending) return;
          setRedemptionSheet("closed");
        }}
      />

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
 * Tall fixed purple header. The structure is 2 stacked rows inside the
 * purple surface:
 *   1. Back arrow (own row at the top — sits above everything else)
 *   2. Avatar + 2-line store name + meta + available total
 */
function DetailHeader({
  merchantName,
  logoUrl,
  total,
  onBack,
}: {
  merchantName: string | null;
  logoUrl: string | null;
  total: number | null;
  onBack: () => void;
}) {
  const theme = useThemeTokens();
  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.header, { backgroundColor: theme.colors.primary }]}
    >
      <View style={styles.headerDecoration} pointerEvents="none">
        <View style={styles.couponTicket} />
        <View style={styles.couponPerforation} />
        <View style={styles.couponBadge}>
          <Text style={styles.couponBadgeLabel}>%</Text>
        </View>
      </View>

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
                fontFamily: theme.typography.fontFamilyRegular,
              },
            ]}
            numberOfLines={2}
          >
            {merchantName ?? "Merchant"}
          </Text>
        </View>

        {total !== null ? (
          <View style={styles.headerTotalWrap}>
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
            <Text
              style={[
                styles.headerTotalLabel,
                {
                  color: theme.colors.textOnPrimary,
                  fontFamily: theme.typography.fontFamilyMedium,
                },
              ]}
            >
              Total Available
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
    paddingRight: 30,
  },
  headerTitle: {
    fontSize: 16,
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
    fontSize: 24,
    letterSpacing: -0.3,
    marginTop: 2,
  },
});
