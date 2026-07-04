import { useEffect, useState } from "react";
import { TABLET_MAX_WIDTH_PX } from "../utils/pwaPlatform";

/** True on phone and tablet widths where mail list chrome (collapsible head) is active. */
export function useMailListChromeViewport(): boolean {
  const query = `(max-width: ${TABLET_MAX_WIDTH_PX}px)`;

  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);

  return matches;
}
