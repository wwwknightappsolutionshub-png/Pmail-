import { useLayoutEffect, type RefObject } from "react";

/**
 * Shrink wide HTML mail bodies to fit the mobile/tablet read pane without horizontal scrolling.
 */
export function useMobileReadBodyFit(
  contentRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  resetKey = "",
): void {
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!enabled || !content) return undefined;

    const container = content.parentElement;
    if (!container) return undefined;

    const clearFit = () => {
      content.style.transform = "";
      content.style.transformOrigin = "";
      content.style.width = "";
      content.style.marginBottom = "";
    };

    const fit = () => {
      clearFit();
      const available = container.clientWidth;
      if (available <= 0) return;

      const needed = content.scrollWidth;
      if (needed <= available + 1) return;

      const scale = available / needed;
      content.style.transform = `scale(${scale})`;
      content.style.transformOrigin = "top left";
      content.style.width = `${100 / scale}%`;
      content.style.marginBottom = `${-(content.offsetHeight * (1 - scale))}px`;
    };

    fit();

    const resizeObserver = new ResizeObserver(() => fit());
    resizeObserver.observe(container);
    resizeObserver.observe(content);

    const images = content.querySelectorAll("img");
    const onImageLoad = () => fit();
    images.forEach((image) => {
      if (!image.complete) image.addEventListener("load", onImageLoad);
    });

    window.addEventListener("orientationchange", fit);
    return () => {
      resizeObserver.disconnect();
      images.forEach((image) => image.removeEventListener("load", onImageLoad));
      window.removeEventListener("orientationchange", fit);
      clearFit();
    };
  }, [contentRef, enabled, resetKey]);
}
