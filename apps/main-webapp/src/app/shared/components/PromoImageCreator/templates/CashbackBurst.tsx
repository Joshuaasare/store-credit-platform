import type { PromoTemplateProps } from "../types";
import { PromoCanvas, runningValueFontSize } from "./Canvas";
import FitText from "./FitText";

function burstPoints(spikes: number, outer: number, inner: number): string {
  const points: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI * i) / spikes - Math.PI / 2;
    const x = 540 + radius * Math.cos(angle);
    const y = 540 + radius * Math.sin(angle);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(" ");
}

export default function CashbackBurst({
  value,
  headline,
  palette,
  font,
}: PromoTemplateProps) {
  // All text sits inside the starburst and shares the value's color, so the
  // whole design reads as one badge (contrast comes from the burst fill).
  return (
    <PromoCanvas palette={palette} font={font}>
      <svg
        width={1080}
        height={1080}
        viewBox="0 0 1080 1080"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <polygon points={burstPoints(28, 470, 402)} fill={palette.accent} />
      </svg>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 560,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          color: palette.accentFg,
        }}
      >
        <FitText
          text={value}
          baseFontSize={runningValueFontSize(value.length)}
          maxWidth={560}
          style={{ fontWeight: 700, lineHeight: 1 }}
        />
        {headline && (
          <p
            style={{
              margin: "40px 0 0",
              fontSize: 44,
              fontWeight: 600,
              lineHeight: 1.25,
            }}
          >
            {headline}
          </p>
        )}
      </div>
    </PromoCanvas>
  );
}
