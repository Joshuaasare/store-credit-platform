import type { PromoTemplateProps } from "../types";
import { PromoCanvas } from "./Canvas";

export default function TypographicPoster({
  value,
  headline,
  subline,
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
      <span
        style={{
          fontSize: valueSize,
          fontWeight: 700,
          lineHeight: 1.05,
          whiteSpace: "nowrap",
          marginTop: 30,
        }}
      >
        {value}
      </span>
      <div
        style={{
          width: 560,
          height: 22,
          backgroundColor: palette.accent,
          marginTop: 40,
        }}
      />
      <p
        style={{
          margin: 0,
          marginTop: 46,
          fontSize: 50,
          fontWeight: 700,
          letterSpacing: 12,
          textTransform: "uppercase",
          color: palette.accent,
        }}
      >
        {subline}
      </p>
    </PromoCanvas>
  );
}
