import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import ScreenBackground from "../../shared/components/ScreenBackground";
import GlassCard from "../../shared/components/GlassCard";
import GlassInput from "../../shared/components/GlassInput";
import PrimaryButton from "../../shared/components/PrimaryButton";
import { customerAuthService } from "../../api/client";
import { useAuthStore } from "../../store/useAuthStore";
import { useThemeTokens } from "../../theme/ThemeContext";

export function NewUserScreen() {
  const theme = useThemeTokens();
  const [surname, setSurname] = useState("");
  const [otherNames, setOtherNames] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingToken = useAuthStore((s) => s.pendingToken);
  const setSession = useAuthStore((s) => s.setSession);

  const create = async () => {
    const surnameTrimmed = surname.trim();
    const otherTrimmed = otherNames.trim();
    if (!surnameTrimmed) {
      setError("Enter your surname");
      return;
    }
    if (!pendingToken) {
      setError("Your session has expired. Please restart sign-up.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await customerAuthService.register(
        pendingToken,
        surnameTrimmed,
        otherTrimmed,
      );
      if (!res.success) {
        setError(res.error);
        return;
      }
      await setSession({
        access_token: res.data.access_token,
        refresh_token: res.data.refresh_token,
        user: res.data.user,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground>
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
          You're new here
        </Text>
        <Text
          style={[
            styles.subtitle,
            {
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.fontFamilyRegular,
            },
          ]}
        >
          Let's set up your account. We just need your name.
        </Text>
        <GlassCard style={styles.card}>
          <Text
            style={[
              styles.label,
              {
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.fontFamilyMedium,
              },
            ]}
          >
            Surname
          </Text>
          <GlassInput
            value={surname}
            onChangeText={setSurname}
            placeholder="Surname"
            autoCapitalize="words"
            autoCorrect={false}
          />
          <Text
            style={[
              styles.label,
              {
                marginTop: 16,
                color: theme.colors.textSecondary,
                fontFamily: theme.typography.fontFamilyMedium,
              },
            ]}
          >
            Other names
          </Text>
          <GlassInput
            value={otherNames}
            onChangeText={setOtherNames}
            placeholder="Other names"
            autoCapitalize="words"
            autoCorrect={false}
          />
          {error ? (
            <Text
              style={[
                styles.error,
                {
                  color: theme.colors.error,
                  fontFamily: theme.typography.fontFamilyRegular,
                },
              ]}
            >
              {error}
            </Text>
          ) : null}
          <PrimaryButton
            title="Create account"
            onPress={create}
            loading={loading}
            fullWidth
            style={styles.button}
          />
        </GlassCard>
      </View>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 32,
  },
  card: {
    marginHorizontal: 0,
  },
  label: {
    fontSize: 13,
    marginBottom: 8,
  },
  button: {
    marginTop: 24,
  },
  error: {
    fontSize: 13,
    marginTop: 12,
  },
});