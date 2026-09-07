import type { PromoTemplateProps } from "../types";
import { PromoCanvas, runningValueFontSize } from "./Canvas";
import FitText from "./FitText";

// Card inverts the canvas (palette.fg surface, palette.bg text) so contrast
// holds in every palette; the punch notches are palette.bg circles clipped by
// the card edge to read as tear-outs.
export default function ReceiptCard({
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
          top: 90,
          left: 90,
          right: 90,
          bottom: 90,
          backgroundColor: palette.fg,
          borderRadius: 48,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            paddingTop: 80,
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: 18,
            textTransform: "uppercase",
            color: palette.bg,
          }}
        >
          Cashback
        </div>
        <div
          style={{
            flex: 1,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 70px",
          }}
        >
          <FitText
            text={value}
            baseFontSize={runningValueFontSize(value.length)}
            maxWidth={700}
            style={{ fontWeight: 700, lineHeight: 1, color: palette.bg }}
          />
        </div>
        {headline && (
          <div style={{ width: "100%", paddingBottom: 84, textAlign: "center" }}>
            <div style={{ position: "relative" }}>
              <div
                style={{
                  borderTop: `5px dashed ${palette.bg}`,
                  margin: "0 70px",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: -32,
                  top: -32,
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  backgroundColor: palette.bg,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: -32,
                  top: -32,
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  backgroundColor: palette.bg,
                }}
              />
            </div>
            <p
              style={{
                margin: "52px 70px 0",
                fontSize: 46,
                fontWeight: 600,
                lineHeight: 1.3,
                color: palette.bg,
              }}
            >
              {headline}
            </p>
          </div>
        )}
      </div>
    </PromoCanvas>
  );
}