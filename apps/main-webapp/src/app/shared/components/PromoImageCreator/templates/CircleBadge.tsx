import type { PromoTemplateProps } from "../types";
import { PromoCanvas, runningValueFontSize } from "./Canvas";

export default function CircleBadge({
  value,
  headline,
  palette,
  font,
}: PromoTemplateProps) {
  return (
    <PromoCanvas palette={palette} font={font}>
      <div
        style={{
          position: "absolute",
          top: 120,
          left: "50%",
          transform: "translateX(-50%)",
          width: 620,
          height: 620,
          borderRadius: "50%",
          backgroundColor: palette.accent,
          color: palette.accentFg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 60,
        }}
      >
        <span
          style={{
            fontSize: runningValueFontSize(value.length),
            fontWeight: 700,
            lineHeight: 1,
            textAlign: "center",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {value}
        </span>
      </div>
      {headline && (
        <p
          style={{
            position: "absolute",
            top: 790,
            left: 130,
            right: 130,
            margin: 0,
            textAlign: "center",
            fontSize: 54,
            fontWeight: 600,
            lineHeight: 1.25,
          }}
        >
          {headline}
        </p>
      )}
    </PromoCanvas>
  );
}
