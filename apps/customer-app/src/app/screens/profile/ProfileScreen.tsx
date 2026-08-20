import { StyleSheet, Text, View } from "react-native";
import ScreenBackground from "../../shared/components/ScreenBackground";
import ScreenBody from "../../shared/components/ScreenBody";
import PageHeader from "../../shared/components/PageHeader";
import GlassCard from "../../shared/components/GlassCard";
import PrimaryButton from "../../shared/components/PrimaryButton";
import GlassTransition from "../../shared/components/GlassTransition";
import { useAuthStore } from "../../shared/store/useAuthStore";
import { useThemeTokens } from "../../shared/theme/ThemeContext";

export function ProfileScreen() {
  const theme = useThemeTokens();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const name =
    [user?.surname, user?.other_names].filter(Boolean).join(" ").trim() ||
    "Customer";

  return (
    <ScreenBackground>
      <PageHeader />
      <ScreenBody edges={["bottom"]}>
      <GlassTransition>
        <View style={styles.container}>
          <GlassCard style={styles.card}>
            <Text
              style={[
                styles.name,
                {
                  color: theme.colors.text,
                  fontFamily: theme.typography.fontFamilySemiBold,
                },
              ]}
            >
              {name}
            </Text>
            <Text
              style={[
                styles.phone,
                {
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.fontFamilyRegular,
                },
              ]}
            >
              {user?.phone ?? "—"}
            </Text>
            <PrimaryButton
              title="Log out"
              onPress={logout}
              fullWidth
              style={styles.button}
            />
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
  name: {
    fontSize: 20,
    marginBottom: 4,
  },
  phone: {
    fontSize: 15,
    marginBottom: 24,
  },
  button: {
    marginTop: 8,
  },
});
