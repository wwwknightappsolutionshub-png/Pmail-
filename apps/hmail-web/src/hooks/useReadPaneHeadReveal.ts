import { useEffect, useRef, useState, type RefObject } from "react";
import {
  applyRevealFromScroll,
  isScrollableSurface,
  resolveActiveReadPaneScroller,
} from "../utils/mailScrollSurfaces";

type ScrollSurfaceState = {
  lastTop: number;
  revealed: boolean;
};

/** Ignore scroll events briefly after a reveal toggle to avoid sticky-header feedback flicker. */
const TOGGLE_LOCK_MS = 220;

/**
 * Hide the read-pane header while scrolling down through a message; reveal when scrolling up.
 * Mobile/tablet only — enable via the `enabled` flag from the caller.
 */
export function useReadPaneHeadReveal(
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
      setRevealed(true);
      return;
    }

    const surfaceState = new WeakMap<HTMLElement, ScrollSurfaceState>();

    const syncRevealed = (next: boolean) => {
      if (revealedRef.current === next) return;
      revealedRef.current = next;
      lockUntilRef.current = performance.now() + TOGGLE_LOCK_MS;
      setRevealed(next);
    };

    const onScroll = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const scroller = resolveActiveReadPaneScroller(scrollRef, target);
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

      const now = performance.now();
      if (now < lockUntilRef.current) {
        // Keep lastTop in sync so the unlock doesn't fire a huge delta.
        state.lastTop = scroller.scrollTop;
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
      setRevealed(true);
    };
  }, [enabled, scrollRef, resetKey]);

  return revealed;
}
