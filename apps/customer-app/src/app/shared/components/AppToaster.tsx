import { Toaster } from "sonner-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeTokens } from "../theme/ThemeContext";

export function AppToaster() {
  const theme = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { colors, radii, spacing, typography, dark } = theme;

  return (
    <Toaster
      theme={dark ? "dark" : "light"}
      position="top-center"
      duration={4000}
      // sonner-native ignores the safe-area inset when `offset` is set — it
      // would otherwise land in the device notch.
      offset={insets.top + spacing.base}
      gap={spacing.sm}
      closeButton={true}
      swipeToDismissDirection="up"
      richColors={false}
      icons={{
        success: <Ionicons name="checkmark-circle" size={20} color={colors.success} />,
        error: <Ionicons name="alert-circle" size={20} color={colors.error} />,
        warning: <Ionicons name="warning" size={20} color={colors.warning} />,
        info: <Ionicons name="information-circle" size={20} color={colors.textMuted} />,
      }}
      toastOptions={{
        style: {
          backgroundColor: colors.surface,
          borderRadius: radii.md,
          borderWidth: 1,
          borderColor: colors.surfaceBorder,
          paddingHorizontal: spacing.base,
          paddingVertical: spacing.md,
          gap: spacing.sm,
          shadowColor: colors.scrim,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.18,
          shadowRadius: 8,
          elevation: 3,
        },
        titleStyle: {
          fontFamily: typography.fontFamilySemiBold,
          fontSize: 15,
          color: colors.text,
        },
        descriptionStyle: {
          fontFamily: typography.fontFamilyRegular,
          fontSize: typography.caption,
          color: colors.textSecondary,
        },
        success: { borderColor: colors.success },
        error: { borderColor: colors.error },
        warning: { borderColor: colors.warning },
      }}
    />
  );
}