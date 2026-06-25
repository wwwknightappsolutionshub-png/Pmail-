import { createPortal } from "react-dom";
import type { FocusEvent, PointerEvent } from "react";
import "./MobileDrawerTooltip.css";

export type MobileDrawerTooltipState = {
  label: string;
  anchor: DOMRect;
} | null;

interface MobileDrawerTooltipProps {
  state: MobileDrawerTooltipState;
  theme?: "light" | "dark";
}

export function MobileDrawerTooltip({ state, theme = "dark" }: MobileDrawerTooltipProps) {
  if (!state) return null;

  const { label, anchor } = state;
  const left = anchor.right + 7;
  const top = anchor.top + anchor.height / 2;

  return createPortal(
    <div
      className={`mobile-drawer-tooltip${theme === "light" ? " mobile-drawer-tooltip--light" : ""}`}
      role="tooltip"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        transform: "translateY(-50%)",
      }}
    >
      {label}
    </div>,
    document.body,
  );
}

export function mobileDrawerTooltipHandlers(
  label: string,
  setState: (state: MobileDrawerTooltipState) => void,
) {
  const show = (target: HTMLElement) => {
    setState({ label, anchor: target.getBoundingClientRect() });
  };

  return {
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      show(event.currentTarget);
    },
    onPointerLeave: () => {
      setState(null);
    },
    onFocus: (event: FocusEvent<HTMLElement>) => {
      show(event.currentTarget);
    },
    onBlur: () => {
      setState(null);
    },
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      show(event.currentTarget);
    },
  };
}
