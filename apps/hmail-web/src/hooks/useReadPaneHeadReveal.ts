import { useEffect, useRef, useState, type RefObject } from "react";

const SCROLL_DELTA_THRESHOLD = 6;
const TOP_REVEAL_THRESHOLD = 8;

function applyRevealFromScroll(
  scrollTop: number,
  lastTop: number,
  currentRevealed: boolean,
): { revealed: boolean; lastTop: number } {
  const delta = scrollTop - lastTop;

  if (scrollTop <= TOP_REVEAL_THRESHOLD) {
    return { revealed: true, lastTop: scrollTop };
  }
  if (delta > SCROLL_DELTA_THRESHOLD) {
    return { revealed: false, lastTop: scrollTop };
  }
  if (delta < -SCROLL_DELTA_THRESHOLD) {
    return { revealed: true, lastTop: scrollTop };
  }
  return { revealed: currentRevealed, lastTop: scrollTop };
}

/**
 * Hide the read-pane header while scrolling down through a message; reveal when scrolling up.
 */
export function useReadPaneHeadReveal(
  scrollRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  resetKey = "",
): boolean {
  const [revealed, setRevealed] = useState(true);
  const revealedRef = useRef(true);
  const lastTopRef = useRef(0);

  useEffect(() => {
    revealedRef.current = true;
    lastTopRef.current = 0;
    setRevealed(true);
  }, [resetKey, enabled]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!enabled || !scroller) {
      revealedRef.current = true;
      setRevealed(true);
      return;
    }

    const syncRevealed = (next: boolean) => {
      if (revealedRef.current === next) return;
      revealedRef.current = next;
      setRevealed(next);
    };

    const onScroll = () => {
      const scrollTop = scroller.scrollTop;
      const scrollable = scroller.scrollHeight > scroller.clientHeight + 1;

      if (!scrollable) {
        syncRevealed(true);
        lastTopRef.current = scrollTop;
        return;
      }

      const result = applyRevealFromScroll(scrollTop, lastTopRef.current, revealedRef.current);
      lastTopRef.current = result.lastTop;
      syncRevealed(result.revealed);
    };

    onScroll();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      revealedRef.current = true;
      setRevealed(true);
    };
  }, [enabled, scrollRef, resetKey]);

  return revealed;
}
