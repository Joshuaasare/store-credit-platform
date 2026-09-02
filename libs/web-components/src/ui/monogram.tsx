import { useState } from "react";
import { cn } from "../lib/utils";

export interface MonogramProps {
  /** 1-2 char initials (or fallback glyph) rendered inside the circle. */
  text: string;
  /** Stable seed for tint selection. Defaults to `text`. Same seed → same tint. */
  seed?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Optional avatar URL. When present, it's rendered as an <img>; the
   *  initials stay in the DOM behind it and become the fallback if the
   *  image fails to load. */
  imageUrl?: string | null;
}

/**
 * Tinted circle with 1-2 char initials — identity marker for customers (and
 * any other named entity). The tint is picked deterministically from a
 * 5-color palette by hashing `seed`, so the same customer always renders in
 * the same color across surfaces.
 *
 * Palette: primary (teal brand), indigo, rose, violet, amber. Deliberately
 * leaves blue/emerald free for the semantic transaction-type badges
 * (purchase/credit_issue/credit_redeem) so monograms don't clash with badges
 * in the same row.
 */
const TINTS = [
  "bg-primary/10 text-primary",
  "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
] as const;

const SIZE = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
} as const;

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function Monogram({
  text,
  seed,
  size = "sm",
  className,
  imageUrl,
}: MonogramProps) {
  const t = TINTS[hashSeed(seed ?? text) % TINTS.length];
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = !!imageUrl && !imgFailed;
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold tracking-tight tabular-nums",
        t,
        SIZE[size],
        className,
      )}
      aria-hidden
    >
      <span className={cn(showImage && "opacity-0")}>{text}</span>
      {showImage && (
        <img
          src={imageUrl}
          alt=""
          onError={() => setImgFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </span>
  );
}