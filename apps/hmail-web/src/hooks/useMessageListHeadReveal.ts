import { useEffect, useRef, useState, type RefObject } from "react";
import {
  applyRevealFromScroll,
  isScrollableSurface,
  resolveActiveMailListScroller,
} from "../utils/mailScrollSurfaces";

/** Ignore scroll deltas while chrome height/transform settles (prevents endless flicker). */
const REVEAL_LOCK_MS = 400;

type ScrollSurfaceState = {
  lastTop: number;
  revealed: boolean;
};

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
  const lockUntilRef = useRef(0);

  useEffect(() => {
    revealedRef.current = true;
    lockUntilRef.current = 0;
    setRevealed(true);
  }, [resetKey, enabled]);

  useEffect(() => {
    if (!enabled) {
      revealedRef.current = true;
      lockUntilRef.current = 0;
      setRevealed(true);
      return;
    }

    const surfaceState = new WeakMap<HTMLElement, ScrollSurfaceState>();

    const syncRevealed = (next: boolean) => {
      if (revealedRef.current === next) return;
      revealedRef.current = next;
      lockUntilRef.current = performance.now() + REVEAL_LOCK_MS;
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

      // Layout shifts from collapsing chrome look like reverse scroll — ignore briefly.
      if (performance.now() < lockUntilRef.current) {
        state.lastTop = scroller.scrollTop;
        state.revealed = revealedRef.current;
        return;
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
      lockUntilRef.current = 0;
      setRevealed(true);
    };
  }, [enabled, scrollRef, resetKey]);

  return revealed;
}
