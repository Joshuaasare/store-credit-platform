import { useEffect } from "react";
import {
  ActivityIndicator,
  Modal,
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
import { useThemeTokens } from "../../../shared/theme/ThemeContext";

const DURATION_IN = 180;
const DURATION_OUT = 120;

export default function MerchantRedemptionConfirmSheet({
  visible,
  onDismiss,
  onConfirm,
  isPending,
}: {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const theme = useThemeTokens();

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={isPending ? undefined : onDismiss}
      statusBarTranslucent
    >
      <Pressable
        style={styles.overlay}
        onPress={isPending ? undefined : onDismiss}
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
          <Pressable onPress={(e) => e.stopPropagation()}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <Text
              style={{
                color: theme.colors.sheetText,
                fontFamily: theme.typography.fontFamilyBold,
                fontSize: theme.typography.title,
                letterSpacing: -0.2,
              }}
            >
              Cancel redemption request?
            </Text>
            <Text
              style={{
                color: theme.colors.sheetTextMuted,
                fontFamily: theme.typography.fontFamilyRegular,
                fontSize: 13,
                lineHeight: 19,
                marginTop: 8,
              }}
            >
              This amount will return to your available credits.
            </Text>

            <View style={styles.actionsRow}>
              <Pressable
                onPress={onDismiss}
                disabled={isPending}
                accessibilityRole="button"
                accessibilityLabel="Keep request"
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.keepButton,
                  {
                    borderColor: theme.colors.surfaceBorder,
                    opacity: isPending ? 0.5 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: theme.colors.sheetText,
                    fontFamily: theme.typography.fontFamilySemiBold,
                    fontSize: 15,
                  }}
                >
                  Keep request
                </Text>
              </Pressable>
              <Pressable
                onPress={onConfirm}
                disabled={isPending}
                accessibilityRole="button"
                accessibilityLabel="Cancel request"
                style={({ pressed }) => [
                  styles.actionButton,
                  {
                    backgroundColor: theme.colors.error,
                    opacity: isPending ? 0.7 : pressed ? 0.85 : 1,
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
                    }}
                  >
                    Cancel request
                  </Text>
                )}
              </Pressable>
            </View>
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  keepButton: {
    borderWidth: 1,
  },
});
