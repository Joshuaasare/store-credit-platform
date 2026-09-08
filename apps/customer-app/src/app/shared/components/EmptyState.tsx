import { Ionicons } from "@expo/vector-icons";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useThemeTokens } from "../theme/ThemeContext";

// Shared page-level empty state: soft berry badge + title + optional message
// and call-to-action. `compact` fits tabbed/secondary containers.
export default function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  compact = false,
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useThemeTokens();

  return (
    <View style={[styles.wrap, compact ? styles.wrapCompact : null, style]}>
      <View style={[styles.badge, compact ? styles.badgeCompact : null]}>
        <Ionicons
          name={icon}
          size={compact ? 26 : 32}
          color={theme.colors.primary}
        />
      </View>
      <Text
        style={{
          color: theme.colors.text,
          fontFamily: theme.typography.fontFamilySemiBold,
          fontSize: compact ? 14 : 16,
          textAlign: "center",
          marginTop: compact ? 10 : 14,
        }}
      >
        {title}
      </Text>
      {message != null ? (
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.fontFamilyRegular,
            fontSize: 13,
            lineHeight: 19,
            textAlign: "center",
            marginTop: 6,
            paddingHorizontal: 12,
          }}
        >
          {message}
        </Text>
      ) : null}
      {actionLabel != null && onAction != null ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.action,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radii.pill,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text
            style={{
              color: theme.colors.textOnPrimary,
              fontFamily: theme.typography.fontFamilySemiBold,
              fontSize: 13,
            }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  wrapCompact: {
    paddingVertical: 28,
  },
  badge: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeCompact: {
    width: 52,
    height: 52,
  },
  action: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
});
