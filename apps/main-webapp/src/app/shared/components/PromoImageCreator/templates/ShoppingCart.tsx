import type { PromoTemplateProps } from "../types";
import { PromoCanvas } from "./Canvas";
import FitText from "./FitText";

export default function ShoppingCart({
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
          d="M 190 300 L 310 330"
          stroke={palette.accent}
          strokeWidth={22}
          strokeLinecap="round"
        />
        <polygon
          points="310,330 900,330 810,640 390,640"
          fill="none"
          stroke={palette.accent}
          strokeWidth={22}
          strokeLinejoin="round"
        />
        <line x1={430} y1={360} x2={450} y2={610} stroke={palette.accent} strokeWidth={5} opacity={0.25} />
        <line x1={560} y1={360} x2={565} y2={610} stroke={palette.accent} strokeWidth={5} opacity={0.25} />
        <line x1={690} y1={360} x2={675} y2={610} stroke={palette.accent} strokeWidth={5} opacity={0.25} />
        <circle cx={440} cy={790} r={48} fill={palette.accent} />
        <circle cx={440} cy={790} r={18} fill={palette.bg} />
        <circle cx={750} cy={790} r={48} fill={palette.accent} />
        <circle cx={750} cy={790} r={18} fill={palette.bg} />
        <circle
          cx={880}
          cy={200}
          r={95}
          fill={palette.accentFg}
          stroke={palette.accent}
          strokeWidth={10}
        />
        <text
          x={880}
          y={240}
          textAnchor="middle"
          fontSize={112}
          fontWeight={700}
          fill={palette.accent}
          style={{ fontFamily: font.fontFamily }}
        >
          %
        </text>
        <g transform="rotate(-24 220 225)">
          <rect x={90} y={160} width={260} height={130} rx={26} fill={palette.accent} />
          <circle cx={140} cy={225} r={20} fill={palette.bg} />
        </g>
      </svg>
      <FitText
        text={value}
        baseFontSize={baseFontSize}
        maxWidth={430}
        style={{
          position: "absolute",
          top: 485,
          left: 600,
          transform: "translate(-50%, -50%)",
          fontWeight: 700,
          color: palette.fg,
          lineHeight: 1,
        }}
      />
      {headline && (
        <p
          style={{
            position: "absolute",
            top: 950,
            left: 0,
            right: 0,
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