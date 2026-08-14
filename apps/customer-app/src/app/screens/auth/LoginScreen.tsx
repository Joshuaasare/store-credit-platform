import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import ScreenBackground from "../../shared/components/ScreenBackground";
import GlassCard from "../../shared/components/GlassCard";
import PhoneInput from "../../shared/components/PhoneInput";
import PrimaryButton from "../../shared/components/PrimaryButton";
import { customerAuthService } from "../../api/client";
import { useAuthStore } from "../../shared/store/useAuthStore";
import { useThemeTokens } from "../../shared/theme/ThemeContext";
import type { AuthStackParamList } from "../../navigation/RootNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

// DEV — delete before production
const DEV_CUSTOMER_PHONE = "+233244444444";
const DEV_CUSTOMER_OTP = "123456";
// END DEV

export function LoginScreen({ navigation }: Props) {
  const theme = useThemeTokens();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!phone) {
      setError("Enter your phone number");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await customerAuthService.sendOtp(phone);
      if (res.success) {
        navigation.navigate("OtpVerify", { phone });
      } else {
        setError(res.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  // DEV — delete before production. One-tap login: skips OTP send, calls
  // verify directly. Backend's dev bypass auto-provisions users + customers
  // rows so this always lands on HomeScreen without DB seeding.
  const devLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await customerAuthService.verifyOtp(
        DEV_CUSTOMER_PHONE,
        DEV_CUSTOMER_OTP,
      );
      if (!res.success) {
        setError(res.error);
      } else if (res.data.status === "logged_in") {
        await useAuthStore.getState().setSession({
          access_token: res.data.access_token,
          refresh_token: res.data.refresh_token,
          user: res.data.user,
        });
      } else {
        setError(
          "Dev login returned needs_profile — check backend DEV_MOCK_CUSTOMER env",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dev login failed");
    } finally {
      setLoading(false);
    }
  };
  // END DEV

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
          StoreCredit
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
          Sign in with your phone number
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
            Phone number
          </Text>
          <PhoneInput value={phone} onChange={setPhone} />
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
            title="Send code"
            onPress={send}
            loading={loading}
            fullWidth
            style={styles.button}
          />
          {/* DEV — delete before production */}
          <Pressable
            onPress={devLogin}
            disabled={loading}
            style={[
              styles.devButton,
              {
                backgroundColor: theme.colors.warningSurface,
                borderColor: theme.colors.warningBorder,
                borderRadius: theme.radii.sm,
              },
            ]}
          >
            <Text
              style={[
                styles.devText,
                {
                  color: theme.colors.warning,
                  fontFamily: theme.typography.fontFamilySemiBold,
                },
              ]}
            >
              Dev Login
            </Text>
          </Pressable>
          {/* END DEV */}
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
    fontSize: 32,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
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
    marginTop: 20,
  },
  error: {
    fontSize: 13,
    marginTop: 12,
  },
  devButton: {
    marginTop: 16,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  devText: {
    fontSize: 13,
  },
});
