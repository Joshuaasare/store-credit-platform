import { useId } from "react";
import type { PromoTemplateProps } from "../types";
import { PromoCanvas, valueFontSize } from "./Canvas";
import FitText from "./FitText";

// Wavy "scallop" circle path built from polar samples so the seal edge looks
// like a bottle-cap badge.
function scallopPath(cx: number, cy: number, r: number, waves: number, amp: number): string {
  const pts: string[] = [];
  const steps = waves * 8;
  for (let i = 0; i <= steps; i++) {
    const theta = (2 * Math.PI * i) / steps;
    const radius = r + amp * Math.cos(waves * theta);
    const x = cx + radius * Math.cos(theta);
    const y = cy + radius * Math.sin(theta);
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `${pts.join(" ")} Z`;
}

export default function SealBadge({
  value,
  headline,
  palette,
  font,
}: PromoTemplateProps) {
  const topArcId = useId();
  const cx = 540;
  const ringR = 330;
  return (
    <PromoCanvas palette={palette} font={font}>
      <svg
        width={1080}
        height={1080}
        viewBox="0 0 1080 1080"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <path d={scallopPath(cx, cx, 440, 24, 16)} fill={palette.accent} />
        <circle cx={cx} cy={cx} r={378} fill="none" stroke={palette.accentFg} strokeWidth={4} strokeDasharray="2 14" strokeLinecap="round" />
        <defs>
          <path id={topArcId} d={`M ${cx - ringR},${cx} A ${ringR},${ringR} 0 0 1 ${cx + ringR},${cx}`} />
        </defs>
        {headline && (
          <text
            fill={palette.accentFg}
            fontSize={58}
            fontWeight={700}
            letterSpacing={10}
            style={{ fontFamily: font.fontFamily, textTransform: "uppercase" }}
          >
            <textPath href={`#${topArcId}`} startOffset="50%" textAnchor="middle">
              {headline}
            </textPath>
          </text>
        )}
        <g>
          <rect x={170} y={460} width={740} height={160} fill={palette.accentFg} />
          <polygon points="170,460 120,540 170,620" fill={palette.accentFg} />
          <polygon points="910,460 960,540 910,620" fill={palette.accentFg} />
        </g>
      </svg>
      <FitText
        text={value}
        baseFontSize={Math.min(valueFontSize(value.length), 96)}
        maxWidth={700}
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