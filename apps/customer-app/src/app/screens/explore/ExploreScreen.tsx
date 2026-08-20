import { StyleSheet, Text, View } from "react-native";
import ScreenBackground from "../../shared/components/ScreenBackground";
import ScreenBody from "../../shared/components/ScreenBody";
import PageHeader from "../../shared/components/PageHeader";
import GlassCard from "../../shared/components/GlassCard";
import GlassTransition from "../../shared/components/GlassTransition";
import { useThemeTokens } from "../../shared/theme/ThemeContext";

export function ExploreScreen() {
  const theme = useThemeTokens();
  return (
    <ScreenBackground>
      <PageHeader />
      <ScreenBody edges={["bottom"]}>
      <GlassTransition>
        <View style={styles.container}>
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
      </ScreenBody>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingTop: 16,
  },
  card: {
    marginHorizontal: 0,
  },
  placeholder: {
    fontSize: 15,
    textAlign: "center",
  },
});
