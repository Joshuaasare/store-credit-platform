import { useState, type ReactNode } from "react";
import { cn } from "@store-credit-platform/web-components";

interface FlipCardProps {
  front: (flip: () => void) => ReactNode;
  back: (flip: () => void) => ReactNode;
  className?: string;
  flipped?: boolean;
  onFlippedChange?: (flipped: boolean) => void;
}

export function FlipCard({
  front,
  back,
  className,
  flipped: controlledFlipped,
  onFlippedChange,
}: FlipCardProps) {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const isControlled = controlledFlipped !== undefined;
  const flipped = controlledFlipped ?? internalFlipped;
  const flip = () => {
    const next = !flipped;
    if (!isControlled) setInternalFlipped(next);
    onFlippedChange?.(next);
  };

  return (
    <div className={cn("[perspective:1600px]", className)}>
      <div
        className={cn(
          "grid [transform-style:preserve-3d] transition-transform duration-500 ease-out",
          flipped && "[transform:rotateY(180deg)]",
        )}
      >
        <div className="[grid-row:1] [grid-column:1] [backface-visibility:hidden]">
          {front(flip)}
        </div>
        <div className="[grid-row:1] [grid-column:1] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          {back(flip)}
        </div>
      </div>
    </div>
  );
}