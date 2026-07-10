import { useRef, type TouchEvent } from "react";

const SWIPE_THRESHOLD_PX = 56;
const VERTICAL_TOLERANCE_PX = 40;

/**
 * Horizontal swipe-left → go back (mobile/tablet panes).
 * Ignores mostly-vertical gestures so it does not fight scroll.
 */
export function useSwipeBack(onBack: () => void, enabled: boolean) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  const onTouchStart = (event: TouchEvent) => {
    if (!enabled) return;
    const touch = event.touches[0];
    if (!touch) return;
    startX.current = touch.clientX;
    startY.current = touch.clientY;
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (!enabled || startX.current == null || startY.current == null) return;
    const touch = event.changedTouches[0];
    if (!touch) {
      startX.current = null;
      startY.current = null;
      return;
    }

    const deltaX = touch.clientX - startX.current;
    const deltaY = touch.clientY - startY.current;
    startX.current = null;
    startY.current = null;

    // Swipe left: finger moves left (negative deltaX)
    if (deltaX <= -SWIPE_THRESHOLD_PX && Math.abs(deltaY) < VERTICAL_TOLERANCE_PX) {
      onBack();
    }
  };

  const onTouchCancel = () => {
    startX.current = null;
    startY.current = null;
  };

  return { onTouchStart, onTouchEnd, onTouchCancel };
}
