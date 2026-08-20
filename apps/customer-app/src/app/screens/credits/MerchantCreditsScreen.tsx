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

export function MerchantCreditsScreen() {
  const route =
    useRoute<RouteProp<AppStackParamList, "CreditsMerchantDetail">>();
  const merchantId = route.params.merchantId;
  const autoOpenRedemption = route.params.autoOpenRedemption ?? false;
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  // Also read by the Credits tab list + Available tab body; subscribing here
  // recomputes the header total on invalidation.
  const creditsQuery = useQuery<CustomerCreditsApiResponse>({
    queryKey: CREDITS_QUERY_KEY,
    queryFn: () => customerCreditsService.getMyCredits(),
  });

  // Cached per-merchant so re-opening the sheet after a blip doesn't reflash.
  const branchesQuery = useQuery<CustomerMerchantBranchesApiResponse>({
    queryKey: [...BRANCHES_KEY_PREFIX, merchantId],
    queryFn: () => customerRedemptionsService.getMyBranches(merchantId),
  });

  // null data = no pending row, the source-of-truth signal for "no request out".
  const pendingQuery = useQuery<CustomerPendingRedemptionApiResponse>({
    queryKey: [...PENDING_REQUEST_KEY, merchantId],
    queryFn: () => customerRedemptionsService.getMyPendingRequest(merchantId),
  });

  // Cursor-paginated 20-per-page; parent owns the query so the cache survives
  // tab switches.
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

  // Failed pages are skipped so a transient mid-feed error doesn't blank the
  // list; the child surfaces the latest failure via `approvedInfinite.error`.
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

  // Drives the redeem-button disable (any pending → both CTAs disabled) and
  // the sheet's cap (available + current_pending).
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

  const [pendingCancel, setPendingCancel] = useState(false);

  const [redemptionSheet, setRedemptionSheet] = useState<
    "closed" | "create" | "edit"
  >("closed");

  // `create` POSTs a new audit row (409 if pending already exists); `update`
  // PATCHes the existing row (404 if no pending). The RPC returns the new code.
  const upsertMutation = useMutation({
    mutationFn: (params: { amount: number; branchId: number }) => {
      // Read `pendingRow` (not `redemptionSheet === "edit"`) so stale sheet-mode
      // state can't fire POST against an existing row.
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
      // Jump to Pending so the customer sees the freshly-issued code chip.
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

  // Auto-open from the Credits screen's `autoOpenRedemption` param. Fires once
  // after credits data is in so the cap is correct.
  useEffect(() => {
    if (!autoOpenRedemption) return;
    if (redemptionSheet !== "closed") return;
    if (creditsQuery.isLoading) return;
    if (isRedeemDisabled) return;
    setRedemptionSheet(pendingTotal > 0 ? "edit" : "create");
    // Fire once on mount with the param set.
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
