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

// Page-level failure state mirroring EmptyState: badge + title + friendly
// message (never the raw backend error) + a Try-again pill that shows its
// pending state while the refetch is in flight.
export default function ErrorState({
  title,
  message,
  onRetry,
  retrying = false,
  compact = false,
  style,
}: {
  title: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useThemeTokens();

  return (
    <View style={[styles.wrap, compact ? styles.wrapCompact : null, style]}>
      <View style={[styles.badge, compact ? styles.badgeCompact : null]}>
        <Ionicons
          name="cloud-offline-outline"
          size={compact ? 26 : 32}
          color={theme.colors.error}
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
      {onRetry != null ? (
        <Pressable
          onPress={onRetry}
          disabled={retrying}
          style={({ pressed }) => [
            styles.action,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radii.pill,
              opacity: retrying ? 0.6 : pressed ? 0.85 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Text
            style={{
              color: theme.colors.textOnPrimary,
              fontFamily: theme.typography.fontFamilySemiBold,
              fontSize: 13,
            }}
          >
            {retrying ? "Trying again…" : "Try again"}
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
    minHeight: 44,
    justifyContent: "center",
  },
});