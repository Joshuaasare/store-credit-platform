import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useThemeTokens } from "../theme/ThemeContext";

export default function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useThemeTokens();
  const isDisabled = loading || disabled;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[
        styles.button,
        {
          backgroundColor: theme.colors.primary,
          borderRadius: fullWidth ? theme.radii.md : theme.radii.pill,
        },
        fullWidth ? styles.fullWidth : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.textOnPrimary} />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: theme.colors.textOnPrimary,
              fontFamily: theme.typography.fontFamilySemiBold,
            },
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  fullWidth: {
    width: "100%",
    height: 48,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 15,
  },
});
