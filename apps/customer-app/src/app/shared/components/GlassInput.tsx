import { StyleSheet, TextInput, type TextInputProps } from "react-native";
import { useThemeTokens } from "../theme/ThemeContext";

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
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
  },
});
