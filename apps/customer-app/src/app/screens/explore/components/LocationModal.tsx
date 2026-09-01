import { useEffect, useState } from "react";
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
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LocationPicker, type LocationValue } from "../../../shared/components/LocationPicker";
import { useAuthStore } from "../../../shared/store/useAuthStore";
import { customerProfileService } from "../../../api/client";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";
import { toastError, toastSuccess } from "../../../shared/utils/toast.utils";

const DURATION_IN = 180;
const DURATION_OUT = 120;

const EXPLORE_BRANCHES_QUERY_KEY = ["customer", "branchesNearby"] as const;
const EXPLORE_SEARCH_QUERY_KEY = ["customer", "branchesSearch"] as const;

export default function LocationModal({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  const theme = useThemeTokens();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<LocationValue | null>(() =>
    user?.latitude != null && user?.longitude != null
      ? {
          latitude: user.latitude,
          longitude: user.longitude,
          place_id: user.place_id ?? null,
          label: user.place_label ?? "",
        }
      : null,
  );

  useEffect(() => {
    if (!visible) return;
    setDraft(
      user?.latitude != null && user?.longitude != null
        ? {
            latitude: user.latitude,
            longitude: user.longitude,
            place_id: user.place_id ?? null,
            label: user.place_label ?? "",
          }
        : null,
    );
  }, [visible, user?.latitude, user?.longitude, user?.place_id, user?.place_label]);

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

  const updateMutation = useMutation({
    mutationFn: async (params: LocationValue) => {
      return customerProfileService.updateProfile({
        latitude: params.latitude,
        longitude: params.longitude,
        place_id: params.place_id,
        place_label: params.label,
      });
    },
    onSuccess: (res) => {
      if (!res.success) {
        toastError(res.error);
        return;
      }
      setUser(res.data.user);
      queryClient.invalidateQueries({ queryKey: EXPLORE_BRANCHES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: EXPLORE_SEARCH_QUERY_KEY });
      toastSuccess("Location updated");
      onDismiss();
    },
    onError: (e) => {
      toastError(e instanceof Error ? e.message : "Failed to update location");
    },
  });

  const isPending = updateMutation.isPending;
  const canConfirm = draft != null && draft.label.length > 0 && !isPending;

  const handleConfirm = () => {
    if (!draft || !canConfirm) return;
    updateMutation.mutate(draft);
  };

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
                Set your location
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
                Search for a place or drag the map. We use this to show nearby
                offers.
              </Text>

              <View style={styles.pickerWrap}>
                <LocationPicker value={draft} onChange={setDraft} />
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  onPress={onDismiss}
                  disabled={isPending}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
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
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirm}
                  disabled={!canConfirm}
                  accessibilityRole="button"
                  accessibilityLabel="Save location"
                  style={({ pressed }) => [
                    styles.actionButton,
                    {
                      backgroundColor: theme.colors.primary,
                      opacity: !canConfirm ? 0.5 : pressed ? 0.85 : 1,
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
                      Save
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
  pickerWrap: {
    marginTop: 16,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
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