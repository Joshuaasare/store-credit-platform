import { StyleSheet, Text, View } from "react-native";
import GlassCard from "../../../shared/components/GlassCard";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";

export default function EmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const theme = useThemeTokens();
  return (
    <View style={styles.stateContainer}>
      <GlassCard style={styles.stateCard}>
        <Text
          style={[
            styles.stateTitle,
            {
              color: theme.colors.text,
              fontFamily: theme.typography.fontFamilySemiBold,
            },
          ]}
        >
          {title}
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
          {subtitle}
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
