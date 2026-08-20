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

export default function PageHeader({
  onBackPress,
  unreadNotifications = 0,
  backLabel,
}: {
  onBackPress?: () => void;
  unreadNotifications?: number;
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
              {/* Initials behind the network image so the chip never flashes blank. */}
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