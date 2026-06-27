import { useEffect, useState, type RefObject } from "react";

const SHOW_THRESHOLD_PX = 48;
const HIDE_THRESHOLD_PX = 160;

export function useMessageListAtEnd(
  listRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  revisionKey: string | number,
) {
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setAtEnd(false);
      return;
    }

    const node = listRef.current;
    if (!node) {
      setAtEnd(false);
      return;
    }

    const evaluate = () => {
      const { scrollTop, scrollHeight, clientHeight } = node;
      if (scrollHeight <= clientHeight + 1) {
        setAtEnd(true);
        return;
      }

      const distanceFromEnd = scrollHeight - (scrollTop + clientHeight);
      setAtEnd((current) => {
        if (distanceFromEnd <= SHOW_THRESHOLD_PX) return true;
        if (distanceFromEnd >= HIDE_THRESHOLD_PX) return false;
        return current;
      });
    };

    evaluate();
    node.addEventListener("scroll", evaluate, { passive: true });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(evaluate) : null;
    observer?.observe(node);

    return () => {
      node.removeEventListener("scroll", evaluate);
      observer?.disconnect();
    };
  }, [enabled, listRef, revisionKey]);

  return atEnd;
}
