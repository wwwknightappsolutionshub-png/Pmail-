import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import type { ComposeInitial } from "../components/ComposeModal";

type OpenComposeFn = (initial?: ComposeInitial) => void;

type BespokeComposeBridgeValue = {
  openCompose: OpenComposeFn;
  register: (fn: OpenComposeFn) => () => void;
};

const BespokeComposeBridgeContext = createContext<BespokeComposeBridgeValue | null>(null);

export function BespokeComposeBridgeProvider({ children }: { children: ReactNode }) {
  const handlerRef = useRef<OpenComposeFn | null>(null);
  const pendingInitialRef = useRef<ComposeInitial | undefined>(undefined);

  const register = useCallback((fn: OpenComposeFn) => {
    handlerRef.current = fn;
    if (pendingInitialRef.current !== undefined) {
      fn(pendingInitialRef.current);
      pendingInitialRef.current = undefined;
    }
    return () => {
      if (handlerRef.current === fn) {
        handlerRef.current = null;
      }
    };
  }, []);

  const openCompose = useCallback((initial?: ComposeInitial) => {
    if (handlerRef.current) {
      handlerRef.current(initial);
      return;
    }
    pendingInitialRef.current = initial;
  }, []);

  return (
    <BespokeComposeBridgeContext.Provider value={{ openCompose, register }}>
      {children}
    </BespokeComposeBridgeContext.Provider>
  );
}

export function useBespokeComposeBridge(): BespokeComposeBridgeValue {
  const value = useContext(BespokeComposeBridgeContext);
  if (!value) {
    throw new Error("useBespokeComposeBridge must be used within BespokeComposeBridgeProvider");
  }
  return value;
}

export function useRegisterBespokeCompose(openCompose: OpenComposeFn, enabled = true) {
  const value = useContext(BespokeComposeBridgeContext);

  useEffect(() => {
    if (!enabled || !value) return;
    return value.register(openCompose);
  }, [enabled, openCompose, value]);
}
