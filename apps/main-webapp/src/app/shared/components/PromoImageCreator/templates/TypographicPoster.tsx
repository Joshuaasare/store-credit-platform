import type { PromoTemplateProps } from "../types";
import { PromoCanvas } from "./Canvas";
import FitText from "./FitText";

export default function TypographicPoster({
  value,
  headline,
  palette,
  font,
}: PromoTemplateProps) {
  const valueSize = value.length > 8 ? 235 : value.length > 4 ? 320 : 390;
  return (
    <PromoCanvas palette={palette} font={font}>
      <p
        style={{
          margin: 0,
          fontSize: 58,
          fontWeight: 700,
          letterSpacing: 16,
          textTransform: "uppercase",
        }}
      >
        {headline}
      </p>
      <FitText
        text={value}
        baseFontSize={valueSize}
        maxWidth={1000}
        style={{
          fontWeight: 700,
          lineHeight: 1.05,
          marginTop: 30,
        }}
      />
      <div
        style={{
          width: 560,
          height: 22,
          backgroundColor: palette.accent,
          marginTop: 40,
        }}
      />
    </PromoCanvas>
  );
}
