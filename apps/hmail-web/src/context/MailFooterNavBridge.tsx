import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { InboxSwitcherHandle } from "../components/InboxSwitcher";

export type MailFooterNavPane = "menu" | "list" | "read";

export type MailFooterNavState = {
  mobilePane: MailFooterNavPane;
  starredActive?: boolean;
};

type MailFooterNavHandlers = {
  openFolders: () => void;
  openMessages: () => void;
  openStarred: () => void;
};

type PendingFooterAction = "folders" | "messages" | "starred" | null;

type MailFooterNavBridgeValue = {
  state: MailFooterNavState;
  setState: (state: MailFooterNavState) => void;
  registerHandlers: (handlers: MailFooterNavHandlers) => () => void;
  registerInboxSwitcher: (handle: InboxSwitcherHandle | null) => void;
  openFolders: () => void;
  openMessages: () => void;
  openStarred: () => void;
  openInboxAddForm: () => void;
};

const defaultState: MailFooterNavState = { mobilePane: "list" };

const MailFooterNavBridgeContext = createContext<MailFooterNavBridgeValue | null>(null);

export function MailFooterNavBridgeProvider({ children }: { children: ReactNode }) {
  const handlersRef = useRef<MailFooterNavHandlers | null>(null);
  const inboxSwitcherRef = useRef<InboxSwitcherHandle | null>(null);
  const pendingRef = useRef<PendingFooterAction>(null);
  const [state, setState] = useState<MailFooterNavState>(defaultState);

  const runPending = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending || !handlersRef.current) return;
    pendingRef.current = null;
    if (pending === "folders") handlersRef.current.openFolders();
    if (pending === "messages") handlersRef.current.openMessages();
    if (pending === "starred") handlersRef.current.openStarred();
  }, []);

  const registerHandlers = useCallback(
    (handlers: MailFooterNavHandlers) => {
      handlersRef.current = handlers;
      runPending();
      return () => {
        if (handlersRef.current === handlers) {
          handlersRef.current = null;
        }
      };
    },
    [runPending],
  );

  const openFolders = useCallback(() => {
    if (handlersRef.current) {
      handlersRef.current.openFolders();
      return;
    }
    pendingRef.current = "folders";
  }, []);

  const openMessages = useCallback(() => {
    if (handlersRef.current) {
      handlersRef.current.openMessages();
      return;
    }
    pendingRef.current = "messages";
  }, []);

  const openStarred = useCallback(() => {
    if (handlersRef.current) {
      handlersRef.current.openStarred();
      return;
    }
    pendingRef.current = "starred";
  }, []);

  const registerInboxSwitcher = useCallback((handle: InboxSwitcherHandle | null) => {
    inboxSwitcherRef.current = handle;
  }, []);

  const openInboxAddForm = useCallback(() => {
    inboxSwitcherRef.current?.openWithAddForm();
  }, []);

  return (
    <MailFooterNavBridgeContext.Provider
      value={{ state, setState, registerHandlers, registerInboxSwitcher, openFolders, openMessages, openStarred, openInboxAddForm }}
    >
      {children}
    </MailFooterNavBridgeContext.Provider>
  );
}

export function useMailFooterNavBridge(): MailFooterNavBridgeValue {
  const value = useContext(MailFooterNavBridgeContext);
  if (!value) {
    throw new Error("useMailFooterNavBridge must be used within MailFooterNavBridgeProvider");
  }
  return value;
}

export function useOptionalMailFooterNavBridge(): MailFooterNavBridgeValue | null {
  return useContext(MailFooterNavBridgeContext);
}

export function useRegisterMailFooterNav(handlers: MailFooterNavHandlers, enabled = true) {
  const bridge = useOptionalMailFooterNavBridge();

  useEffect(() => {
    if (!enabled || !bridge) return;
    return bridge.registerHandlers(handlers);
  }, [bridge, enabled, handlers]);
}
