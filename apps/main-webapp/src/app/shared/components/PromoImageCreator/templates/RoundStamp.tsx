import type { PromoTemplateProps } from "../types";
import { PromoCanvas, valueFontSize } from "./Canvas";
import FitText from "./FitText";

export default function RoundStamp({
  value,
  headline,
  palette,
  font,
}: PromoTemplateProps) {
  return (
    <PromoCanvas palette={palette} font={font}>
      <div
        style={{
          width: 830,
          height: 830,
          borderRadius: "50%",
          border: `18px solid ${palette.accent}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "rotate(-8deg)",
        }}
      >
        <div
          style={{
            width: 744,
            height: 744,
            borderRadius: "50%",
            border: `4px solid ${palette.accent}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 26,
            textAlign: "center",
          }}
        >
          <span
            style={{
              fontSize: 54,
              fontWeight: 700,
              letterSpacing: 9,
              textTransform: "uppercase",
            }}
          >
            {headline}
          </span>
          <span
            style={{ fontSize: 36, letterSpacing: 14, color: palette.accent }}
          >
            ★ ★ ★
          </span>
          <FitText
            text={value}
            baseFontSize={valueFontSize(value.length)}
            maxWidth={680}
            style={{ fontWeight: 700, lineHeight: 1 }}
          />
        </div>
      </div>
    </PromoCanvas>
  );
}
