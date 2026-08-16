import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";
import {
  customerCreditsService,
  customerRedemptionsService,
} from "../../../api/client";
import { useQuery } from "@tanstack/react-query";
import type {
  CustomerCreditsApiResponse,
  CustomerPendingRedemption,
  CustomerPendingRedemptionApiResponse,
} from "@store-credit-platform/api-services";
import { useMemo } from "react";
import GlassCard from "../../../shared/components/GlassCard";
import MerchantActivityRow from "../../../shared/components/MerchantActivityRow";
import { getInitials } from "../../../shared/utils/ui.utils";

const CREDITS_QUERY_KEY = ["customer", "credits"] as const;
const PENDING_REQUEST_KEY = ["customer", "pendingRequest"] as const;

/**
 * "Pending" tab body. After the row-state collapse there is at most one
 * pending request per (customer, merchant) pair — the per-credit
 * breakdown is visible on the Available tab.
 *
 * Renders ONE `GlassCard` containing every piece of pending content so
 * the whole pending state reads as a single bordered surface, not three
 * loose blocks. Inside the card, hairline dividers separate four stacked
 * sections that share the same card padding:
 *
 *   ┌────────────────────────────────────────────────┐
 *   │  ↓  [store ring]   Pending at Branch A   GH X  │  ← row
 *   │                     Waiting for merchant       │
 *   │ ───────────────────────────────────────────────│
 *   │              YOUR CODE                         │
 *   │                 [ 4827 ]                       │  ← code chip
 *   │  Share this code with ... to confirm.          │
 *   │ ───────────────────────────────────────────────│
 *   │  [ Edit request ]    [ Cancel request ]        │  ← actions
 *   └────────────────────────────────────────────────┘
 *
 * Two queries are read:
 *   - `["customer", "credits"]` — drives the amount total + the tab's
 *     loading/error empty state (this is also the source of truth for
 *     "is there a pending row" via the rolled-up total).
 *   - `["customer", "pendingRequest", merchantId]` — drives the
 *     `redemption_code` + branch name display. Returns `data: null`
 *     when the audit row is missing (race with cancel).
 */
export function CreditsMerchantPending({
  merchantId,
  merchantName,
  onCancelRequest,
  onEditRequest,
}: {
  merchantId: number;
  merchantName: string;
  onCancelRequest: () => void;
  onEditRequest: () => void;
}) {
  const theme = useThemeTokens();

  const creditsQuery = useQuery<CustomerCreditsApiResponse>({
    queryKey: CREDITS_QUERY_KEY,
    queryFn: () => customerCreditsService.getMyCredits(),
  });

  const pendingQuery = useQuery<CustomerPendingRedemptionApiResponse>({
    // Shares its cache with the parent screen's `pendingQuery` —
    // TanStack de-dupes by queryKey, so the network call only fires
    // once even though both hooks subscribe.
    queryKey: [...PENDING_REQUEST_KEY, merchantId],
    queryFn: () => customerRedemptionsService.getMyPendingRequest(merchantId),
  });

  // Roll up the merchant's `pending_redemption_amount` across every
  // live customer_credit row at this merchant. The credits query
  // returns both `live` and `expired` — pending is always live (the
  // fan-out zero-touches a row on revoke / expire via the auto-shrink
  // trigger), so we only sum live.
  const total = useMemo(() => {
    if (!creditsQuery.data?.success) return 0;
    let sum = 0;
    for (const credit of creditsQuery.data.data.live) {
      if (credit.branch.merchant.id !== merchantId) continue;
      sum += Number(credit.pending_redemption_amount) || 0;
    }
    return sum;
  }, [creditsQuery.data, merchantId]);

  if (creditsQuery.isLoading) {
    return (
      <View style={styles.centerFill}>
        <Text style={{ color: theme.colors.textMuted }}>Loading…</Text>
      </View>
    );
  }
  if (creditsQuery.isError) {
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
          {creditsQuery.error instanceof Error
            ? creditsQuery.error.message
            : "Couldn't load your pending request."}
        </Text>
      </View>
    );
  }

  if (total <= 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons
          name="time-outline"
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
          No pending request
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
          You don't have any pending redemption at {merchantName}.
        </Text>
      </View>
    );
  }

  const pendingRow: CustomerPendingRedemption | null = pendingQuery.data
    ?.success
    ? pendingQuery.data.data
    : null;

  return (
    <View style={styles.scrollWrap}>
      <GlassCard padding={0} style={styles.listCard}>
        <MerchantActivityRow
          kind="merchant-approved"
          metaTone="warning"
          item={{
            key: "pending-rollup",
            initials: getInitials(pendingRow?.branch_name),
            logoUrl: null,
            title: pendingRow?.branch_name
              ? `Pending at ${pendingRow.branch_name}`
              : "Pending request",
            meta: "Waiting for merchant",
            amount: total,
            // Fall back to the merchant id while the pending audit row
            // is still loading — the row's branch_id is the stable
            // signal once it's fetched.
            idSeed: pendingRow?.branch_id ?? merchantId,
          }}
        />

        <Divider />

        <PendingCodeBlock pendingRow={pendingRow} merchantName={merchantName} />

        <PendingActions onEdit={onEditRequest} onCancel={onCancelRequest} />
      </GlassCard>
    </View>
  );
}

