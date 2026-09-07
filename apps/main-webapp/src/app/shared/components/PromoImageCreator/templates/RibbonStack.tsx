import type { PromoTemplateProps } from "../types";
import { PromoCanvas } from "./Canvas";

interface RibbonProps {
  rotation: number;
  color: string;
  textColor: string;
  notchColor: string;
  children: React.ReactNode;
  fontSize: number;
}

function Ribbon({
  rotation,
  color,
  textColor,
  notchColor,
  children,
  fontSize,
}: RibbonProps) {
  return (
    <div
      style={{
        position: "relative",
        width: 860,
        backgroundColor: color,
        color: textColor,
        transform: `rotate(${rotation}deg)`,
        padding: "34px 40px",
        textAlign: "center",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 700,
          letterSpacing: 8,
          textTransform: "uppercase",
          lineHeight: 1.1,
          display: "block",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {children}
      </span>
      {/* Forked ribbon tails */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: -44,
          width: 44,
          backgroundColor: color,
          clipPath: "polygon(100% 0, 100% 100%, 0 50%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: -44,
          width: 44,
          backgroundColor: color,
          clipPath: "polygon(0 0, 0 100%, 100% 50%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: -44,
          width: 44,
          backgroundColor: notchColor,
          clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
          opacity: 0.35,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: -44,
          width: 44,
          backgroundColor: notchColor,
          clipPath: "polygon(0 0, 0 100%, 100% 0)",
          opacity: 0.35,
        }}
      />
    </div>
  );
}

export default function RibbonStack({
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
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 46,
        }}
      >
        {headline && (
          <Ribbon
            rotation={-6}
            color={palette.accent}
            textColor={palette.accentFg}
            notchColor={palette.accentFg}
            fontSize={64}
          >
            {headline}
          </Ribbon>
        )}
        <Ribbon
          rotation={5}
          color={palette.fg}
          textColor={palette.bg}
          notchColor={palette.bg}
          fontSize={96}
        >
          {value}
        </Ribbon>
      </div>
    </PromoCanvas>
  );
}