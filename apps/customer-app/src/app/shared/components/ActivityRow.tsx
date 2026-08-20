import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { CustomerActivity } from "@store-credit-platform/api-services";
import MerchantAvatar from "./MerchantAvatar";
import { useThemeTokens } from "../theme/ThemeContext";
import { formatGhs } from "../utils/formatGhs";
import { formatRelativeTimestamp } from "../utils/date.utils";

export default function ActivityRow({
  activity,
}: {
  activity: CustomerActivity;
}) {
  const theme = useThemeTokens();

  const isIssued = activity.kind === "credit_issued";
  const tintColor = isIssued ? theme.colors.success : theme.colors.error;
  const iconName = isIssued ? "arrow-up" : "arrow-down";
  const amountPrefix = isIssued ? "+" : "−";
  const amountText = formatGhs(activity.amount);

  const merchantName = activity.merchant.name;
  const logoUrl = activity.merchant.logo_url ?? null;
  const branchName = activity.branch.name;
  const locationLine = branchName ? branchName : activity.branch.city;

  const timestamp = formatTimestamp(activity.created_at);

  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={`${isIssued ? "Credit issued" : "Credit redeemed"} ${amountText} at ${merchantName}, ${timestamp}`}
    >
      <Ionicons name={iconName} size={18} color={tintColor} />

      <View
        style={[
          styles.avatarRing,
          {
            borderColor: theme.colors.surfaceBorder,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <MerchantAvatar
          merchantName={merchantName}
          logoUrl={logoUrl}
          size={36}
        />
      </View>

      <View style={styles.center}>
        <View style={styles.topLine}>
          <Text
            style={[
              styles.merchant,
              {
                color: theme.colors.text,
                fontFamily: theme.typography.fontFamilySemiBold,
              },
            ]}
            numberOfLines={1}
          >
            {merchantName}
          </Text>
          <Text
            style={[
              styles.amount,
              {
                color: tintColor,
                fontFamily: theme.typography.fontFamilySemiBold,
              },
            ]}
            numberOfLines={1}
          >
            {amountPrefix} {amountText}
          </Text>
        </View>
        <Text
          style={[
            styles.timestamp,
            {
              color: theme.colors.textMuted,
              fontFamily: theme.typography.fontFamilyRegular,
            },
          ]}
          numberOfLines={1}
        >
          {locationLine ? `${locationLine} · ${timestamp}` : timestamp}
        </Text>
      </View>
    </View>
  );
}

function formatTimestamp(iso: string): string {
  return formatRelativeTimestamp(iso);
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
  },
  avatarRing: {
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
  merchant: {
    flex: 1,
    fontSize: 14,
    letterSpacing: 0.1,
  },
  timestamp: {
    fontSize: 12,
  },
  amount: {
    fontSize: 14,
    letterSpacing: 0.1,
  },
});
