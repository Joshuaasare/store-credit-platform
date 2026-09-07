import type { PromoTemplateProps } from "../types";
import { PromoCanvas, valueFontSize } from "./Canvas";
import FitText from "./FitText";

const NOTCH = 84;

export default function CouponTicket({
  value,
  headline,
  palette,
  font,
}: PromoTemplateProps) {
  // Ticket inverts the canvas: its surface is palette.fg and all ticket text
  // stays palette.bg so contrast holds in every palette (accent can equal fg in mono).
  return (
    <PromoCanvas palette={palette} font={font}>
      <div
        style={{
          position: "relative",
          width: 900,
          height: 660,
          backgroundColor: palette.fg,
          display: "flex",
          alignItems: "stretch",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -NOTCH / 2,
            top: "50%",
            transform: "translateY(-50%)",
            width: NOTCH,
            height: NOTCH,
            borderRadius: "50%",
            backgroundColor: palette.bg,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -NOTCH / 2,
            top: "50%",
            transform: "translateY(-50%)",
            width: NOTCH,
            height: NOTCH,
            borderRadius: "50%",
            backgroundColor: palette.bg,
          }}
        />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 24px",
          }}
        >
          <FitText
            text={value}
            baseFontSize={valueFontSize(value.length) * 0.8}
            maxWidth={340}
            style={{
              fontWeight: 700,
              lineHeight: 1.1,
              color: palette.bg,
            }}
          />
        </div>
        <div
          style={{
            width: 0,
            borderLeft: `4px dashed ${palette.bg}`,
            margin: "44px 0",
          }}
        />
        <div
          style={{
            flex: 1.15,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 28,
            padding: "40px 24px",
            textAlign: "center",
          }}
        >
          <span
            style={{
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: palette.bg,
            }}
          >
            {headline}
          </span>
        </div>
      </div>
    </PromoCanvas>
  );
}
