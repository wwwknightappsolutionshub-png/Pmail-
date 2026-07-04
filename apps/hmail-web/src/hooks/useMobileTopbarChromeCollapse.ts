import { useEffect } from "react";
import { isMobileScreen } from "../utils/pwaPlatform";
import {
  isScrollableSurface,
  matchesScrollCaptureSelector,
  PMail_SCROLL_CAPTURE_SELECTOR,
} from "../utils/mailScrollSurfaces";

export function useMobileTopbarChromeCollapse(onCollapse: (collapsed: boolean) => void) {
  useEffect(() => {
    if (!isMobileScreen()) return;

    const collapseThreshold = 12;
    const surfaceState = new WeakMap<HTMLElement, { lastTop: number; collapsed: boolean }>();

    const resetCollapse = () => {
      onCollapse(false);
    };

    const onScroll = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.closest(".pmail-demo-shell")) return;
      if (!matchesScrollCaptureSelector(target, PMail_SCROLL_CAPTURE_SELECTOR)) return;
      if (!isScrollableSurface(target)) return;

      let state = surfaceState.get(target);
      if (!state) {
        state = { lastTop: target.scrollTop, collapsed: false };
        surfaceState.set(target, state);
      }

      const top = target.scrollTop;
      const delta = top - state.lastTop;

      if (delta > 0 && top > collapseThreshold && !state.collapsed) {
        state.collapsed = true;
        onCollapse(true);
      } else if ((delta < -collapseThreshold || top <= 8) && state.collapsed) {
        state.collapsed = false;
        onCollapse(false);
      }

      state.lastTop = top;
    };

    resetCollapse();
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      resetCollapse();
    };
  }, [onCollapse]);
}
