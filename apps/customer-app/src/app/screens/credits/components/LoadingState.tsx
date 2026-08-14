import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";

/**
 * Loading state for the Credits screen — a centered spinner + caption. Used
 * while the `useQuery` against `/customers/me/credits` is in flight.
 */
export default function LoadingState() {
  const theme = useThemeTokens();
  return (
    <View style={styles.stateContainer}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text
        style={[
          styles.stateText,
          {
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.fontFamilyRegular,
          },
        ]}
      >
        Loading your credits…
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "stretch",
  },
  stateText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
