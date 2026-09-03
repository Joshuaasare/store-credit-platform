import type { PromoTemplateProps } from "../types";
import { PromoCanvas, valueFontSize } from "./Canvas";

export default function AngledBanner({
  value,
  headline,
  subline,
  palette,
  font,
}: PromoTemplateProps) {
  return (
    <PromoCanvas palette={palette} font={font}>
      <p
        style={{
          position: "absolute",
          top: 130,
          left: 0,
          right: 0,
          margin: 0,
          textAlign: "center",
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: 14,
          textTransform: "uppercase",
        }}
      >
        {headline}
      </p>
      <div
        style={{
          position: "absolute",
          top: 700,
          left: -140,
          right: -140,
          height: 54,
          backgroundColor: palette.fg,
          transform: "rotate(-8deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 380,
          left: -140,
          right: -140,
          height: 320,
          backgroundColor: palette.accent,
          transform: "rotate(-8deg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: valueFontSize(value.length),
            fontWeight: 700,
            color: palette.accentFg,
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </span>
      </div>
      <p
        style={{
          position: "absolute",
          bottom: 130,
          left: 0,
          right: 0,
          margin: 0,
          textAlign: "center",
          fontSize: 48,
          fontWeight: 700,
          letterSpacing: 10,
          textTransform: "uppercase",
        }}
      >
        {subline}
      </p>
    </PromoCanvas>
  );
}
