import { StyleSheet, Text, View } from "react-native";
import GlassCard from "../../../shared/components/GlassCard";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";

/**
 * Error state for the Credits screen — a glass card with the failure
 * headline and a propagated error message.
 */
export default function ErrorState({ message }: { message: string }) {
  const theme = useThemeTokens();
  return (
    <View style={styles.stateContainer}>
      <GlassCard style={styles.stateCard}>
        <Text
          style={[
            styles.stateTitle,
            {
              color: theme.colors.error,
              fontFamily: theme.typography.fontFamilySemiBold,
            },
          ]}
        >
          Couldn’t load credits
        </Text>
        <Text
          style={[
            styles.stateText,
            {
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.fontFamilyRegular,
            },
          ]}
        >
          {message}
        </Text>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "stretch",
  },
  stateCard: {
    marginHorizontal: 0,
  },
  stateTitle: {
    fontSize: 17,
    marginBottom: 6,
  },
  stateText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
