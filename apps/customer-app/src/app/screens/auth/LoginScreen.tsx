import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScreenBackground } from "../../components/ScreenBackground";
import { GlassCard } from "../../components/GlassCard";
import { PhoneInput } from "../../components/PhoneInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { customerAuthService } from "../../api/client";
import { useAuthStore } from "../../store/useAuthStore";
import type { AuthStackParamList } from "../../navigation/RootNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

// DEV — delete before production
const DEV_CUSTOMER_PHONE = "+233244444444";
const DEV_CUSTOMER_OTP = "123456";
// END DEV

export function LoginScreen({ navigation }: Props) {
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
        <Text style={styles.title}>StoreCredit</Text>
        <Text style={styles.subtitle}>Sign in with your phone number</Text>
        <GlassCard style={styles.card}>
          <Text style={styles.label}>Phone number</Text>
          <PhoneInput value={phone} onChange={setPhone} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton
            title="Send code"
            onPress={send}
            loading={loading}
            style={styles.button}
          />
          {/* DEV — delete before production */}
          <Pressable
            onPress={devLogin}
            disabled={loading}
            style={styles.devButton}
          >
            <Text style={styles.devText}>Dev Login</Text>
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
    color: "#ffffff",
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 32,
  },
  card: {
    marginHorizontal: 0,
  },
  label: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginBottom: 8,
  },
  button: {
    marginTop: 20,
  },
  error: {
    color: "#fecaca",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 12,
  },
  devButton: {
    marginTop: 16,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.4)",
  },
  devText: {
    color: "#fcd34d",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
