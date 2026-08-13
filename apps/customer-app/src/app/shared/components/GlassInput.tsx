import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { useThemeTokens } from "../../theme/ThemeContext";

/**
 * Glass-styled text input. Lower tint than the card so it sits recessed within
 * the surface. Themed via `useTheme()` so light/dark re-skin without code
 * changes.
 */
export default function GlassInput(props: TextInputProps) {
  const theme = useThemeTokens();
  return (
    <TextInput
      placeholderTextColor={theme.colors.textPlaceholder}
      style={[
        styles.input,
        {
          backgroundColor: theme.colors.surfaceInput,
          borderColor: theme.colors.surfaceBorder,
          borderRadius: theme.radii.md,
          color: theme.colors.text,
          fontFamily: theme.typography.fontFamilyRegular,
        },
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 56,
    fontSize: 16,
  },
});
