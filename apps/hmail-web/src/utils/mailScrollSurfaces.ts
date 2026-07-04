import type { RefObject } from "react";

/** Primary message table scroller inside a mail list pane. */
export const MAIL_MESSAGE_LIST_SCROLL_SELECTOR = ".message-list";

/** Parent pane that may become the scroll container on some layouts. */
export const MAIL_LIST_PANE_SCROLL_SELECTOR = ".mail-list-pane";

/** Scroll surfaces watched by shell chrome collapse (capture phase). */
export const PMail_SCROLL_CAPTURE_SELECTOR = [
  MAIL_MESSAGE_LIST_SCROLL_SELECTOR,
  MAIL_LIST_PANE_SCROLL_SELECTOR,
  ".platform-tools-panel__scroll",
  ".platform-tools-panel__results-scroll",
  ".contacts-panel__scroll",
  ".brand-settings__scroll",
  ".bespoke-demo-messaging-directory__scroll",
  ".bespoke-demo-chat-history",
  ".bespoke-production-settings-stack",
  ".bespoke-demo-production-workspace",
].join(", ");

export function isScrollableSurface(node: HTMLElement): boolean {
  return node.scrollHeight > node.clientHeight + 1;
}

export function isWithinMailApp(node: HTMLElement): boolean {
  return Boolean(node.closest(".mail-app"));
}

/**
 * Resolve the scroll container for the active mail list from a capture-phase scroll event.
 * Supports `.message-list` and parent `.mail-list-pane` when it carries the scroll.
 */
export function resolveActiveMailListScroller(
  scrollRef: RefObject<HTMLElement | null>,
  eventTarget: HTMLElement,
): HTMLElement | null {
  const list = scrollRef.current;
  if (!list || !isWithinMailApp(list)) return null;

  if (eventTarget === list) return list;

  if (
    eventTarget.matches(MAIL_LIST_PANE_SCROLL_SELECTOR) &&
    eventTarget.contains(list)
  ) {
    return eventTarget;
  }

  return null;
}

export function matchesScrollCaptureSelector(target: HTMLElement, selector: string): boolean {
  return target.matches(selector);
}
