import { View, StyleSheet, type DimensionValue } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeTokens } from "../theme/ThemeContext";

type GlyphName = keyof typeof Ionicons.glyphMap;

// Decorative discount-themed wallpaper (pricetag / ticket / gift) rendered
// behind screen content. Fixed — doesn't scroll with content.
const GLYPHS: {
  icon: GlyphName;
  top: DimensionValue;
  left: DimensionValue;
  size: number;
  rotate: string;
  opacity: number;
}[] = [
  { icon: "pricetag", top: "6%", left: "6%", size: 96, rotate: "-18deg", opacity: 0.07 },
  { icon: "pricetags", top: "9%", left: "74%", size: 88, rotate: "12deg", opacity: 0.06 },
  { icon: "ticket", top: "22%", left: "84%", size: 76, rotate: "-12deg", opacity: 0.055 },
  { icon: "gift-outline", top: "33%", left: "4%", size: 60, rotate: "14deg", opacity: 0.055 },
  { icon: "pricetag", top: "45%", left: "86%", size: 110, rotate: "-20deg", opacity: 0.06 },
  { icon: "ticket", top: "56%", left: "6%", size: 120, rotate: "18deg", opacity: 0.055 },
  { icon: "pricetags", top: "67%", left: "78%", size: 68, rotate: "-8deg", opacity: 0.055 },
  { icon: "pricetag", top: "77%", left: "18%", size: 90, rotate: "24deg", opacity: 0.055 },
  { icon: "gift-outline", top: "87%", left: "62%", size: 100, rotate: "-15deg", opacity: 0.06 },
];

export default function DiscountPattern() {
  const theme = useThemeTokens();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {GLYPHS.map((glyph, index) => (
        <Ionicons
          key={index}
          name={glyph.icon}
          size={glyph.size}
          color={theme.colors.primary}
          style={{
            position: "absolute",
            top: glyph.top,
            left: glyph.left,
            opacity: glyph.opacity,
            transform: [{ rotate: glyph.rotate }],
          }}
        />
      ))}
    </View>
  );
}