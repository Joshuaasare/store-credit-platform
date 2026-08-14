import { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { RouteProp } from "@react-navigation/native";
import { useRoute } from "@react-navigation/native";
import type { CustomerCreditsApiResponse } from "@store-credit-platform/api-services";
import GlassCard from "../../../shared/components/GlassCard";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";
import { formatGhs } from "../../../shared/utils/formatGhs";
import { formatShortDate } from "../../../shared/utils/date.utils";
import { creditStatusChip } from "../../../shared/utils/credits.utils";
import {
  aggregateLiveByMerchant,
  type MerchantCreditBucket,
} from "../lib/aggregateCredits";
import { customerCreditsService } from "../../../api/client";
import type { AppStackParamList } from "../../../navigation/RootNavigator";

const CREDITS_QUERY_KEY = ["customer", "credits"] as const;

/**
 * "Credits available" tab body. Reads the same `["customer", "credits"]`
 * query the parent screen owns so switching tabs does NOT cause a
 * refetch — the parent already keeps the data fresh via invalidation on
 * cancel.
 *
 * Renders the merchant's live credits grouped by branch, identical to
 * the prior `MerchantCreditsScreen` body. The header + progress + tab
 * switcher live on the parent screen.
 */
export function CreditsMerchantAvailable() {
  const theme = useThemeTokens();
  const route =
    useRoute<RouteProp<AppStackParamList, "CreditsMerchantDetail">>();
  const merchantId = route.params.merchantId;

  const query = useQuery<CustomerCreditsApiResponse>({
    queryKey: CREDITS_QUERY_KEY,
    queryFn: () => customerCreditsService.getMyCredits(),
  });

  // Pick the single bucket for this merchant. The aggregation helper
  // groups live credits by merchant — we filter to ours first so the
  // branch sections only render credits at this merchant.
  const bucket = useMemo<MerchantCreditBucket | null>(() => {
    if (!query.data?.success) return null;
    const live = query.data.data.live.filter(
      (c) => c.branch.merchant.id === merchantId,
    );
    return aggregateLiveByMerchant(live)[0] ?? null;
  }, [query.data, merchantId]);

  // Group this merchant's live credits by branch so the detail can
  // show a "Branch A — 2 credits, GH₵X total" section header. Even
  // when every credit lives at a single branch, this still renders the
  // branch name so the user knows where the credit is spendable.
  const sections = useMemo<BranchSection[]>(() => {
    if (!bucket) return [];
    const byBranch = new Map<number, BranchSection>();
    for (const credit of bucket.credits) {
      const existing = byBranch.get(credit.branch.id);
      if (existing) {
        existing.credits.push(credit);
        existing.totalRemaining += credit.remaining;
      } else {
        byBranch.set(credit.branch.id, {
          branchId: credit.branch.id,
          branchName: credit.branch.name,
          city: credit.branch.city,
          totalRemaining: credit.remaining,
          credits: [credit],
        });
      }
    }
    return Array.from(byBranch.values()).sort((a, b) =>
      (a.branchName ?? "").localeCompare(b.branchName ?? ""),
    );
  }, [bucket]);

  const flatRows = useMemo<DetailRow[]>(() => {
    const rows: DetailRow[] = [];
    for (const section of sections) {
      rows.push({ kind: "section", section });
      for (const credit of section.credits) {
        rows.push({ kind: "credit", credit });
      }
    }
    return rows;
  }, [sections]);

  if (query.isLoading) {
    return (
      <View style={styles.centerFill}>
        <Text style={{ color: theme.colors.textMuted }}>Loading…</Text>
      </View>
    );
  }
  if (!bucket) {
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
          No live credits at this merchant right now.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={flatRows}
      keyExtractor={(row, idx) =>
        row.kind === "section"
          ? `section-${row.section.branchId}`
          : `credit-${row.credit.id}-${idx}`
      }
      renderItem={({ item }) =>
        item.kind === "section" ? (
          <BranchSectionHeader section={item.section} />
        ) : (
          <CreditDetailRow credit={item.credit} />
        )
      }
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

/**
 * Branch section header — appears between credit rows on the detail
 * screen. The overall progress lives in the parent's `DetailHeader`, so
 * this section header is purely a label + branch total.
 */
function BranchSectionHeader({ section }: { section: BranchSection }) {
  const theme = useThemeTokens();
  return (
    <View style={styles.sectionHeader}>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontFamily: theme.typography.fontFamilySemiBold,
          fontSize: 12,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
        numberOfLines={1}
      >
        {section.branchName ?? "Branch"}
        {section.city ? ` · ${section.city}` : ""}
      </Text>
      <Text
        style={{
          color: theme.colors.textMuted,
          fontFamily: theme.typography.fontFamilyMedium,
          fontSize: 12,
        }}
      >
        {formatGhs(section.totalRemaining)}
      </Text>
    </View>
  );
}

function CreditDetailRow({
  credit,
}: {
  credit: MerchantCreditBucket["credits"][number];
}) {
  const theme = useThemeTokens();
  const amount = Number(credit.credit_amount) || 0;
  const remaining = Number(credit.remaining) || 0;

  const chip = creditStatusChip(credit.expires_at);
  const chipBg =
    chip.bgToken === "warningSurface"
      ? theme.colors.warningSurface
      : theme.colors.successSurface;
  const chipFg =
    chip.fgToken === "warning"
      ? theme.colors.warning
      : chip.fgToken === "success"
        ? theme.colors.success
        : theme.colors.error;

  return (
    <GlassCard style={styles.creditRow} padding={18}>
      <View style={styles.creditTopRow}>
        <View style={styles.creditAmountWrap}>
          <Text
            style={[
              styles.creditAmount,
              {
                color: theme.colors.text,
                fontFamily: theme.typography.fontFamilyBold,
              },
            ]}
            accessibilityLabel={`Remaining ${formatGhs(remaining)}`}
          >
            {formatGhs(remaining)}
          </Text>
          <Text
            style={[
              styles.creditAmountCaption,
              {
                color: theme.colors.textMuted,
                fontFamily: theme.typography.fontFamilyRegular,
              },
            ]}
          >
            of {formatGhs(amount)} total
          </Text>
        </View>
        <View
          style={[styles.statusChip, { backgroundColor: chipBg }]}
          accessibilityLabel={`Status ${chip.label}`}
        >
          <Text
            style={[
              styles.statusChipLabel,
              {
                color: chipFg,
                fontFamily: theme.typography.fontFamilySemiBold,
              },
            ]}
          >
            {chip.label}
          </Text>
        </View>
      </View>

      <View style={styles.creditMetaRow}>
        <Text
          style={[
            styles.creditMetaLabel,
            {
              color: theme.colors.textMuted,
              fontFamily: theme.typography.fontFamilyMedium,
            },
          ]}
        >
          Issued
        </Text>
        <Text
          style={[
            styles.creditMetaValue,
            {
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.fontFamilyRegular,
            },
          ]}
        >
          {formatShortDate(new Date(credit.created_at).getTime())}
        </Text>
      </View>
    </GlassCard>
  );
}

interface BranchSection {
  branchId: number;
  branchName: string | null;
  city: string | null;
  totalRemaining: number;
  credits: MerchantCreditBucket["credits"];
}

type DetailRow =
  | { kind: "section"; section: BranchSection }
  | {
      kind: "credit";
      credit: MerchantCreditBucket["credits"][number];
    };

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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 8,
  },
  creditRow: {
    marginBottom: 12,
  },
  creditTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  creditAmountWrap: {
    flex: 1,
    minWidth: 0,
  },
  creditAmount: {
    fontSize: 22,
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  creditAmountCaption: {
    fontSize: 12,
    marginTop: 4,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    flexShrink: 0,
  },
  statusChipLabel: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  creditMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  creditMetaLabel: {
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  creditMetaValue: {
    fontSize: 12,
  },
});
