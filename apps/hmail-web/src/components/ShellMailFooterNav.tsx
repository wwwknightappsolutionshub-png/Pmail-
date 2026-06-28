import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Folder, Inbox, SquarePen } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAddons } from "../context/AddonContext";
import { useBespokeComposeBridge } from "../context/BespokeComposeBridge";
import { useMailFooterNavBridge } from "../context/MailFooterNavBridge";
import { InboxConnectResultToast } from "./InboxConnectResultToast";
import { InboxSwitchSuccessToast } from "./InboxSwitchSuccessToast";
import { InboxSwitcher, type InboxSwitcherHandle, type MailAccountSummary } from "./InboxSwitcher";
import { MailBottomNavButton } from "./MailBottomNavButton";
import { PaidAddonToast } from "./PaidAddonToast";

type ShellMailFooterNavProps = {
  uiThemeVersion?: "dark" | "light";
  /** Switch shell workspace back to inbox without resetting mail folder/pane. */
  onActivateInbox?: () => void;
  /** Hard reset to inbox list (Messages footer). */
  onResetInboxHome?: () => void;
  onClearMailSearch?: () => void;
};

export function ShellMailFooterNav({
  uiThemeVersion = "dark",
  onActivateInbox,
  onResetInboxHome,
  onClearMailSearch,
}: ShellMailFooterNavProps) {
  const { user } = useAuth();
  const { panelWorkspaceTrial } = useAddons();
  const { openCompose } = useBespokeComposeBridge();
  const footerNav = useMailFooterNavBridge();
  const navigate = useNavigate();
  const inboxSwitcherRef = useRef<InboxSwitcherHandle>(null);
  const [paidAddonGate, setPaidAddonGate] = useState<{ slug: string; name: string } | null>(null);
  const [inboxConnectToast, setInboxConnectToast] = useState<"success" | "error" | null>(null);
  const [inboxSwitchToast, setInboxSwitchToast] = useState<MailAccountSummary | null>(null);

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

  const resetInboxHome = useCallback(() => {
    if (onResetInboxHome) {
      onResetInboxHome();
      return;
    }
    activateInbox();
  }, [activateInbox, onResetInboxHome]);

  const handleFolders = useCallback(() => {
    onClearMailSearch?.();
    activateInbox();
    footerNav.openFolders();
  }, [activateInbox, footerNav, onClearMailSearch]);

  const handleMessages = useCallback(() => {
    resetInboxHome();
    footerNav.openMessages();
  }, [footerNav, resetInboxHome]);

  const handleNewMail = useCallback(() => {
    onClearMailSearch?.();
    activateInbox();
    openCompose({ mode: "new" });
  }, [activateInbox, onClearMailSearch, openCompose]);

  const handleMailboxSwitch = useCallback(() => {
    resetInboxHome();
    footerNav.openMessages();
  }, [footerNav, resetInboxHome]);

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
            onAccountSwitched={(account) => setInboxSwitchToast(account)}
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

      {inboxSwitchToast ? (
        <InboxSwitchSuccessToast
          accountLabel={inboxSwitchToast.label?.trim() || inboxSwitchToast.email.split("@")[0] || "Account"}
          accountEmail={inboxSwitchToast.email}
          onDismiss={() => setInboxSwitchToast(null)}
        />
      ) : null}
    </>
  );
}
