import { useEffect, useRef, useState, type RefObject } from "react";
import {
  isScrollableSurface,
  resolveActiveMailListScroller,
} from "../utils/mailScrollSurfaces";

const SCROLL_DELTA_THRESHOLD = 6;
const TOP_REVEAL_THRESHOLD = 8;

type ScrollSurfaceState = {
  lastTop: number;
  revealed: boolean;
};

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
 * Hide the sticky column header while scrolling down; reveal when scrolling up.
 * Uses document capture (shared with topbar chrome collapse) and resolves both
 * `.message-list` and parent `.mail-list-pane` scroll containers.
 */
export function useMessageListHeadReveal(
  scrollRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  resetKey = "",
): boolean {
  const [revealed, setRevealed] = useState(true);
  const revealedRef = useRef(true);

  useEffect(() => {
    revealedRef.current = true;
    setRevealed(true);
  }, [resetKey, enabled]);

  useEffect(() => {
    if (!enabled) {
      revealedRef.current = true;
      setRevealed(true);
      return;
    }

    const surfaceState = new WeakMap<HTMLElement, ScrollSurfaceState>();

    const syncRevealed = (next: boolean) => {
      if (revealedRef.current === next) return;
      revealedRef.current = next;
      setRevealed(next);
    };

    const onScroll = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const scroller = resolveActiveMailListScroller(scrollRef, target);
      if (!scroller) return;

      if (!isScrollableSurface(scroller)) {
        syncRevealed(true);
        return;
      }

      let state = surfaceState.get(scroller);
      if (!state) {
        state = { lastTop: scroller.scrollTop, revealed: true };
        surfaceState.set(scroller, state);
      }

      const result = applyRevealFromScroll(scroller.scrollTop, state.lastTop, state.revealed);
      state.lastTop = result.lastTop;
      state.revealed = result.revealed;
      syncRevealed(result.revealed);
    };

    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      revealedRef.current = true;
      setRevealed(true);
    };
  }, [enabled, scrollRef, resetKey]);

  return revealed;
}
