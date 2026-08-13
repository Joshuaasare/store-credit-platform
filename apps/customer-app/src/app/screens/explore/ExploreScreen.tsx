import { StyleSheet, Text, View } from "react-native";
import ScreenBackground from "../../shared/components/ScreenBackground";
import GlassCard from "../../shared/components/GlassCard";
import GlassTransition from "../../shared/components/GlassTransition";
import { useThemeTokens } from "../../theme/ThemeContext";

export function ExploreScreen() {
  const theme = useThemeTokens();
  return (
    <ScreenBackground>
      <GlassTransition>
        <View style={styles.container}>
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.text,
                fontFamily: theme.typography.fontFamilyBold,
              },
            ]}
          >
            Explore
          </Text>
          <GlassCard style={styles.card}>
            <Text
              style={[
                styles.placeholder,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.fontFamilyRegular,
                },
              ]}
            >
              A map of nearby merchants accepting StoreCredit will appear here.
            </Text>
          </GlassCard>
        </View>
      </GlassTransition>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    textAlign: "center",
    marginBottom: 24,
  },
  card: {
    marginHorizontal: 0,
  },
  placeholder: {
    fontSize: 15,
    textAlign: "center",
  },
});