import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";

/**
 * Empty state for the "Credits Redeemed" tab. Centered icon block,
 * headline, helpful subline that names the merchant so the empty state
 * stays contextual — "When you redeem at {merchantName}, the
 * transactions will appear here."
 */
export default function RedeemedEmptyState({
  merchantName,
}: {
  merchantName: string;
}) {
  const theme = useThemeTokens();
  return (
    <View style={styles.wrap}>
      <Ionicons
        name="wallet-outline"
        size={56}
        color={theme.colors.textMuted}
      />
      <Text
        style={{
          color: theme.colors.text,
          fontFamily: theme.typography.fontFamilyMedium,
          fontSize: 18,
          marginTop: 14,
          letterSpacing: -0.2,
        }}
      >
        No redemptions yet
      </Text>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontFamily: theme.typography.fontFamilyRegular,
          fontSize: 13,
          textAlign: "center",
          paddingHorizontal: 32,
          marginTop: 6,
          lineHeight: 18,
        }}
      >
        When you redeem at {merchantName}, the transactions will appear
        here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
});
