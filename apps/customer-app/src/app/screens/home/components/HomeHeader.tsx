import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../../shared/store/useAuthStore";
import { useTheme, useThemeTokens } from "../../../shared/theme/ThemeContext";

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// Seamless progressive blur: a single uniform BlurView masked by a
// LinearGradient whose alpha channel fades the blur from full (top) to none
// (bottom). MaskedView reveals the BlurView per-pixel based on the mask's
// alpha, so the fade is continuous — no stacked-strip seams, no flat base cut.
// Stops mirror the eased-gradient header pattern (opaque → ~0.99 at 0.3 →
// transparent) so the dissolve is weighted toward the bottom edge.
const MASK_COLORS = ["black", "rgba(0,0,0,0.99)", "transparent"] as const;
const MASK_LOCATIONS = [0, 0.3, 1] as const;

export default function HomeHeader({
  unreadNotifications = 0,
  onHeightChange,
}: {
  unreadNotifications?: number;
  onHeightChange?: (height: number) => void;
}) {
  const theme = useThemeTokens();
  const { resolvedMode } = useTheme();
  const user = useAuthStore((s) => s.user);

  const firstName =
    user?.other_names?.split(" ")[0] || user?.surname || "there";
  const greeting = `${greetingFor(new Date())}, ${firstName}`;
  const showBadge = unreadNotifications > 0;
  const badgeLabel =
    unreadNotifications > 9 ? "9+" : String(unreadNotifications);

  return (
    <View
      style={styles.overlay}
      pointerEvents="box-none"
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0) onHeightChange?.(h);
      }}
    >
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <LinearGradient
            colors={MASK_COLORS}
            locations={MASK_LOCATIONS}
            style={StyleSheet.absoluteFill}
          />
        }
      >
        <BlurView
          intensity={100}
          tint={resolvedMode === "dark" ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.glassWash }]}
        />
      </MaskedView>

      <SafeAreaView
        edges={["top"]}
        style={styles.safeArea}
        pointerEvents="box-none"
      >
        <View
          style={[styles.bar, { paddingHorizontal: theme.spacing.lg }]}
          pointerEvents="box-none"
        >
          <View style={styles.textBlock}>
            <Text
              numberOfLines={1}
              style={{
                color: theme.colors.textMuted,
                fontFamily: theme.typography.fontFamilyRegular,
                fontSize: 14,
              }}
            >
              {greeting}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: theme.colors.text,
                fontFamily: theme.typography.fontFamilySemiBold,
                fontSize: theme.typography.displayMd,
                letterSpacing: -0.3,
                marginTop: 2,
              }}
            >
              Your wallet
            </Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              showBadge
                ? `Notifications, ${unreadNotifications} unread`
                : "Notifications"
            }
            onPress={() => {
              /* No-op — notifications land in a future feature. */
            }}
            hitSlop={12}
            style={styles.notifButton}
          >
            <Ionicons
              name="notifications-outline"
              size={24}
              color={theme.colors.text}
            />
            {showBadge ? (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: theme.colors.badge,
                    borderColor: theme.colors.backgroundSolid,
                  },
                ]}
              >
                <Text
                  style={{
                    color: theme.colors.onBadge,
                    fontFamily: theme.typography.fontFamilyBold,
                    fontSize: 10,
                    lineHeight: 12,
                  }}
                >
                  {badgeLabel}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  safeArea: {
    backgroundColor: "transparent",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  textBlock: {
    flex: 1,
  },
  notifButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
});