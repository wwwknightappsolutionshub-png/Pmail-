import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Folder, Inbox, SquarePen } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAddons } from "../context/AddonContext";
import { useBespokeComposeBridge } from "../context/BespokeComposeBridge";
import { useMailFooterNavBridge } from "../context/MailFooterNavBridge";
import { InboxConnectResultToast } from "./InboxConnectResultToast";
import { InboxSwitcher, type InboxSwitcherHandle } from "./InboxSwitcher";
import { MailBottomNavButton } from "./MailBottomNavButton";
import { PaidAddonToast } from "./PaidAddonToast";

type ShellMailFooterNavProps = {
  uiThemeVersion?: "dark" | "light";
  onActivateInbox?: () => void;
};

export function ShellMailFooterNav({ uiThemeVersion = "dark", onActivateInbox }: ShellMailFooterNavProps) {
  const { user, refresh } = useAuth();
  const { panelWorkspaceTrial } = useAddons();
  const { openCompose } = useBespokeComposeBridge();
  const footerNav = useMailFooterNavBridge();
  const navigate = useNavigate();
  const inboxSwitcherRef = useRef<InboxSwitcherHandle>(null);
  const [paidAddonGate, setPaidAddonGate] = useState<{ slug: string; name: string } | null>(null);
  const [inboxConnectToast, setInboxConnectToast] = useState<"success" | "error" | null>(null);

  const bindInboxSwitcherRef = useCallback(
    (handle: InboxSwitcherHandle | null) => {
      inboxSwitcherRef.current = handle;
      footerNav.registerInboxSwitcher(handle);
    },
    [footerNav],
  );

  const activateInbox = useCallback(() => {
    if (onActivateInbox) {
      onActivateInbox();
      return;
    }
    navigate("/");
  }, [navigate, onActivateInbox]);

  const handleFolders = useCallback(() => {
    footerNav.openFolders();
    activateInbox();
  }, [activateInbox, footerNav]);

  const handleMessages = useCallback(() => {
    footerNav.openMessages();
    activateInbox();
  }, [activateInbox, footerNav]);

  const handleNewMail = useCallback(() => {
    activateInbox();
    openCompose({ mode: "new" });
  }, [activateInbox, openCompose]);

  const handleMailboxSwitch = useCallback(async () => {
    await refresh();
  }, [refresh]);

  return (
    <>
      <div
        className={`mail-shell-footer-host${
          uiThemeVersion === "light" ? " mail-shell-footer-host--light" : ""
        }`}
      >
        <nav className="mail-bottom-nav mail-bottom-nav--with-switcher" aria-label="Mobile navigation">
          <MailBottomNavButton
            label="Folders"
            icon={Folder}
            active={footerNav.state.mobilePane === "menu"}
            onClick={handleFolders}
          />
          <MailBottomNavButton
            label="Messages"
            icon={Inbox}
            active={footerNav.state.mobilePane === "list"}
            onClick={handleMessages}
          />
          <InboxSwitcher
            ref={bindInboxSwitcherRef}
            variant="bottom-nav"
            activeAccount={user?.activeMailAccount ?? null}
            onSwitched={() => void handleMailboxSwitch()}
            onPaidAddonGate={() => setPaidAddonGate({ slug: "multi-inbox-functionality", name: "Multiple Inboxes" })}
            onAccountConnected={() => setInboxConnectToast("success")}
            onAccountConnectFailed={() => setInboxConnectToast("error")}
          />
          <MailBottomNavButton label="New mail" icon={SquarePen} onClick={handleNewMail} />
        </nav>
      </div>

      {paidAddonGate ? (
        <PaidAddonToast
          addonName={paidAddonGate.name}
          panelWorkspaceTrial={panelWorkspaceTrial}
          onOpenMarketplace={() => {
            const slug = paidAddonGate.slug;
            setPaidAddonGate(null);
            navigate(`/addons?highlight=${slug}`);
          }}
          onDismiss={() => setPaidAddonGate(null)}
        />
      ) : null}

      {inboxConnectToast ? (
        <InboxConnectResultToast kind={inboxConnectToast} onDismiss={() => setInboxConnectToast(null)} />
      ) : null}
    </>
  );
}
