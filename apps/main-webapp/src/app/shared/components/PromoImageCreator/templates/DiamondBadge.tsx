import type { PromoTemplateProps } from "../types";
import { PromoCanvas, valueFontSize } from "./Canvas";
import FitText from "./FitText";

export default function DiamondBadge({
  value,
  headline,
  palette,
  font,
}: PromoTemplateProps) {
  return (
    <PromoCanvas palette={palette} font={font}>
      <svg
        width={1080}
        height={1080}
        viewBox="0 0 1080 1080"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <polygon points="540,60 1020,540 540,1020 60,540" fill={palette.accent} />
        <polygon
          points="540,110 970,540 540,970 110,540"
          fill="none"
          stroke={palette.accentFg}
          strokeWidth={5}
        />
        <polygon
          points="540,150 566,246 660,262 586,324 610,416 540,364 470,416 494,324 420,262 514,246"
          fill={palette.accentFg}
        />
      </svg>
      {headline && (
        <p
          style={{
            position: "absolute",
            top: 440,
            left: 170,
            right: 170,
            margin: 0,
            textAlign: "center",
            fontSize: 62,
            fontWeight: 700,
            letterSpacing: 6,
            textTransform: "uppercase",
            lineHeight: 1.1,
            color: palette.accentFg,
          }}
        >
          {headline}
        </p>
      )}
      <div
        style={{
          position: "absolute",
          top: 660,
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: palette.accentFg,
          color: palette.accent,
          padding: "26px 60px",
          clipPath: "polygon(24px 0, calc(100% - 24px) 0, 100% 50%, calc(100% - 24px) 100%, 24px 100%, 0 50%)",
          lineHeight: 1,
        }}
      >
        <FitText
          text={value}
          baseFontSize={Math.min(valueFontSize(value.length), 84)}
          maxWidth={420}
          style={{ fontWeight: 700, lineHeight: 1 }}
        />
      </div>
    </PromoCanvas>
  );
}