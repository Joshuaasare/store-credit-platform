import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeTokens } from "../theme/ThemeContext";
import { useAuthStore } from "../store/useAuthStore";
import { computeInitials } from "../utils/computeInitials";
import { formatGhanaPhone } from "../utils/formatGhanaPhone";

/**
 * Page-level header bar shared across the main app screens.
 *
 * What this is for:
 *   - A single, consistent top bar for the tab screens (Home, Credits,
 *     Explore, Profile) and any deep route that wants a header.
 *   - The header background is the brand `primary` color — same color as
 *     the active tab pill, so the bottom tab bar and the top header
 *     read as a single brand frame around the page.
 *   - The top safe-area inset is filled with the same primary color so
 *     the status-bar / notch area reads as part of the header on both
 *     iOS and Android — no white sliver above the bar.
 *   - Always renders the signed-in customer's identity (avatar +
 *     full name + phone number) plus a notifications bell on the
 *     right. The brand wordmark is dropped — the user identity now
 *     carries the spot, so every tab lands on the same personal frame.
 *
 * What this is NOT for:
 *   - This is NOT a navigation header. React Navigation's native stack
 *     is configured to `headerShown: false`; this bar is plain RN, so
 *     deep screens can opt in without depending on the navigator's
 *     back-button behavior.
 *
 * Layout (filled bar, left-to-right):
 *
 *   [ AV ]   Full Name                 [ 🔔• ]
 *           0XX XXX XXXX
 *
 *   - Avatar sits on the left at the bar's left padding edge. It uses
 *     a translucent white fill + thin white border so it reads as a
 *     small chip on the brand-colored bar without competing with the
 *     text. Initials render in white, semiBold.
 *   - The name + phone stack sits center-left. Name is white, semiBold;
 *     phone is white at lower opacity (subdued but still readable),
 *     formatted as Ghanaian national layout `0XX XXX XXXX` so it reads
 *     the way customers actually say it instead of as `+233…`. Long
 *     names ellipsize; phone is a single line that truncates from
 *     the tail if needed.
 *   - The bell button sits on the right at the bar's right padding
 *     edge — same chip treatment as the avatar (translucent fill +
 *     thin white border) so the two visual chips bookend the bar.
 *   - When `unreadCount > 0`, a small red badge anchors to the bell's
 *     top-right. It uses the brand's notification token
 *     (`theme.colors.badge` / `theme.colors.onBadge`) so the badge
 *     color stays consistent with the rest of the app's "alert"
 *     surfaces. The badge sits *outside* the chip's hit area
 *     (absolutely positioned with `top: -2 right: -2`) so the chip
 *     stays the same size regardless of whether there are unread
 *     items — adding/removing the badge doesn't shift the bar.
 *     Counts ≤ 9 render as the digit; larger counts render `9+`.
 *   - The chip surfaces use `rgba(255,255,255,0.15)` fills — picked
 *     so they lift off the brand fill without becoming the brightest
 *     element on the screen. The thin white border reads as a hairline
 *     outline, not a hard edge.
 *   - When a back button is requested (`canGoBack`), it replaces the
 *     bell slot. Deep routes that need both can pass `rightAction`
 *     explicitly to override the bell.
 *   - All text colors come from theme tokens so light/dark mode flip
 *     together — the light berry stays in `primary`; the dark pink
 *     does the same. The avatar / bell chips, phone label, and
 *     initials are white in both themes (they sit on the primary
 *     fill, so they're always white-on-color).
 */
export default function PageHeader({
  canGoBack = false,
  onBackPress,
  rightAction,
  unreadNotifications = 0,
}: {
  canGoBack?: boolean;
  onBackPress?: () => void;
  rightAction?: React.ReactNode;
  unreadNotifications?: number;
}) {
  const theme = useThemeTokens();
  const user = useAuthStore((s) => s.user);

  const fullName =
    [user?.surname, user?.other_names].filter(Boolean).join(" ").trim() ||
    "Customer";
  const initials = computeInitials(fullName);
  const phone = user?.phone != null ? formatGhanaPhone(user.phone) : null;
  const badgeLabel =
    unreadNotifications > 9 ? "9+" : String(unreadNotifications);
  const showBadge = unreadNotifications > 0;

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ backgroundColor: theme.colors.primary }}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: theme.colors.primary,
            paddingHorizontal: theme.spacing.base,
          },
        ]}
      >
        <View style={styles.avatar}>
          <Text
            style={{
              color: theme.colors.textOnPrimary,
              fontFamily: theme.typography.fontFamilySemiBold,
              fontSize: 14,
              letterSpacing: 0.4,
            }}
          >
            {initials}
          </Text>
        </View>

        <View style={styles.identity}>
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.textOnPrimary,
              fontFamily: theme.typography.fontFamilySemiBold,
              fontSize: 16,
              letterSpacing: 0.1,
            }}
          >
            {fullName}
          </Text>
          {phone != null ? (
            <Text
              numberOfLines={1}
              style={{
                color: theme.colors.textOnPrimary,
                fontFamily: theme.typography.fontFamilyRegular,
                fontSize: 12,
                opacity: 0.72,
                marginTop: 1,
              }}
            >
              {phone}
            </Text>
          ) : null}
        </View>

        {canGoBack ? (
          <TouchableOpacity
            onPress={onBackPress}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
            style={styles.chip}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={theme.colors.textOnPrimary}
            />
          </TouchableOpacity>
        ) : rightAction ? (
          <View style={styles.chip}>{rightAction}</View>
        ) : (
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
            hitSlop={8}
            style={styles.chip}
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={theme.colors.textOnPrimary}
            />
            {showBadge ? (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: theme.colors.badge,
                    borderColor: theme.colors.primary,
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
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  identity: {
    flex: 1,
  },
  chip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
});