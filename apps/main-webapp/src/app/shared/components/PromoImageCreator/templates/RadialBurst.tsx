import type { PromoTemplateProps } from "../types";
import { PromoCanvas, valueFontSize } from "./Canvas";

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

export default function RadialBurst({
  value,
  headline,
  subline,
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
        <polygon points={burstPoints(28, 470, 402)} fill={palette.accent} />
      </svg>
      <p
        style={{
          position: "absolute",
          top: 110,
          left: 0,
          right: 0,
          margin: 0,
          textAlign: "center",
          fontSize: 62,
          fontWeight: 700,
          letterSpacing: 12,
          textTransform: "uppercase",
        }}
      >
        {headline}
      </p>
      <span
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -52%)",
          fontSize: valueFontSize(value.length),
          fontWeight: 700,
          color: palette.accentFg,
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
      <p
        style={{
          position: "absolute",
          bottom: 110,
          left: 0,
          right: 0,
          margin: 0,
          textAlign: "center",
          fontSize: 46,
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
