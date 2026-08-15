import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { formatGhs } from "../../../shared/utils/formatGhs";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";

const DURATION_IN = 180;
const DURATION_OUT = 120;

/**
 * Amount-entry sheet for the customer's redemption request.
 *
 * Two modes:
 *   - `create` — input is empty, copy says "Request redemption"
 *   - `edit`   — input is pre-filled with the current pending amount,
 *                copy says "Edit request"
 *
 * The cap (`available + currentPending`) is computed by the parent and
 * passed in as `maxAmount`. The sheet hard-clamps the input client-side
 * so the user can't type more than the cap. Submit is disabled when
 * amount <= 0 or > cap.
 *
 * On submit: parent fires `onSubmit(amount)`, then awaits the parent-
 * supplied `isSubmitting` flag. The parent decides whether to advance
 * to the preview step (showing the fan-out breakdown) or auto-dismiss.
 *
 * The sheet is controlled: the parent owns `visible` + `mode`.
 */
export default function RedemptionAmountSheet({
  visible,
  mode,
  initialAmount,
  maxAmount,
  merchantName,
  isSubmitting,
  onSubmit,
  onDismiss,
}: {
  visible: boolean;
  mode: "create" | "edit";
  initialAmount: number;
  maxAmount: number;
  merchantName: string;
  isSubmitting: boolean;
  onSubmit: (amount: number) => void;
  onDismiss: () => void;
}) {
  const theme = useThemeTokens();
  const [text, setText] = useState<string>(
    initialAmount > 0 ? formatGhs(initialAmount).replace(/[^\d.]/g, "") : "",
  );

  // Centered-modal scale + fade animation (matches MerchantRedemptionConfirmSheet).
  // The native `Modal` animation is disabled; the inner surface is wrapped in
  // `Animated.View` and animates with a scale-up + fade on visible.
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

  // Reset the input every time the sheet is (re)opened so a stale value
  // doesn't leak across open/close cycles.
  useEffect(() => {
    if (visible) {
      setText(
        initialAmount > 0
          ? formatGhs(initialAmount).replace(/[^\d.]/g, "")
          : "",
      );
    }
  }, [visible, initialAmount]);

  const numericAmount = useMemo(() => {
    const n = Number(text.replace(/,/g, ""));
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }, [text]);

  const cap = Math.max(0, Math.floor(maxAmount * 100) / 100);
  const overCap = numericAmount > cap + 0.001;
  const isDisabled = isSubmitting || numericAmount <= 0 || overCap;

  const ctaLabel = mode === "create" ? "Send request" : "Update request";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={isSubmitting ? undefined : onDismiss}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.kbWrap}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => {
            if (!isSubmitting) {
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
              <Text
                style={{
                  color: theme.colors.sheetTextMuted,
                  fontFamily: theme.typography.fontFamilyRegular,
                  fontSize: 13,
                  lineHeight: 19,
                }}
              >
                {mode === "create"
                  ? `How much credit do you want to redeem at ${merchantName}?`
                  : `Adjust your pending request at ${merchantName}.`}
              </Text>

              <View style={styles.amountInputBlock}>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    fontFamily: theme.typography.fontFamilyMedium,
                    fontSize: 11,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Amount
                </Text>
                <View
                  style={[
                    styles.amountInputRow,
                    {
                      borderColor: overCap
                        ? theme.colors.error
                        : theme.colors.surfaceBorder,
                      backgroundColor: theme.colors.surfaceInput,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.colors.textSecondary,
                      fontFamily: theme.typography.fontFamilySemiBold,
                      fontSize: 22,
                    }}
                  >
                    GH₵
                  </Text>
                  <TextInput
                    value={text}
                    onChangeText={(next) => {
                      // Allow only digits + one decimal point. Strip the
                      // rest so the input can't carry stray characters
                      // (the parent computes the numeric value).
                      const cleaned = next
                        .replace(/[^0-9.]/g, "")
                        .replace(/(\..*?)\..*/g, "$1");
                      setText(cleaned);
                    }}
                    placeholder="0.00"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="decimal-pad"
                    editable={!isSubmitting}
                    accessibilityLabel="Redemption amount"
                    style={{
                      flex: 1,
                      marginLeft: 8,
                      color: theme.colors.text,
                      fontFamily: theme.typography.fontFamilySemiBold,
                      fontSize: 22,
                      letterSpacing: -0.3,
                      padding: 0,
                    }}
                  />
                </View>
                <View style={styles.capRow}>
                  <Text
                    style={{
                      color: overCap
                        ? theme.colors.error
                        : theme.colors.textMuted,
                      fontFamily: theme.typography.fontFamilyRegular,
                      fontSize: 12,
                    }}
                  >
                    {overCap
                      ? `Max ${formatGhs(cap)}`
                      : `Available at this merchant: ${formatGhs(cap)}`}
                  </Text>
                  {numericAmount > 0 && !overCap ? (
                    <Pressable
                      onPress={() => setText(cap.toFixed(2))}
                      accessibilityRole="button"
                      accessibilityLabel="Use full available amount"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text
                        style={{
                          color: theme.colors.primary,
                          fontFamily: theme.typography.fontFamilySemiBold,
                          fontSize: 12,
                        }}
                      >
                        Use max
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>

              <Pressable
                onPress={() => onSubmit(numericAmount)}
                disabled={isDisabled}
                accessibilityRole="button"
                accessibilityLabel={ctaLabel}
                style={({ pressed }) => [
                  styles.submit,
                  {
                    backgroundColor: theme.colors.primary,
                    opacity: isDisabled ? 0.45 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={theme.colors.textOnPrimary} />
                ) : (
                  <View style={styles.submitInner}>
                    <Text
                      style={{
                        color: theme.colors.textOnPrimary,
                        fontFamily: theme.typography.fontFamilySemiBold,
                        fontSize: 15,
                        letterSpacing: 0.2,
                      }}
                    >
                      {ctaLabel}
                    </Text>
                    <Ionicons
                      name="gift-outline"
                      size={16}
                      color={theme.colors.textOnPrimary}
                      style={{ marginLeft: 6, marginTop: -1 }}
                    />
                  </View>
                )}
              </Pressable>

              <Pressable
                onPress={onDismiss}
                disabled={isSubmitting}
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
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  amountInputBlock: {
    marginTop: 18,
    marginBottom: 20,
  },
  amountInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 56,
  },
  capRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  submit: {
    height: 52,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  submitInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelTap: {
    alignSelf: "center",
    paddingVertical: 12,
  },
});
