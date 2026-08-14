import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";

/**
 * Cancel-confirm bottom sheet for a pending redemption.
 *
 * Uses the React Native `Modal` (transparent backdrop, slide-up) — the
 * same pattern as `ActivitiesModal` and the country-picker sheet in
 * `PhoneInput.tsx`. The repo doesn't depend on `@gorhom/bottom-sheet`,
 * so a plain Modal with a custom rounded sheet surface is the idiomatic
 * choice here.
 *
 * The sheet is controlled by the parent (the parent owns the
 * `pendingCancelId` state and the `useMutation` for the DELETE call).
 * `onConfirm` fires only after the user taps the destructive CTA.
 */
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={isPending ? undefined : onDismiss}
      statusBarTranslucent
    >
      <Pressable
        style={styles.overlay}
        onPress={isPending ? undefined : onDismiss}
      >
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.sheet,
              borderTopLeftRadius: theme.radii.xl,
              borderTopRightRadius: theme.radii.xl,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={[
              styles.grabber,
              { backgroundColor: theme.colors.surfacePill },
            ]}
          />

          <View style={styles.body}>
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
                fontSize: 14,
                lineHeight: 20,
                marginTop: 8,
              }}
            >
              This amount will return to your available credits.
            </Text>
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={onDismiss}
              disabled={isPending}
              accessibilityRole="button"
              accessibilityLabel="Keep request"
              style={({ pressed }) => [
                styles.actionButton,
                styles.cancelButton,
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
                styles.confirmButton,
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    paddingTop: 8,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  body: {
    marginBottom: 24,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {},
});
