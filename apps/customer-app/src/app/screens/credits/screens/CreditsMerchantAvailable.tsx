import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { RouteProp } from "@react-navigation/native";
import { useRoute } from "@react-navigation/native";
import type { CustomerCreditsApiResponse } from "@store-credit-platform/api-services";
import GlassCard from "../../../shared/components/GlassCard";
import MerchantActivityRow from "../../../shared/components/MerchantActivityRow";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";
import { formatGhs } from "../../../shared/utils/formatGhs";
import { creditStatusChip } from "../../../shared/utils/credits.utils";
import {
  aggregateLiveByMerchant,
  type MerchantCreditBucket,
} from "../lib/aggregateCredits";
import { customerCreditsService } from "../../../api/client";
import type { AppStackParamList } from "../../../navigation/RootNavigator";

const CREDITS_QUERY_KEY = ["customer", "credits"] as const;

export function CreditsMerchantAvailable({
  onRedeemPress,
  isRedeemDisabled,
  redeemCtaLabel,
}: {
  onRedeemPress: () => void;
  isRedeemDisabled: boolean;
  redeemCtaLabel: string;
}) {
  const theme = useThemeTokens();
  const route =
    useRoute<RouteProp<AppStackParamList, "CreditsMerchantDetail">>();
  const merchantId = route.params.merchantId;

  const query = useQuery<CustomerCreditsApiResponse>({
    queryKey: CREDITS_QUERY_KEY,
    queryFn: () => customerCreditsService.getMyCredits(),
  });

  const bucket = useMemo<MerchantCreditBucket | null>(() => {
    if (!query.data?.success) return null;
    const live = query.data.data.live.filter(
      (c) => c.branch.merchant.id === merchantId,
    );
    return aggregateLiveByMerchant(live)[0] ?? null;
  }, [query.data, merchantId]);

  // Credits fully consumed by pending (remaining <= 0) are dropped — they're
  // no longer spendable here. They still appear on the merchant's Approved
  // history once approved.
  const sections = useMemo<BranchSection[]>(() => {
    if (!bucket) return [];
    const byBranch = new Map<number, BranchSection>();
    for (const credit of bucket.credits) {
      if (Number(credit.remaining) <= 0) continue;
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
      if (section.credits.length === 0) continue;
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
  if (flatRows.length === 0) {
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
          Every credit here is reserved by a pending request. Cancel or wait for
          approval to free it up.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.scrollWrap}>
      <GlassCard padding={0} style={styles.listCard}>
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
              <CreditRow credit={item.credit} />
            )
          }
          ItemSeparatorComponent={({ leadingItem, trailingItem }) => {
            const trailingIsSection =
              (trailingItem as DetailRow | null)?.kind === "section";
            const leadingIsSection =
              (leadingItem as DetailRow | null)?.kind === "section";
            // Open up between branches so the next section breathes.
            if (leadingIsSection || trailingIsSection) {
              return <View style={styles.sectionGap} />;
            }
            return (
              <View
                style={{
                  height: 1,
                  backgroundColor: theme.colors.surfaceBorder,
                  marginHorizontal: 16,
                }}
              />
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </GlassCard>
      <Pressable
        onPress={onRedeemPress}
        disabled={isRedeemDisabled}
        accessibilityRole="button"
        accessibilityLabel={redeemCtaLabel}
        style={({ pressed }) => [
          styles.cta,
          {
            backgroundColor: theme.colors.primary,
            opacity: isRedeemDisabled ? 0.45 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <Text
          style={{
            color: theme.colors.textOnPrimary,
            fontFamily: theme.typography.fontFamilySemiBold,
            fontSize: 15,
            letterSpacing: 0.2,
          }}
        >
          {redeemCtaLabel}
        </Text>
        <Ionicons
          name="gift-outline"
          size={16}
          color={theme.colors.textOnPrimary}
          style={{ marginLeft: 6, marginTop: -1 }}
        />
      </Pressable>
    </View>
  );
}

function BranchSectionHeader({ section }: { section: BranchSection }) {
  const theme = useThemeTokens();
  const label = section.branchName ?? "Branch";
  const sub = section.city ? ` · ${section.city}` : "";
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
        {`${label}${sub}`}
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

function CreditRow({
  credit,
}: {
  credit: MerchantCreditBucket["credits"][number];
}) {
  const remaining = Number(credit.remaining) || 0;
  const chip = creditStatusChip(credit.expires_at);
  const title = credit.branch.name ?? `Branch #${String(credit.branch.id)}`;

  return (
    <MerchantActivityRow
      kind="credit-available"
      metaTone={
        chip.tone === "warning" || chip.tone === "error" ? "warning" : "muted"
      }
      item={{
        key: String(credit.id),
        initials:
          title
            .split(/\s+/)
            .map((w) => w[0] ?? "")
            .slice(0, 2)
            .join("")
            .toUpperCase() || "—",
        logoUrl: null,
        title,
        meta: chip.label,
        amount: remaining,
        idSeed: credit.branch.id,
      }}
    />
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
  scrollWrap: {
    flex: 1,
  },
  listCard: {
    overflow: "hidden",
  },
  listContent: {
    paddingBottom: 16,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 8,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionGap: {
    height: 5,
  },
});
