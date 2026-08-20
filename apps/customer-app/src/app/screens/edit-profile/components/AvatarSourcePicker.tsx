import { Pressable, StyleSheet, Text, View } from "react-native";
import Popover, { Rect } from "react-native-popover-view";
import { Ionicons } from "@expo/vector-icons";
import { useThemeTokens } from "../../../shared/theme/ThemeContext";

export default function AvatarSourcePicker({
  isVisible,
  anchor,
  onTakePhoto,
  onChooseFromLibrary,
  onDismiss,
}: {
  isVisible: boolean;
  anchor: { x: number; y: number; width: number; height: number };
  onTakePhoto: () => void;
  onChooseFromLibrary: () => void;
  onDismiss: () => void;
}) {
  const theme = useThemeTokens();
  // `from` expects a Rect class instance (has equals/clone a plain object lacks).
  const anchorRect = new Rect(anchor.x, anchor.y, anchor.width, anchor.height);

  return (
    <Popover
      isVisible={isVisible}
      from={anchorRect}
      onRequestClose={onDismiss}
      popoverStyle={{
        backgroundColor: theme.colors.sheet,
        borderRadius: theme.radii.md,
      }}
      backgroundStyle={{ backgroundColor: "rgba(0,0,0,0.25)" }}
    >
      <View style={styles.card}>
        <PickerRow
          icon="camera-outline"
          label="Take photo"
          onPress={onTakePhoto}
          theme={theme}
        />
        <View
          style={[styles.divider, { backgroundColor: theme.colors.surfaceBorder }]}
        />
        <PickerRow
          icon="images-outline"
          label="Choose from library"
          onPress={onChooseFromLibrary}
          theme={theme}
        />
      </View>
    </Popover>
  );
}

function PickerRow({
  icon,
  label,
  onPress,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  theme: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.colors.surfaceBorder : "transparent" },
      ]}
    >
      <Ionicons name={icon} size={18} color={theme.colors.primary} style={{ marginRight: 10 }} />
      <Text
        style={{
          color: theme.colors.text,
          fontFamily: theme.typography.fontFamilyMedium,
          fontSize: 14,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 4,
    minWidth: 200,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    marginHorizontal: 10,
  },
});