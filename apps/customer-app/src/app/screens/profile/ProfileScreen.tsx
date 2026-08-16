import { StyleSheet, Text, View } from "react-native";
import ScreenBackground from "../../shared/components/ScreenBackground";
import ScreenBody from "../../shared/components/ScreenBody";
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
      <ScreenBody>
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
            Profile
          </Text>
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
  },
  title: {
    fontSize: 28,
    textAlign: "center",
    marginBottom: 24,
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
