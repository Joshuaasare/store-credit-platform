import {
  StyleSheet,
  TextInput,
  type TextInputProps,
} from "react-native";

/**
 * Glass-styled text input. Lower tint than the card so it sits recessed
 * within the surface; teal-equivalent focus handling comes from the white
 * border lightening on focus (RN has no focus-ring; we keep it flat).
 */
export function GlassInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="rgba(255,255,255,0.5)"
      style={styles.input}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
});