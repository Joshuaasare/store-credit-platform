import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MerchantAvatar from "./MerchantAvatar";
import { useThemeTokens } from "../theme/ThemeContext";
import { formatGhs } from "../utils/formatGhs";
import { formatRelativeTimestamp } from "../utils/date.utils";

export type MerchantActivityRowKind =
  | "credit-available"
  | "merchant-available"
  | "merchant-approved";

export interface MerchantActivityRowItem {
  key: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  initials: string;
  logoUrl: string | null;
  title: string;
  meta: string;
  amount: number;
  // Stable ID driving the placeholder avatar gradient — pass branch_id or
  // merchant_id so the same entity renders the same colour across tabs.
  idSeed?: number | string | null;
}

export default function MerchantActivityRow({
  kind,
  item,
  metaTone = "muted",
}: {
  kind: MerchantActivityRowKind;
  item: MerchantActivityRowItem;
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
