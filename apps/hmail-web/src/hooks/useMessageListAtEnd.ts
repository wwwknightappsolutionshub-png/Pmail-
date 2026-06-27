import { useEffect, useState, type RefObject } from "react";

const END_THRESHOLD_PX = 48;

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
      setAtEnd(scrollTop + clientHeight >= scrollHeight - END_THRESHOLD_PX);
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
