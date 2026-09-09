import type { PromoTemplateProps } from "../types";
import { PromoCanvas, runningValueFontSize } from "./Canvas";
import FitText from "./FitText";

// Main accent block slants down to the left; the echo stripe below repeats the
// same diagonal (its clip percentages sit outside the block's height so the
// stripe stays parallel).
export default function SplitBanner({
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
          top: 0,
          left: 0,
          right: 0,
          height: 640,
          backgroundColor: palette.accent,
          color: palette.accentFg,
          clipPath: "polygon(0 0, 100% 0, 100% 74%, 0 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: 110,
        }}
      >
        <FitText
          text={value}
          baseFontSize={runningValueFontSize(value.length)}
          maxWidth={900}
          style={{ fontWeight: 700, lineHeight: 1 }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 640,
          clipPath: "polygon(0 100%, 100% 74%, 100% 80%, 0 106%)",
          backgroundColor: palette.accent,
          opacity: 0.35,
        }}
      />
      {headline && (
        <p
          style={{
            position: "absolute",
            top: 740,
            left: 110,
            right: 110,
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
      <div
        style={{
          position: "absolute",
          bottom: 110,
          left: "50%",
          width: 26,
          height: 26,
          transform: "translateX(-50%) rotate(45deg)",
          backgroundColor: palette.accent,
        }}
      />
    </PromoCanvas>
  );
}