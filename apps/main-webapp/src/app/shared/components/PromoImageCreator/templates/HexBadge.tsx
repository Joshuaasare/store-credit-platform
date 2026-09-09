import type { PromoTemplateProps } from "../types";
import { PromoCanvas, valueFontSize } from "./Canvas";
import FitText from "./FitText";

function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return pts.join(" ");
}

export default function HexBadge({
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
        <polygon points={hexPoints(540, 540, 470)} fill={palette.accent} />
        <polygon
          points={hexPoints(540, 540, 430)}
          fill="none"
          stroke={palette.accentFg}
          strokeWidth={5}
        />
        {/* Diamond plate behind the value, like the hex-sale reference */}
        <polygon points="540,330 750,540 540,750 330,540" fill={palette.accentFg} />
      </svg>
      {headline && (
        <p
          style={{
            position: "absolute",
            top: 190,
            left: 0,
            right: 0,
            margin: 0,
            textAlign: "center",
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: palette.accentFg,
          }}
        >
          {headline}
        </p>
      )}
      <FitText
        text={value}
        baseFontSize={Math.min(valueFontSize(value.length), 110)}
        maxWidth={380}
        style={{
          position: "absolute",
          top: 540,
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontWeight: 700,
          color: palette.accent,
          lineHeight: 1,
        }}
      />
    </PromoCanvas>
  );
}