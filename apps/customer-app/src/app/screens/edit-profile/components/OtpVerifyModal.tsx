import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import GlassInput from "../../../shared/components/GlassInput";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";

const DURATION_IN = 180;
const DURATION_OUT = 120;
const RESEND_COOLDOWN_SECONDS = 30;

export default function OtpVerifyModal({
  visible,
  displayPhone,
  error,
  isPending,
  onVerify,
  onResend,
  onDismiss,
}: {
  visible: boolean;
  displayPhone: string;
  error: string | null;
  isPending: boolean;
  onVerify: (otp: string) => void;
  onResend: () => void;
  onDismiss: () => void;
}) {
  const theme = useThemeTokens();
  const [otp, setOtp] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  const opacity = useSharedValue(visible ? 1 : 0);
  const scale = useSharedValue(visible ? 1 : 0.92);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, {
        duration: DURATION_IN,
        easing: Easing.out(Easing.cubic),
      });
      scale.value = withSpring(1, { damping: 45, stiffness: 500 });
    } else {
      opacity.value = withTiming(0, {
        duration: DURATION_OUT,
        easing: Easing.in(Easing.cubic),
      });
      scale.value = withTiming(0.92, { duration: DURATION_OUT });
    }
  }, [visible, opacity, scale]);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    if (visible) {
      setOtp("");
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    }
  }, [visible]);

  // Countdown ticker; stops at 0 so the Resend link appears.
  useEffect(() => {
    if (!visible) return;
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearTimeout(id);
  }, [visible, secondsLeft]);

  const canResend = secondsLeft <= 0 && !isPending;
  const cooldownLabel = `Resend in 0:${String(secondsLeft).padStart(2, "0")}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={isPending ? undefined : onDismiss}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.kbWrap}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => {
            if (!isPending) {
              Keyboard.dismiss();
              onDismiss();
            }
          }}
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.sheet,
                borderRadius: theme.radii.md,
              },
              sheetAnimatedStyle,
            ]}
          >
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                Keyboard.dismiss();
              }}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
              <Text
                style={{
                  color: theme.colors.text,
                  fontFamily: theme.typography.fontFamilySemiBold,
                  fontSize: 18,
                  marginBottom: 4,
                  textAlign: "center",
                }}
              >
                Enter your code
              </Text>
              <Text
                style={{
                  color: theme.colors.sheetTextMuted,
                  fontFamily: theme.typography.fontFamilyRegular,
                  fontSize: 13,
                  lineHeight: 19,
                  marginBottom: 18,
                  textAlign: "center",
                }}
              >
                We sent a verification code to {displayPhone}
              </Text>

              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.fontFamilyMedium,
                  fontSize: 13,
                  marginBottom: 8,
                }}
              >
                Verification code
              </Text>
              <GlassInput
                value={otp}
                onChangeText={setOtp}
                placeholder="123456"
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={6}
                editable={!isPending}
              />

              {error ? (
                <Text
                  style={{
                    color: theme.colors.error,
                    fontFamily: theme.typography.fontFamilyRegular,
                    fontSize: 13,
                    marginTop: 12,
                  }}
                >
                  {error}
                </Text>
              ) : null}

              <Pressable
                onPress={() => {
                  if (!isPending) onVerify(otp.trim());
                }}
                disabled={isPending || otp.trim().length === 0}
                accessibilityRole="button"
                accessibilityLabel="Verify code"
                style={({ pressed }) => [
                  styles.submit,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity:
                      isPending || otp.trim().length === 0
                        ? 0.45
                        : pressed
                          ? 0.85
                          : 1,
                  },
                ]}
              >
                {isPending ? (
                  <ActivityIndicator color={theme.colors.textOnPrimary} />
                ) : (
                  <Text
                    style={{
                      color: theme.colors.textOnPrimary,
                      fontFamily: theme.typography.fontFamilySemiBold,
                      fontSize: 15,
                      letterSpacing: 0.2,
                    }}
                  >
                    Verify
                  </Text>
                )}
              </Pressable>

              <View style={styles.resendRow}>
                {canResend ? (
                  <Pressable
                    onPress={() => {
                      // Re-arm on tap (not on `visible` flip) so the link can't be spammed.
                      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
                      onResend();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Resend code"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text
                      style={{
                        color: theme.colors.primary,
                        fontFamily: theme.typography.fontFamilySemiBold,
                        fontSize: 13,
                      }}
                    >
                      Resend code
                    </Text>
                  </Pressable>
                ) : (
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      fontFamily: theme.typography.fontFamilyRegular,
                      fontSize: 13,
                    }}
                  >
                    {cooldownLabel}
                  </Text>
                )}
              </View>

              <Pressable
                onPress={() => {
                  if (!isPending) onDismiss();
                }}
                disabled={isPending}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.cancelTap}
              >
                <Text
                  style={{
                    color: theme.colors.sheetTextMuted,
                    fontFamily: theme.typography.fontFamilyMedium,
                    fontSize: 13,
                  }}
                >
                  Cancel
                </Text>
              </Pressable>
              </ScrollView>
            </Pressable>
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kbWrap: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "90%",
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  submit: {
    height: 52,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 8,
  },
  resendRow: {
    alignItems: "center",
    paddingVertical: 8,
  },
  cancelTap: {
    alignSelf: "center",
    paddingVertical: 12,
  },
});