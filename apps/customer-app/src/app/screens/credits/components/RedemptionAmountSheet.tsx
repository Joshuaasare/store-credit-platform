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
import type { BaseBranch } from "@store-credit-platform/api-services";
import { formatGhs } from "../../../shared/utils/formatGhs";
import { formatBranchLabel } from "../../../shared/utils/ui.utils";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";

const DURATION_IN = 180;
const DURATION_OUT = 120;

/**
 * Amount + branch entry sheet for the customer's redemption request.
 *
 * Two modes:
 *   - `create` — input is empty, copy says "Request redemption"
 *   - `edit`   — input is pre-filled with the current pending amount +
 *                pre-selected branch, copy says "Edit request"
 *
 * The cap (`available + currentPending`) is computed by the parent and
 * passed in as `maxAmount`. The sheet hard-clamps the input client-side
 * so the user can't type more than the cap.
 *
 * Branch picker:
 *   - `branches` comes from the parent (call to
 *     `customerRedemptionsService.getMyBranches(merchantId)`).
 *   - When there's exactly one branch, the picker is collapsed to a
 *     static label and the branch is auto-selected — there's nothing
 *     for the customer to choose.
 *   - When there are 2+ branches, the parent passes `initialBranchId`
 *     (from the existing pending row in edit mode, `null` in create
 *     mode). The branch block renders a CLOSED picker trigger — the
 *     selected branch label is shown, or a "Choose a branch…"
 *     placeholder if nothing is picked yet. Tapping the trigger opens
 *     a nested picker sheet that scrolls the full list. The submit
 *     button stays disabled until the user explicitly taps a branch
 *     in the picker — no default selection on multi-branch merchants.
 *
 * On submit: parent fires `onSubmit(amount, branchId)`, then awaits the
 * parent-supplied `isSubmitting` flag. The parent decides whether to
 * advance or auto-dismiss.
 *
 * The sheet is controlled: the parent owns `visible` + `mode`.
 */
