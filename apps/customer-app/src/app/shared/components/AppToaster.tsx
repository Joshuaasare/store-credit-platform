import { Toaster } from "sonner-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeTokens } from "../theme/ThemeContext";

export function AppToaster() {
  const theme = useThemeTokens();
  const { colors, radii, spacing, typography, dark } = theme;

  return (
    <Toaster
      theme={dark ? "dark" : "light"}
      position="top-center"
      duration={4000}
      offset={spacing.base}
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