import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

interface FitTextProps {
  text: string;
  baseFontSize: number;
  maxWidth: number;
  minFontSize?: number;
  style?: CSSProperties;
}

// Hero values start from a char-count ramp, but wide glyphs or long merchant
// text can still overflow the fixed 1080px canvas, so the rendered width is
// measured and the font shrinks (or grows back) until it fits maxWidth.
export default function FitText({
  text,
  baseFontSize,
  maxWidth,
  minFontSize = 40,
  style,
}: FitTextProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [fontSize, setFontSize] = useState(baseFontSize);

  useLayoutEffect(() => {
    let cancelled = false;
    const fit = () => {
      if (cancelled) return;
      const el = ref.current;
      if (!el) return;
      const width = el.scrollWidth;
      if (!width) return;
      setFontSize((current) => {
        // Single-line width scales linearly with font size, so one
        // proportional correction reaches the fixed point.
        const fitted = Math.floor((current * maxWidth) / width);
        if (width > maxWidth) {
          return Math.max(minFontSize, Math.min(current, fitted));
        }
        if (current < baseFontSize) {
          return Math.min(baseFontSize, Math.max(current, fitted));
        }
        return current;
      });
    };
    fit();
    // A late font swap changes metrics; re-fit once fonts settle.
    document.fonts.ready.then(fit);
    return () => {
      cancelled = true;
    };
  }, [text, fontSize, baseFontSize, maxWidth, minFontSize]);

  return (
    <span
      ref={ref}
      style={{
        ...style,
        fontSize,
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}