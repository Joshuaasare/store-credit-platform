import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useThemeTokens } from "../theme/ThemeContext";
import { useAuthStore } from "../store/useAuthStore";
import { computeInitials } from "../utils/computeInitials";
import LocationModal from "./LocationModal";
import QrCodeModal from "./QrCodeModal";
import type { AppStackParamList } from "../../navigation/RootNavigator";

export default function PageHeader({
  onBackPress,
  backLabel,
  unreadNotifications = 0,
}: {
  onBackPress?: () => void;
  backLabel?: string;
  unreadNotifications?: number;
}) {
  const theme = useThemeTokens();
  const user = useAuthStore((s) => s.user);
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [locationOpen, setLocationOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const fullName =
    [user?.surname, user?.other_names].filter(Boolean).join(" ").trim() ||
    "Customer";
  const initials = computeInitials(fullName);
  const avatarUrl = user?.avatar_url ?? null;
  const placeLabel = user?.place_label?.trim() || null;
  const showBadge = unreadNotifications > 0;
  const badgeLabel =
    unreadNotifications > 9 ? "9+" : String(unreadNotifications);

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
                key={avatarUrl}
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

        <TouchableOpacity
          onPress={() => setLocationOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={
            placeLabel
              ? `Change your location, ${placeLabel}`
              : "Set your location"
          }
          hitSlop={8}
          style={styles.locationTrigger}
        >
          <Ionicons
            name="location-outline"
            size={17}
            color={theme.colors.textOnPrimary}
          />
          <Text
            numberOfLines={1}
            style={{
              flexShrink: 1,
              color: theme.colors.textOnPrimary,
              fontFamily: theme.typography.fontFamilySemiBold,
              fontSize: 14,
            }}
          >
            {placeLabel ?? "Set location"}
          </Text>
          <Ionicons
            name="chevron-down"
            size={15}
            color={theme.colors.textOnPrimary}
            style={{ opacity: 0.75 }}
          />
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Show your QR code"
            onPress={() => setQrOpen(true)}
            hitSlop={8}
            style={styles.chip}
          >
            <Ionicons
              name="qr-code-outline"
              size={20}
              color={theme.colors.textOnPrimary}
            />
          </TouchableOpacity>

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
      </View>

      <LocationModal
        visible={locationOpen}
        onDismiss={() => setLocationOpen(false)}
      />
      <QrCodeModal
        visible={qrOpen}
        onClose={() => setQrOpen(false)}
        phone={user?.phone ?? null}
      />
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
    width: 35,
    height: 35,
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
  locationTrigger: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
    marginRight: 20,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  chip: {
    width: 35,
    height: 35,
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
