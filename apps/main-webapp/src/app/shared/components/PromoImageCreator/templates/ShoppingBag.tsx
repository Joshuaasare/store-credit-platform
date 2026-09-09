import type { PromoTemplateProps } from "../types";
import { PromoCanvas } from "./Canvas";
import FitText from "./FitText";

export default function ShoppingBag({
  value,
  headline,
  palette,
  font,
}: PromoTemplateProps) {
  const baseFontSize = value.length > 10 ? 110 : value.length > 6 ? 150 : 200;
  return (
    <PromoCanvas palette={palette} font={font}>
      <svg
        width={1080}
        height={1080}
        viewBox="0 0 1080 1080"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <path
          d="M 380 400 A 75 75 0 0 1 530 400"
          fill="none"
          stroke={palette.accent}
          strokeWidth={20}
        />
        <path
          d="M 550 400 A 75 75 0 0 1 700 400"
          fill="none"
          stroke={palette.accent}
          strokeWidth={20}
        />
        <rect
          x={270}
          y={400}
          width={540}
          height={480}
          rx={28}
          fill={palette.accent}
        />
        <circle
          cx={810}
          cy={400}
          r={85}
          fill={palette.accentFg}
        />
        <text
          x={810}
          y={438}
          textAnchor="middle"
          fontSize={104}
          fontWeight={700}
          fill={palette.accent}
          style={{ fontFamily: font.fontFamily }}
        >
          %
        </text>
      </svg>
      <FitText
        text={value}
        baseFontSize={baseFontSize}
        maxWidth={440}
        style={{
          position: "absolute",
          top: 640,
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontWeight: 700,
          color: palette.accentFg,
          lineHeight: 1,
        }}
      />
      {headline && (
        <p
          style={{
            position: "absolute",
            top: 960,
            left: 0,
            right: 0,
            margin: 0,
            textAlign: "center",
            fontSize: 52,
            fontWeight: 700,
            letterSpacing: 8,
            textTransform: "uppercase",
          }}
        >
          {headline}
        </p>
      )}
    </PromoCanvas>
  );
}