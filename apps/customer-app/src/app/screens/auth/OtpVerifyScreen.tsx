import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ScreenBackground } from "../../components/ScreenBackground";
import { GlassCard } from "../../components/GlassCard";
import { GlassInput } from "../../components/GlassInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { customerAuthService } from "../../api/client";
import { useAuthStore } from "../../store/useAuthStore";
import { parsePhoneNumber } from "../../utils/countries";
import type { AuthStackParamList } from "../../navigation/RootNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "OtpVerify">;

function formatPhoneForDisplay(phone: string): string {
  if (!phone) return "";
  const { country, localNumber } = parsePhoneNumber(phone);
  if (country) {
    return `+${country.dialCode} ${localNumber}`.trim();
  }
  return phone.startsWith("+") ? phone : `+${phone}`;
}

export function OtpVerifyScreen({ route, navigation }: Props) {
  const { phone } = route.params;
  const displayPhone = useMemo(() => formatPhoneForDisplay(phone), [phone]);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setSession = useAuthStore((s) => s.setSession);
  const setPending = useAuthStore((s) => s.setPending);

  const verify = async () => {
    const trimmed = otp.trim();
    if (!trimmed) {
      setError("Enter the code");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await customerAuthService.verifyOtp(phone, trimmed);
      if (!res.success) {
        setError(res.error);
        return;
      }
      if (res.data.status === "logged_in") {
        await setSession({
          access_token: res.data.access_token,
          refresh_token: res.data.refresh_token,
          user: res.data.user,
        });
        // Root flips to <AppStack/> automatically via the auth store.
      } else {
        setPending(res.data.pending_token);
        navigation.navigate("NewUser");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <Text style={styles.title}>Enter your code</Text>
        <Text style={styles.subtitle}>
          We sent a verification code to {displayPhone}
        </Text>
        <GlassCard style={styles.card}>
          <Text style={styles.label}>Verification code</Text>
          <GlassInput
            value={otp}
            onChangeText={setOtp}
            placeholder="123456"
            keyboardType="number-pad"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={6}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton
            title="Verify"
            onPress={verify}
            loading={loading}
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
    color: "#ffffff",
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
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
});