export default function RedemptionAmountSheet({
  visible,
  mode,
  initialAmount,
  maxAmount,
  branches,
  branchesLoading,
  initialBranchId,
  merchantName,
  isSubmitting,
  onSubmit,
  onDismiss,
}: {
  visible: boolean;
  mode: "create" | "edit";
  initialAmount: number;
  maxAmount: number;
  branches: BaseBranch[];
  branchesLoading: boolean;
  initialBranchId: number | null;
  merchantName: string;
  isSubmitting: boolean;
  onSubmit: (amount: number, branchId: number) => void;
  onDismiss: () => void;
}) {
  const theme = useThemeTokens();
  const [text, setText] = useState<string>(
    initialAmount > 0 ? formatGhs(initialAmount).replace(/[^\d.]/g, "") : "",
  );

  // Only collapse the picker when we KNOW the merchant has one branch
  // — i.e. when the branches query has resolved with <=1 row. While the
  // branches query is still in flight OR the merchant genuinely has 0
  // branches, we render the loading placeholder (handled in the JSX).
  const onlyOneBranch = !branchesLoading && branches.length <= 1;
  const initialBranch = useMemo<BaseBranch | null>(() => {
    if (branches.length === 0) return null;
    if (initialBranchId != null) {
      const match = branches.find((b) => b.id === initialBranchId);
      if (match) return match;
    }
    // Single-branch merchants auto-pin the only branch. Multi-branch
    // merchants intentionally start with NO selection — the customer
    // must explicitly pick a branch in the picker.
    if (onlyOneBranch) return branches[0] ?? null;
    return null;
  }, [branches, initialBranchId, onlyOneBranch]);

  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(
    initialBranch?.id ?? null,
  );

  // Picker visibility — only meaningful for multi-branch merchants.
  const [pickerOpen, setPickerOpen] = useState(false);

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

  // Reset both the amount input and the selected branch every time the
  // sheet is (re)opened so stale values don't leak across open/close
  // cycles. In edit mode the selected branch comes from the existing
  // pending row; in create mode it starts unselected on multi-branch
  // merchants, or auto-selected when there's only one branch total.
  useEffect(() => {
    if (visible) {
      setText(
        initialAmount > 0
          ? formatGhs(initialAmount).replace(/[^\d.]/g, "")
          : "",
      );
      setSelectedBranchId(initialBranch?.id ?? null);
      setPickerOpen(false);
    }
  }, [visible, initialAmount, initialBranch]);

  const numericAmount = useMemo(() => {
    const n = Number(text.replace(/,/g, ""));
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }, [text]);

  const cap = Math.max(0, Math.floor(maxAmount * 100) / 100);
  const overCap = numericAmount > cap + 0.001;
  const noBranch = selectedBranchId == null;
  const isDisabled = isSubmitting || numericAmount <= 0 || overCap || noBranch;

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
              {/* <Text
                style={{
                  color: theme.colors.sheetTextMuted,
                  fontFamily: theme.typography.fontFamilyRegular,
                  fontSize: 13,
                  lineHeight: 19,
                }}
              >
                {mode === "edit" &&
                  `Adjust your pending request at ${merchantName}.`}
              </Text> */}

              <View style={styles.amountInputBlock}>
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontFamily: theme.typography.fontFamilyMedium,
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  Enter the amount you want to redeem
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

              <View style={styles.branchBlock}>
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontFamily: theme.typography.fontFamilyMedium,
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  Select the branch to redeem at
                </Text>

                {branchesLoading && branches.length === 0 ? (
                  <View
                    style={[
                      styles.singleBranchRow,
                      {
                        borderColor: theme.colors.surfaceBorder,
                        backgroundColor: theme.colors.surfaceInput,
                      },
                    ]}
                  >
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.textSecondary}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={{
                        flex: 1,
                        color: theme.colors.textSecondary,
                        fontFamily: theme.typography.fontFamilyRegular,
                        fontSize: 13,
                      }}
                      numberOfLines={1}
                    >
                      Loading branches…
                    </Text>
                  </View>
                ) : onlyOneBranch ? (
                  // Single-branch merchants: the picker would be a
                  // single-item list, so we collapse it to a static
                  // label. The selected branch is auto-pinned at the
                  // top of this component's state.
                  <View
                    style={[
                      styles.singleBranchRow,
                      {
                        borderColor: theme.colors.surfaceBorder,
                        backgroundColor: theme.colors.surfaceInput,
                      },
                    ]}
                  >
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color={theme.colors.textSecondary}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={{
                        flex: 1,
                        color: theme.colors.text,
                        fontFamily: theme.typography.fontFamilyMedium,
                        fontSize: 14,
                      }}
                      numberOfLines={1}
                    >
                      {initialBranch
                        ? formatBranchLabel(
                            initialBranch.name,
                            initialBranch.city,
                          )
                        : merchantName}
                    </Text>
                  </View>
                ) : (
                  <BranchPickerTrigger
                    branches={branches}
                    selectedBranchId={selectedBranchId}
                    placeholder={`Choose a branch of ${merchantName}…`}
                    disabled={isSubmitting}
                    onPress={() => setPickerOpen(true)}
                    theme={theme}
                  />
                )}
              </View>

              <Pressable
                onPress={() => {
                  if (selectedBranchId == null) return;
                  onSubmit(numericAmount, selectedBranchId);
                }}
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

      <BranchPickerSheet
        visible={pickerOpen}
        branches={branches}
        selectedBranchId={selectedBranchId}
        onPick={(id) => {
          setSelectedBranchId(id);
          setPickerOpen(false);
        }}
        onDismiss={() => setPickerOpen(false)}
        theme={theme}
      />
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// BranchPickerTrigger — closed-state tappable row. Shows the currently
// selected branch label or a "Choose a branch…" placeholder. Tapping opens
// the nested picker sheet so a long list of branches never overflows the
// parent amount-entry sheet.
// ────────────────────────────────────────────────────────────────────────────
function BranchPickerTrigger({
  branches,
  selectedBranchId,
  placeholder,
  disabled,
  onPress,
  theme,
}: {
  branches: BaseBranch[];
  selectedBranchId: number | null;
  placeholder: string;
  disabled: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useThemeTokens>;
}) {
  const selected = branches.find((b) => b.id === selectedBranchId) ?? null;
  return (
    <Pressable
      onPress={() => !disabled && onPress()}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={
        selected ? `Branch ${selected.name}` : "Choose a branch"
      }
      accessibilityState={{ expanded: false }}
      style={({ pressed }) => [
        styles.pickerTrigger,
        {
          borderColor: theme.colors.surfaceBorder,
          backgroundColor: pressed
            ? theme.colors.surfaceBorder
            : theme.colors.surfaceInput,
        },
      ]}
    >
      <Ionicons
        name="location-outline"
        size={16}
        color={theme.colors.textSecondary}
        style={{ marginRight: 8 }}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        {selected ? (
          <>
            <Text
              style={{
                color: theme.colors.text,
                fontFamily: theme.typography.fontFamilyMedium,
                fontSize: 14,
              }}
              numberOfLines={1}
            >
              {selected.name ?? "Branch"}
            </Text>
            {selected.city ? (
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.fontFamilyRegular,
                  fontSize: 12,
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {selected.city}
              </Text>
            ) : null}
          </>
        ) : (
          <Text
            style={{
              color: theme.colors.textMuted,
              fontFamily: theme.typography.fontFamilyRegular,
              fontSize: 14,
            }}
            numberOfLines={1}
          >
            {placeholder}
          </Text>
        )}
      </View>
      <Ionicons
        name="chevron-down"
        size={18}
        color={theme.colors.textSecondary}
      />
    </Pressable>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// BranchPickerSheet — nested centered modal that lists every branch in a
// scroll view. Picked branch fires `onPick` and auto-dismisses. The parent
// amount-entry sheet stays mounted underneath; the nested sheet dims it via
// its own backdrop. Matches the customer-app centered-modal contract:
// animationType=fade + justifyContent=center + maxWidth=420 + radii.md.
// ────────────────────────────────────────────────────────────────────────────
function BranchPickerSheet({
  visible,
  branches,
  selectedBranchId,
  onPick,
  onDismiss,
  theme,
}: {
  visible: boolean;
  branches: BaseBranch[];
  selectedBranchId: number | null;
  onPick: (id: number) => void;
  onDismiss: () => void;
  theme: ReturnType<typeof useThemeTokens>;
}) {
  const opacity = useSharedValue(visible ? 1 : 0);
  const scale = useSharedValue(visible ? 1 : 0.95);

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
      scale.value = withTiming(0.95, { duration: DURATION_OUT });
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
              paddingTop: 20,
            },
            sheetAnimatedStyle,
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Text
              style={{
                color: theme.colors.text,
                fontFamily: theme.typography.fontFamilySemiBold,
                fontSize: 16,
                marginBottom: 4,
              }}
            >
              Choose a branch
            </Text>
            <Text
              style={{
                color: theme.colors.sheetTextMuted,
                fontFamily: theme.typography.fontFamilyRegular,
                fontSize: 13,
                marginBottom: 14,
              }}
            >
              Pick the branch where you want to redeem.
            </Text>
            <View
              style={{
                borderRadius: 8,
                borderWidth: 1,
                borderColor: theme.colors.surfaceBorder,
                backgroundColor: theme.colors.surfaceInput,
                maxHeight: 320,
                overflow: "hidden",
              }}
            >
              <BranchScrollList
                branches={branches}
                selectedBranchId={selectedBranchId}
                onPick={onPick}
                theme={theme}
              />
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function BranchScrollList({
  branches,
  selectedBranchId,
  onPick,
  theme,
}: {
  branches: BaseBranch[];
  selectedBranchId: number | null;
  onPick: (id: number) => void;
  theme: ReturnType<typeof useThemeTokens>;
}) {
  // FlatList would be the "right" primitive here, but a plain ScrollView
  // with mapped rows is simpler for this short list and avoids the
  // native FlatList mount cost for the picker. If branch counts ever
  // blow past a few hundred this should switch to FlatList.
  return (
    <Animated.ScrollView
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      {branches.map((branch) => {
        const selected = selectedBranchId === branch.id;
        return (
          <Pressable
            key={branch.id}
            onPress={() => onPick(branch.id)}
            accessibilityRole="button"
            accessibilityLabel={`Select branch ${branch.name ?? ""}`}
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.pickerRow,
              {
                backgroundColor: selected
                  ? theme.colors.surfacePill
                  : pressed
                    ? theme.colors.surfaceBorder
                    : "transparent",
              },
            ]}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={{
                  color: theme.colors.text,
                  fontFamily: theme.typography.fontFamilyMedium,
                  fontSize: 14,
                }}
                numberOfLines={1}
              >
                {branch.name ?? "Branch"}
              </Text>
              {branch.city ? (
                <Text
                  style={{
                    color: theme.colors.textSecondary,
                    fontFamily: theme.typography.fontFamilyRegular,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {branch.city}
                </Text>
              ) : null}
            </View>
            {selected ? (
              <Ionicons
                name="checkmark"
                size={18}
                color={theme.colors.primary}
              />
            ) : null}
          </Pressable>
        );
      })}
    </Animated.ScrollView>
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
  branchBlock: {
    marginBottom: 20,
  },
  singleBranchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 56,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
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
