import { useEffect, useRef, useState, type RefObject } from "react";

const PULL_THRESHOLD_PX = 72;
const PULL_MAX_PX = 120;

type PullToRefreshState = {
  pullDistance: number;
  isRefreshing: boolean;
  threshold: number;
};

/**
 * Touch pull-to-refresh for a scroll container that is scrolled to the top.
 */
export function usePullToRefresh(
  scrollRef: RefObject<HTMLElement | null>,
  onRefresh: () => Promise<void>,
  enabled = true,
): PullToRefreshState {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  const pullDistanceRef = useRef(0);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  useEffect(() => {
    pullDistanceRef.current = pullDistance;
  }, [pullDistance]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !enabled) return;

    const resetPull = () => {
      pullingRef.current = false;
      setPullDistance(0);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (isRefreshingRef.current || el.scrollTop > 2) return;
      startYRef.current = event.touches[0]?.clientY ?? 0;
      pullingRef.current = true;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!pullingRef.current || isRefreshingRef.current) return;
      if (el.scrollTop > 2) {
        resetPull();
        return;
      }

      const currentY = event.touches[0]?.clientY ?? 0;
      const delta = currentY - startYRef.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }

      if (event.cancelable) event.preventDefault();
      setPullDistance(Math.min(delta * 0.5, PULL_MAX_PX));
    };

    const onTouchEnd = () => {
      if (!pullingRef.current || isRefreshingRef.current) {
        resetPull();
        return;
      }

      pullingRef.current = false;
      const distance = pullDistanceRef.current;
      if (distance < PULL_THRESHOLD_PX) {
        setPullDistance(0);
        return;
      }

      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD_PX);
      void onRefreshRef
        .current()
        .catch(() => undefined)
        .finally(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        });
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [scrollRef, enabled]);

  return {
    pullDistance,
    isRefreshing,
    threshold: PULL_THRESHOLD_PX,
  };
}
