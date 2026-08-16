import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MerchantAvatar from "./MerchantAvatar";
import { useThemeTokens } from "../theme/ThemeContext";
import { formatGhs } from "../utils/formatGhs";
import { formatRelativeTimestamp } from "../utils/date.utils";

/**
 * Compact row primitive used by the three customer-side merchant credit
 * list surfaces (main Credits list, per-merchant Available, per-merchant
 * Approved). Rendered inside a shared `GlassCard` so a stack of rows
 * reads as one coherent transaction log instead of N stacked cards —
 * matching the Approved tab's settled visual language.
 *
 * Anatomy (left → right):
 *   1. Direction arrow tinted in `primary` (brand berry). Down-arrow
 *      for all "money out of wallet" rows; up-arrow for "money in".
 *   2. Avatar ring (MerchantAvatar) sized at 36 — same diameter as
 *      `ActivityRow`'s avatar so the two row families blend when a
 *      customer scans between Home → Credits.
 *   3. Title (merchant or branch name, `fontFamilySemiBold`) + muted
 *      meta line underneath ("Approved 2 days ago" / "Expires in 5
 *      days" / "Issued 14 Aug"). One line each.
 *   4. Right-aligned amount in `primary`, same baseline as the title.
 *
 * No tap behaviour here — the parent card wraps the list and handles
 * navigation. Rows are read-only.
 */

export type MerchantActivityRowKind =
  /** Per-credit Available row: storefront avatar, branch name + status meta, right-aligned remaining amount. */
  | "credit-available"
  /** Per-merchant main-list row: merchant avatar, merchant name + soonest expiry meta, right-aligned total. */
  | "merchant-available"
  /** Per-redemption Approved row: storefront avatar, branch name + relative time, right-aligned amount. */
  | "merchant-approved";

export interface MerchantActivityRowItem {
  /** Stable key — `merchantId`, `redemption_id`, `credit.id`, etc. */
  key: string;
  /** Avatar icon name — defaults to storefront when null. */
  iconName?: keyof typeof Ionicons.glyphMap;
  /** Avatar fallback when no logo: 1-2 char initials (uppercased). */
  initials: string;
  /** Logo URL; falls back to initials when null. */
  logoUrl: string | null;
  /** Title (top line). */
  title: string;
  /** Secondary line beneath the title — relative time, expiry, status. */
  meta: string;
  /** Right-aligned amount in major units (already summed). */
  amount: number;
  /**
   * Stable ID that drives the placeholder avatar gradient. When a
   * branch / merchant has rows on multiple tabs (Available, Pending,
   * Approved) or surfaces (main Credits list), pass `branch_id` or
   * `merchant_id` here so the same entity always renders the same
   * colour — regardless of which row copy appears on each tab.
   */
  idSeed?: number | string | null;
}

export default function MerchantActivityRow({
  kind,
  item,
  metaTone = "muted",
}: {
  kind: MerchantActivityRowKind;
  item: MerchantActivityRowItem;

  /** Tone for the secondary meta line — "muted" (default) or "warning" (amber). */
  metaTone?: "muted" | "warning";
}) {
  const theme = useThemeTokens();

  const arrowIcon = kind === "merchant-approved" ? "arrow-down" : "arrow-up";
  const amountText = formatGhs(item.amount);

  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={`${item.title}, ${item.meta}, ${amountText}`}
    >
      <Ionicons name={arrowIcon} size={18} color={theme.colors.primary} />

      <View
        style={[
          styles.ring,
          {
            borderColor: theme.colors.surfaceBorder,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <MerchantAvatar
          merchantName={item.title}
          logoUrl={item.logoUrl}
          size={32}
          initials={item.initials}
          idSeed={item.idSeed}
        />
      </View>

      <View style={styles.center}>
        <View style={styles.topLine}>
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.text,
                fontFamily: theme.typography.fontFamilySemiBold,
              },
            ]}
            numberOfLines={1}
          >
            {item.title}
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
            styles.meta,
            {
              color:
                metaTone === "warning"
                  ? theme.colors.warning
                  : theme.colors.textMuted,
              fontFamily: theme.typography.fontFamilyRegular,
            },
          ]}
          numberOfLines={1}
        >
          {item.meta}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  ring: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
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
  title: {
    flex: 1,
    fontSize: 14,
    letterSpacing: 0.1,
  },
  meta: {
    fontSize: 12,
  },
  amount: {
    fontSize: 14,
    letterSpacing: 0.1,
  },
});
