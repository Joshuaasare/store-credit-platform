import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useThemeTokens } from "../theme/ThemeContext";
import { useAuthStore } from "../store/useAuthStore";
import { computeInitials } from "../utils/computeInitials";
import { formatGhanaPhone } from "../utils/formatGhanaPhone";
import type { AppStackParamList } from "../../navigation/RootNavigator";

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
 *   - In identity mode (no `backLabel`), renders the signed-in
 *     customer's identity (avatar + full name + phone number) plus a
 *     notifications bell on the right. The brand wordmark is dropped —
 *     the user identity now carries the spot, so every tab lands on the
 *     same personal frame. The avatar is tappable and navigates to the
 *     EditProfile screen.
 *
 * Back variant:
 *   - When `backLabel` is set, the left slot renders `[← backLabel]`
 *     (chevron-back icon + text label) instead of the identity block.
 *     The right slot (bell) is HIDDEN in back mode — empty right side.
 *     The avatar is NOT rendered. EditProfile uses this variant.
 *
 * What this is NOT for:
 *   - This is NOT a navigation header. React Navigation's native stack
 *     is configured to `headerShown: false`; this bar is plain RN, so
 *     deep screens can opt in without depending on the navigator's
 *     back-button behavior.
 *
 * Layout (identity mode, filled bar, left-to-right):
 *
 *   [ AV ]   Full Name                 [ 🔔• ]
 *           0XX XXX XXXX
 *
 *   - Avatar sits on the left at the bar's left padding edge. It uses
 *     a translucent white fill + thin white border so it reads as a
 *     small chip on the brand-colored bar without competing with the
 *     text. Initials render in white, semiBold. When the customer has
 *     an `avatar_url`, the photo renders via `expo-image` (disk + memory
 *     cache) over the initials placeholder so the row never shows a
 *     blank square while the image is in flight. The avatar is tappable
 *     and navigates to the EditProfile screen.
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
 *   - All text colors come from theme tokens so light/dark mode flip
 *     together — the light berry stays in `primary`; the dark pink
 *     does the same. The avatar / bell chips, phone label, and
 *     initials are white in both themes (they sit on the primary
 *     fill, so they're always white-on-color).
 */
export default function PageHeader({
  onBackPress,
  unreadNotifications = 0,
  backLabel,
}: {
  onBackPress?: () => void;
  unreadNotifications?: number;
  /** When set, the header renders `[← backLabel]` on the left and hides
   *  the identity block + bell. Used by the EditProfile screen so its
   *  header reads as a back-buttoned detail page, not a tab. */
  backLabel?: string;
}) {
  const theme = useThemeTokens();
  const user = useAuthStore((s) => s.user);
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const fullName =
    [user?.surname, user?.other_names].filter(Boolean).join(" ").trim() ||
    "Customer";
  const initials = computeInitials(fullName);
  const phone = user?.phone != null ? formatGhanaPhone(user.phone) : null;
  const avatarUrl = user?.avatar_url ?? null;
  const badgeLabel =
    unreadNotifications > 9 ? "9+" : String(unreadNotifications);
  const showBadge = unreadNotifications > 0;

  // ─── Back variant ────────────────────────────────────────────────────
  // When `backLabel` is set, the left slot renders a chevron-back + the
  // label text instead of the identity block. The right slot is empty
  // (no bell, no avatar). The avatar is not rendered in back mode, so
  // there's no risk of navigating to EditProfile from EditProfile's own
  // header.
  if (backLabel != null) {
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
          <TouchableOpacity
            onPress={onBackPress}
            accessibilityRole="button"
            accessibilityLabel={`Go back to ${backLabel}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.backButton}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={theme.colors.textOnPrimary}
            />
            <Text
              numberOfLines={1}
              style={{
                color: theme.colors.textOnPrimary,
                fontFamily: theme.typography.fontFamilySemiBold,
                fontSize: 16,
                marginLeft: 2,
              }}
            >
              {backLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Identity mode ───────────────────────────────────────────────────
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
        <TouchableOpacity
          onPress={() => navigation.navigate("EditProfile")}
          accessibilityRole="button"
          accessibilityLabel="Edit your profile"
          hitSlop={8}
          style={styles.avatar}
        >
          {avatarUrl != null ? (
            <>
              {/* Layered placeholder — initials behind the network image
                  so the chip renders instantly from cache on second
                  visit and never flashes blank while the image loads. */}
              <Text
                style={[
                  StyleSheet.absoluteFill,
                  styles.avatarInitials,
                  {
                    color: theme.colors.textOnPrimary,
                    fontFamily: theme.typography.fontFamilySemiBold,
                    fontSize: 14,
                    letterSpacing: 0.4,
                  },
                ]}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                {initials}
              </Text>
              <Image
                source={{ uri: avatarUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={150}
                accessibilityIgnoresInvertColors
              />
            </>
          ) : (
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
          )}
        </TouchableOpacity>

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
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  avatarInitials: {
    textAlign: "center",
    textAlignVertical: "center",
    lineHeight: 40,
  },
  identity: {
    flex: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 2,
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
