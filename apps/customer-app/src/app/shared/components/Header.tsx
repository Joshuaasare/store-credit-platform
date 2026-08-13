import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeTokens } from "../../theme/ThemeContext";

export default function Header({
  fullName,
  initials,
}: {
  fullName: string;
  initials: string;
}) {
  const theme = useThemeTokens();
  return (
    <View style={styles.header}>
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.surfaceBorder,
          },
        ]}
        accessibilityLabel={`Avatar for ${fullName}`}
      >
        <Text
          style={{
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamilySemiBold,
            fontSize: 14,
            letterSpacing: 0.4,
          }}
        >
          {initials}
        </Text>
      </View>

      <View style={styles.headerText}>
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.fontFamilyMedium,
            fontSize: 13,
          }}
        >
          Welcome back,
        </Text>
        <Text
          style={{
            color: theme.colors.text,
            fontFamily: theme.typography.fontFamilySemiBold,
            fontSize: 18,
            letterSpacing: 0.1,
          }}
          numberOfLines={1}
        >
          {fullName}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => {
          /* No-op — notifications land in a future feature. */
        }}
        activeOpacity={0.7}
        style={[
          styles.bell,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.surfaceBorder,
            borderRadius: theme.radii.pill,
          },
        ]}
        accessibilityLabel="Notifications"
        accessibilityRole="button"
      >
        <Ionicons
          name="notifications-outline"
          size={20}
          color={theme.colors.text}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  bell: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
