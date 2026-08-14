import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";

/**
 * Empty state for the "Pending" tab. Centered icon block, headline,
 * helpful subline that names the merchant so the empty state stays
 * contextual — "Redemption requests you make at {merchantName} will
 * appear here while they wait for approval."
 *
 * Visually mirrors `RedeemedEmptyState` (same icon family + same
 * headline scale + same subline copy rhythm) so the two empty states
 * feel like siblings and the user doesn't see two unrelated art
 * directions when hopping between tabs.
 */
export default function PendingEmptyState({
  merchantName,
}: {
  merchantName: string;
}) {
  const theme = useThemeTokens();
  return (
    <View style={styles.wrap}>
      <Ionicons
        name="time-outline"
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
        No pending redemptions
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
        Redemption requests you make at {merchantName} will appear here
        while they wait for approval.
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