/**
 * Hairline divider that matches the Approved tab's inset-by-16 visual.
 * Full-width within the card padding so the dividers frame the row +
 * the code block + the actions as one column.
 */
function Divider() {
  const theme = useThemeTokens();
  return (
    <View
      style={{
        height: 1,
        backgroundColor: theme.colors.surfaceBorder,
        marginHorizontal: 16,
      }}
    />
  );
}

/**
 * Code block — eyebrow label, the 4-digit code chip (or a dashed
 * placeholder while the audit row loads), and the share caption. All
 * centered so the code reads as the focal point. Sits inside the
 * bordered `GlassCard` so the chip is visually bounded by the card's
 * own outline.
 */
function PendingCodeBlock({
  pendingRow,
  merchantName,
}: {
  pendingRow: CustomerPendingRedemption | null;
  merchantName: string;
}) {
  const theme = useThemeTokens();

  const codeText = pendingRow
    ? String(pendingRow.redemption_code).padStart(4, "0")
    : null;
  const branchLabel = pendingRow?.branch_name ?? null;

  return (
    <View style={styles.codeBlock}>
      <Text
        style={{
          color: theme.colors.textMuted,
          fontFamily: theme.typography.fontFamilyMedium,
          fontSize: 11,
          letterSpacing: 0.6,
          textTransform: "uppercase",
        }}
      >
        Your code
      </Text>
      {codeText ? (
        <View style={[styles.codeChip]}>
          <Text
            style={{
              color: theme.colors.primary,
              fontFamily: theme.typography.fontFamilyBold,
              fontSize: 26,
              letterSpacing: 8,
            }}
            accessibilityLabel={`Redemption code ${codeText}`}
          >
            {codeText}
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.codeChip,
            {
              backgroundColor: theme.colors.surfaceInput,
              borderColor: theme.colors.surfaceBorder,
              borderWidth: 1,
              borderStyle: "dashed",
            },
          ]}
        >
          <Text
            style={{
              color: theme.colors.textMuted,
              fontFamily: theme.typography.fontFamilyMedium,
              fontSize: 26,
              letterSpacing: 8,
            }}
          >
            ····
          </Text>
        </View>
      )}
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontFamily: theme.typography.fontFamilyRegular,
          fontSize: 13,
          lineHeight: 19,
          textAlign: "center",
          marginTop: 6,
          paddingHorizontal: 16,
        }}
      >
        Share this code with {merchantName} staff to confirm your redemption
        {branchLabel ? ` at ${branchLabel}` : ""}.
      </Text>
    </View>
  );
}

/**
 * Edit + Cancel action row. Fills the card edge-to-edge with a 10px
 * gutter between the two. Edit is the primary fill; Cancel is an
 * outline button for the destructive action — the same visual split
 * the prior version used, just moved inside the bordered card.
 */
function PendingActions({
  onEdit,
  onCancel,
}: {
  onEdit: () => void;
  onCancel: () => void;
}) {
  const theme = useThemeTokens();
  return (
    <View style={styles.actionsRow}>
      <Pressable
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel="Edit request"
        style={({ pressed }) => [
          styles.actionButton,
          {
            backgroundColor: theme.colors.primary,
            opacity: pressed ? 0.85 : 1,
            borderRadius: theme.radii.sm,
          },
        ]}
      >
        <Text
          style={{
            color: theme.colors.textOnPrimary,
            fontFamily: theme.typography.fontFamilySemiBold,
            fontSize: 13,
            letterSpacing: 0.2,
          }}
        >
          Edit request
        </Text>
      </Pressable>
      <Pressable
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Cancel request"
        style={({ pressed }) => [
          styles.actionButton,
          {
            backgroundColor: pressed
              ? theme.colors.surfaceInput
              : theme.colors.surface,
            borderColor: theme.colors.error,
            borderWidth: 1,
            borderRadius: theme.radii.sm,
          },
        ]}
      >
        <Text
          style={{
            color: theme.colors.error,
            fontFamily: theme.typography.fontFamilySemiBold,
            fontSize: 13,
            letterSpacing: 0.2,
          }}
        >
          Cancel request
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  scrollWrap: {
    flex: 1,
  },
  listCard: {
    overflow: "hidden",
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
  codeBlock: {
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 18,
  },
  codeChip: {
    paddingHorizontal: 26,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  actionButton: {
    flex: 1,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
