import React, { PropsWithChildren, useEffect, useState } from "react";
import { throttle } from "throttle-debounce";

export const ThresholdUnits = {
  Pixel: "Pixel",
  Percent: "Percent",
};

const defaultThreshold = {
  unit: ThresholdUnits.Percent,
  value: 0.8,
};

interface Props {
  next: (onComplete?: () => void) => Promise<void>;
  scrollThreshold?: number;
  loader?: React.ReactNode;
}

const InfiniteScroll: React.FC<PropsWithChildren<Props>> = ({
  next,
  children,
  scrollThreshold = 0.8,
  loader,
}) => {
  const [loading, setLoading] = useState(false);

  const isElementAtBottom = (
    target: HTMLElement,
    scrollThreshold: string | number = 0.8,
  ) => {
    const clientHeight =
      target === document.body || target === document.documentElement
        ? window.screen.availHeight
        : target.clientHeight;

    const threshold = parseThreshold(scrollThreshold);

    if (threshold.unit === ThresholdUnits.Pixel) {
      return (
        target.scrollTop + clientHeight >= target.scrollHeight - threshold.value
      );
    }

    return (
      target.scrollTop + clientHeight >=
      (threshold.value / 100) * target.scrollHeight
    );
  };

  const parseThreshold = (scrollThreshold: string | number) => {
    if (typeof scrollThreshold === "number") {
      return {
        unit: ThresholdUnits.Percent,
        value: scrollThreshold * 100,
      };
    }

    return defaultThreshold;
  };

  const onScroll = async (ev: Event) => {
    const target = document.documentElement.scrollTop
      ? document.documentElement
      : document.body;
    const isBottom = isElementAtBottom(target as HTMLElement, scrollThreshold);

    if (isBottom && !loading) {
      setLoading(true);
      await next(() => {
        setLoading(false);
      });
    }
  };

  const trottleScroll = throttle(500, onScroll);

  useEffect(() => {
    window.addEventListener("scroll", trottleScroll);
    return () => {
      window.removeEventListener("scroll", trottleScroll);
    };
  }, [trottleScroll]);

  /**
   * when the first page's content is less than the viewport height,
   * scroll events won't be triggered, so up until the page is scrollable,
   * we need to trigger the next load by checking the scroll height
   * against the viewport height.
   */
  useEffect(() => {
    if (!(document.documentElement.scrollHeight > window.innerHeight)) {
      next(() => {
        setLoading(false);
      });
    }
  }, [children]);

  return (
    <div>
      {children}
      {loader}
    </div>
  );
};

export default InfiniteScroll;
