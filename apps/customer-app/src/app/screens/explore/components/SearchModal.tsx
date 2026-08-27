import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import type { BranchWithOffers } from "@store-credit-platform/api-services";
import { customerBranchService } from "../../../api/client";
import MerchantAvatar from "../../../shared/components/MerchantAvatar";
import { useAuthStore } from "../../../shared/store/useAuthStore";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";

const DURATION_IN = 180;
const DURATION_OUT = 120;

const SEARCH_QUERY_KEY = ["customer", "branchSearch"] as const;

function formatDistance(km: number | null): string {
  if (km == null) return "—";
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function SearchModal({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  const theme = useThemeTokens();
  const user = useAuthStore((s) => s.user);
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 250);

  const hasLocation = user?.latitude != null && user?.longitude != null;

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

  useEffect(() => {
    if (!visible) setQuery("");
  }, [visible]);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const searchQuery = useQuery({
    queryKey: [...SEARCH_QUERY_KEY, user?.latitude, user?.longitude, debounced] as const,
    queryFn: () =>
      customerBranchService.searchBranchesByLocation(
        user!.latitude!,
        user!.longitude!,
        debounced,
      ),
    enabled: hasLocation && debounced.trim().length > 0,
  });

  const results: BranchWithOffers[] = searchQuery.data?.success
    ? searchQuery.data.data
    : [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
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
            <Text
              style={{
                color: theme.colors.sheetText,
                fontFamily: theme.typography.fontFamilyBold,
                fontSize: theme.typography.title,
                letterSpacing: -0.2,
              }}
            >
              Search branches
            </Text>

            <View
              style={[
                styles.inputWrap,
                {
                  backgroundColor: theme.colors.surfaceInput,
                  borderColor: theme.colors.surfaceBorder,
                  borderRadius: theme.radii.pill,
                },
              ]}
            >
              <Ionicons
                name="search"
                size={16}
                color={theme.colors.textMuted}
              />
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder="Search branches by name or place"
                placeholderTextColor={theme.colors.textPlaceholder}
                style={{
                  flex: 1,
                  marginLeft: 8,
                  color: theme.colors.text,
                  fontFamily: theme.typography.fontFamilyRegular,
                  fontSize: 15,
                  paddingVertical: 0,
                }}
                returnKeyType="search"
                accessibilityLabel="Search branches"
              />
              {query.length > 0 ? (
                <Pressable
                  onPress={() => setQuery("")}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                >
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={theme.colors.textMuted}
                  />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.resultsArea}>
              {debounced.trim().length === 0 ? (
                <Text
                  style={{
                    color: theme.colors.sheetTextMuted,
                    fontFamily: theme.typography.fontFamilyRegular,
                    fontSize: 13,
                    lineHeight: 19,
                    marginTop: 8,
                  }}
                >
                  Try searching for a branch by name or place.
                </Text>
              ) : searchQuery.isLoading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator color={theme.colors.primary} />
                </View>
              ) : results.length === 0 ? (
                <Text
                  style={{
                    color: theme.colors.sheetTextMuted,
                    fontFamily: theme.typography.fontFamilyRegular,
                    fontSize: 13,
                    lineHeight: 19,
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  No branches found
                </Text>
              ) : (
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  style={styles.resultsList}
                >
                  {results.map((branch, index) => {
                    const merchantName = branch.merchant?.name ?? "Merchant";
                    const branchLabel =
                      branch.name ?? branch.city ?? "Branch";
                    const placeLabel = branch.place_label ?? branch.city ?? "";
                    const offerCount =
                      branch.running_configs.length +
                      branch.fixed_configs.length;
                    return (
                      <Pressable
                        key={branch.id}
                        onPress={onDismiss}
                        style={({ pressed }) => [
                          styles.resultRow,
                          {
                            borderTopWidth:
                              index === 0 ? 0 : StyleSheet.hairlineWidth,
                            borderTopColor: theme.colors.surfaceBorder,
                            opacity: pressed ? 0.6 : 1,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${merchantName} — ${branchLabel}`}
                      >
                        <MerchantAvatar
                          merchantName={merchantName}
                          logoUrl={branch.merchant?.logo_url ?? null}
                          size={40}
                          idSeed={branch.id}
                        />
                        <View style={styles.resultText}>
                          <Text
                            numberOfLines={1}
                            style={{
                              color: theme.colors.sheetText,
                              fontFamily: theme.typography.fontFamilySemiBold,
                              fontSize: 14,
                            }}
                          >
                            {merchantName}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={{
                              color: theme.colors.sheetTextMuted,
                              fontFamily: theme.typography.fontFamilyRegular,
                              fontSize: 12,
                              marginTop: 2,
                            }}
                          >
                            {branchLabel}
                            {placeLabel && placeLabel !== branchLabel
                              ? ` • ${placeLabel}`
                              : ""}
                            {"  •  "}
                            {formatDistance(branch.distance_km)}
                            {"  •  "}
                            {offerCount} offer{offerCount === 1 ? "" : "s"}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={theme.colors.textMuted}
                        />
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </View>
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
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    marginTop: 16,
  },
  resultsArea: {
    marginTop: 16,
  },
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  resultsList: {
    marginTop: 8,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  resultText: {
    flex: 1,
  },
});