import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { BespokeWorkspace } from "@hostnet-demo/components/demo/BespokeMailDemo";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useAddons } from "../context/AddonContext";
import { BespokeComposeBridgeProvider, useBespokeComposeBridge } from "../context/BespokeComposeBridge";
import { MailFooterNavBridgeProvider } from "../context/MailFooterNavBridge";
import { ShellMailFooterNav } from "../components/ShellMailFooterNav";
import { GmailMailSearch } from "../components/GmailMailSearch";
import { ContactSyncToast } from "../components/ContactSyncToast";
import { SecondaryMailboxToast } from "../components/SecondaryMailboxToast";
import { SignatureReminderToast } from "../components/SignatureReminderToast";
import { renderBespokeProductionWorkspace } from "../components/BespokeProductionWorkspaces";
import { useInboxContactSync } from "../hooks/useInboxContactSync";
import { useAutoMailPush } from "../hooks/useAutoMailPush";
import { useMobileTopbarChromeCollapse } from "../hooks/useMobileTopbarChromeCollapse";
import { useWorkspaceTabCounts } from "../hooks/useWorkspaceTabCounts";
import { useSecondaryMailboxNotifications } from "../hooks/useSecondaryMailboxNotifications";
import { useSignatureReminder } from "../hooks/useSignatureReminder";
import {
  isVirtualView,
  VIEW_CALENDAR,
  VIEW_CONTACTS,
  VIEW_WORKSPACE_CRM,
  VIEW_WORKSPACE_REMINDERS,
  type MailSearchState,
} from "../constants/mailViews";
import { MailPage } from "./MailPage";
import { VerticalBespokeMailDemoPage } from "./VerticalBespokeMailDemoPage";
import { shouldHideVerticalIndustryRibbon } from "../utils/verticalIndustryRibbon";

type LiveComposeSettings = {
  autoReplyEnabled: boolean;
  activeAutoReplyId: string | null;
  autoReplies: Array<{ id: string; name: string; subject: string; body: string; enabled?: boolean }>;
  autoReplyEntitlement: {
    entitled: boolean;
    gated: boolean;
    complimentaryActive: boolean;
    subscribed: boolean;
    daysLeft: number;
    complimentaryEndsAt: string | null;
    upsellDue: boolean;
  };
};

function BespokeMailShellContent() {
  const { user, logout, refresh } = useAuth();
  const { hasAddon, panelWorkspaceTrial } = useAddons();
  const { openCompose } = useBespokeComposeBridge();
  const navigate = useNavigate();
  const [uiThemeVersion, setUiThemeVersion] = useState<"dark" | "light">(
    (user?.uiThemeVersion as "dark" | "light" | undefined) ?? "dark",
  );
  const [platformNotice, setPlatformNotice] = useState("");
  const [requestedWorkspace, setRequestedWorkspace] = useState<BespokeWorkspace | null>(null);
  const [searchDraft, setSearchDraft] = useState<MailSearchState>({ field: "subject", query: "", scope: "all" });
  const [appliedSearch, setAppliedSearch] = useState<MailSearchState>({ field: "subject", query: "", scope: "all" });
  const [liveComposeSettings, setLiveComposeSettings] = useState<LiveComposeSettings | null>(null);
  const [viewerAvatarUrl, setViewerAvatarUrl] = useState<string | null>(null);
  const [organizationUsers, setOrganizationUsers] = useState<Array<{ id: string; email: string; displayName: string }>>(
    [],
  );
  const [mailWorkspaceView, setMailWorkspaceView] = useState<string | null>(null);
  const [mailFolderRequest, setMailFolderRequest] = useState<string | null | undefined>(undefined);
  const [contactSyncNotice, setContactSyncNotice] = useState<number | null>(null);
  const [careerNavUnlocked, setCareerNavUnlocked] = useState(false);
  const [mobileTopbarSearchCollapsed, setMobileTopbarSearchCollapsed] = useState(false);

  useMobileTopbarChromeCollapse(setMobileTopbarSearchCollapsed);

  const openAddonsMarketplace = useCallback(() => {
    setMobileTopbarSearchCollapsed(false);
    window.location.assign("/addons");
  }, []);

  const mailWorkspaceViews = useMemo(
    () => ({
      contacts: VIEW_CONTACTS,
      crm: VIEW_WORKSPACE_CRM,
      reminders: VIEW_WORKSPACE_REMINDERS,
      calendar: VIEW_CALENDAR,
    }),
    [],
  );

  const displayName = user?.displayName?.trim() || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.activeMailAccount?.email ?? user?.email ?? "";

  const workspaceTabCounts = useWorkspaceTabCounts(Boolean(user), displayEmail, organizationUsers);

  const signatureReminder = useSignatureReminder({
    onOpenBrandSettings: () => setRequestedWorkspace("settings"),
  });

  useInboxContactSync({
    enabled: Boolean(user),
    onNewContacts: (addedCount) => setContactSyncNotice(addedCount),
  });

  useAutoMailPush(user?.id);

  const secondaryMailbox = useSecondaryMailboxNotifications(Boolean(user));

  const navigateMailWorkspaceView = useCallback((view: string | null) => {
    setMailWorkspaceView(view);
    setMailFolderRequest(view);
  }, []);

  useEffect(() => {
    void api
      .getJobHunterSettings()
      .then((res) => setCareerNavUnlocked(res.settings.careerNavUnlocked))
      .catch(() => setCareerNavUnlocked(false));
  }, [user?.id]);

  const refreshComposeSettings = useCallback(async () => {
    const response = await api.composeSettings();
    const { settings } = response;
    setLiveComposeSettings({
      autoReplyEnabled: settings.autoReplyEnabled,
      activeAutoReplyId: settings.activeAutoReplyId,
      autoReplies: settings.autoReplies,
      autoReplyEntitlement: settings.autoReplyEntitlement,
    });
    const activeSignature = settings.signatures.find((signature) => signature.id === settings.activeSignatureId);
    setViewerAvatarUrl(activeSignature?.avatarUrl ?? null);
    await signatureReminder.evaluate();
  }, [signatureReminder.evaluate]);

  useEffect(() => {
    void refreshComposeSettings().catch(() => setLiveComposeSettings(null));
    void api.organizationUsers().then((response) => setOrganizationUsers(response.users));
  }, [refreshComposeSettings]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const switchMailbox = params.get("switchMailbox");
    if (!switchMailbox || !user) return;
    void api
      .activateMailAccount(switchMailbox)
      .then(() => refresh())
      .finally(() => {
        params.delete("switchMailbox");
        const next = params.toString();
        navigate(next ? `/?${next}` : "/", { replace: true });
      });
  }, [user?.id, navigate, refresh]);

  const onWorkspaceMessage = useCallback(
    (message: string) => {
      setPlatformNotice(message);
      void signatureReminder.evaluate();
    },
    [signatureReminder.evaluate],
  );

  useEffect(() => {
    if (!platformNotice) return;
    const timer = window.setTimeout(() => setPlatformNotice(""), 5000);
    return () => window.clearTimeout(timer);
  }, [platformNotice]);

  const onReferFriend = async () => {
    try {
      const result = await api.referralInvite();
      const message = result.rewardToast ?? result.message ?? "Referral invite sent.";
      setPlatformNotice(message);
      return { rewardToast: result.rewardToast ?? null, message };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Referral failed";
      setPlatformNotice(message);
      return { rewardToast: null, message };
    }
  };

  const onThemeChange = async (theme: "dark" | "light") => {
    setUiThemeVersion(theme);
    try {
      await api.updateTheme(theme);
    } catch {
      setUiThemeVersion((user?.uiThemeVersion as "dark" | "light" | undefined) ?? "dark");
    }
  };

  const onMailToPdfExport = async (payload: {
    subject: string;
    from: string;
    to: string;
    date?: string;
    body: string;
    cc?: string;
    attachments?: string[];
  }) => {
    if (!hasAddon("mail2pdf-functionality")) {
      navigate("/addons?highlight=mail2pdf-functionality");
      return;
    }
    const blob = await api.mail2pdf(payload);
    const url = URL.createObjectURL(blob.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = blob.filename;
    anchor.click();
    URL.revokeObjectURL(url);
    setPlatformNotice("PDF exported");
  };

  const onWhatsappSend = async (payload: { toPhone: string; body: string; subject?: string }) => {
    if (!hasAddon("whatsapp-functionality")) {
      navigate("/addons?highlight=whatsapp-functionality");
      return;
    }
    await api.sendWhatsapp({
      toPhone: payload.toPhone,
      subject: payload.subject,
      body: payload.body,
    });
    setPlatformNotice("WhatsApp message queued");
  };

  const onAutoReplySettingsPersist = async (payload: { autoReplyOn: boolean; activeAutoReplyId: string }) => {
    await api.updateComposeSettings({
      autoReplyEnabled: payload.autoReplyOn,
      activeAutoReplyId: payload.activeAutoReplyId,
    });
    await refreshComposeSettings();
  };

  const onAutoReplyTemplateSave = async (payload: {
    mode: "create" | "update";
    id?: string;
    name: string;
    subject: string;
    body: string;
  }) => {
    if (payload.mode === "create") {
      const created = await api.createAutoReply({
        name: payload.name,
        subject: payload.subject,
        body: payload.body,
      });
      await refreshComposeSettings();
      const autoReply = created.autoReply as { id?: string } | undefined;
      return { id: autoReply?.id };
    }

    if (payload.id) {
      await api.updateAutoReply(payload.id, {
        name: payload.name,
        subject: payload.subject,
        body: payload.body,
      });
      await refreshComposeSettings();
      return { id: payload.id };
    }

    return undefined;
  };

  const onApplyComposeTemplate = useCallback(
    (template: { subject: string; html: string; label?: string }) => {
      openCompose({ mode: "new", subject: template.subject, html: template.html });
      setPlatformNotice(
        template.label ? `"${template.label}" loaded into compose.` : "Template loaded into compose.",
      );
    },
    [openCompose],
  );

  const renderWorkspace = useCallback(
    (workspace: BespokeWorkspace) =>
      renderBespokeProductionWorkspace(workspace, {
        hasAddon,
        panelWorkspaceTrial,
        onWorkspaceMessage,
      }),
    [hasAddon, panelWorkspaceTrial, onWorkspaceMessage],
  );

  const topbarSearch = useMemo(
    () => (
      <GmailMailSearch
        variant="icon"
        value={searchDraft}
        onChange={setSearchDraft}
        onSearch={() => {
          setAppliedSearch(searchDraft);
        }}
        onClear={() => {
          const empty = { field: "subject" as const, query: "", scope: "all" as const };
          setSearchDraft(empty);
          setAppliedSearch(empty);
        }}
      />
    ),
    [searchDraft],
  );

  const inboxWorkspace = useMemo(
    () => (
      <MailPage
        embedded
        shellThemeVersion={uiThemeVersion}
        searchDraft={searchDraft}
        onSearchDraftChange={setSearchDraft}
        appliedSearch={appliedSearch}
        onAppliedSearchChange={setAppliedSearch}
        requestedFolder={mailFolderRequest}
        onRequestedFolderHandled={() => setMailFolderRequest(undefined)}
        onActiveFolderChange={(folder) => {
          if (isVirtualView(folder)) {
            setMailWorkspaceView(folder);
            return;
          }
          setMailWorkspaceView(null);
        }}
        onCareerNavUnlockedChange={setCareerNavUnlocked}
        onEmbeddedShellActivate={() => setRequestedWorkspace("inbox")}
      />
    ),
    [searchDraft, appliedSearch, uiThemeVersion, mailFolderRequest],
  );

  const mobileFooterNav = useMemo(
    () => (
      <ShellMailFooterNav
        uiThemeVersion={uiThemeVersion}
        onActivateInbox={() => setRequestedWorkspace("inbox")}
      />
    ),
    [uiThemeVersion],
  );

  return (
    <>
      <VerticalBespokeMailDemoPage
        businessVertical={user?.businessVertical ?? null}
        userName={displayName}
        userEmail={displayEmail}
        viewerAvatarUrl={viewerAvatarUrl}
        calendarEnterpriseEnabled={hasAddon("full-calendar-functionality")}
        whatsappEnabled={hasAddon("whatsapp-functionality")}
        mailToPdfEnabled={hasAddon("mail2pdf-functionality")}
        uiThemeVersion={uiThemeVersion}
        platformNotice={platformNotice}
        onThemeChange={onThemeChange}
        hideIndustryTools={shouldHideVerticalIndustryRibbon(user?.businessVertical, hasAddon)}
        workspaceToolsGated={false}
        onStartAddonSubscription={(slug) => navigate(`/addons?highlight=${slug}`)}
        onLogout={() => logout()}
        onReferFriend={onReferFriend}
        organizationUsers={organizationUsers}
        liveComposeSettings={liveComposeSettings}
        onAutoReplySettingsPersist={onAutoReplySettingsPersist}
        onAutoReplyTemplateSave={onAutoReplyTemplateSave}
        onMailToPdfExport={onMailToPdfExport}
        onWhatsappSend={onWhatsappSend}
        onApplyComposeTemplate={onApplyComposeTemplate}
        renderTopbarSearch={topbarSearch}
        renderInboxWorkspace={inboxWorkspace}
        renderWorkspace={renderWorkspace}
        mailWorkspaceViews={mailWorkspaceViews}
        activeMailWorkspaceView={mailWorkspaceView}
        onMailWorkspaceView={navigateMailWorkspaceView}
        mobileTopbarSearchCollapsed={mobileTopbarSearchCollapsed}
        workspaceTabCounts={workspaceTabCounts}
        renderMobileFooterNav={mobileFooterNav}
        onOpenAddons={openAddonsMarketplace}
        showCareerTab={careerNavUnlocked}
        onCareerTabClick={() => navigate("/career")}
        requestedWorkspace={requestedWorkspace}
        onRequestedWorkspaceHandled={() => setRequestedWorkspace(null)}
      />
      {signatureReminder.visible ? (
        <SignatureReminderToast
          onOpenBrandSettings={signatureReminder.openBrandSettings}
          onDismiss={signatureReminder.dismiss}
          onDontAskAgain={signatureReminder.dontAskAgain}
        />
      ) : null}
      {contactSyncNotice ? (
        <ContactSyncToast
          addedCount={contactSyncNotice}
          onViewContacts={() => {
            setContactSyncNotice(null);
            navigateMailWorkspaceView(VIEW_CONTACTS);
          }}
          onDismiss={() => setContactSyncNotice(null)}
        />
      ) : null}
      {secondaryMailbox.notice ? (
        <SecondaryMailboxToast
          notice={secondaryMailbox.notice}
          onDismiss={secondaryMailbox.dismiss}
          onSwitch={() => {
            void api.activateMailAccount(secondaryMailbox.notice!.accountId).then(async () => {
              await refresh();
              navigateMailWorkspaceView(null);
              secondaryMailbox.acknowledgeAccount(secondaryMailbox.notice!.accountId);
            });
          }}
        />
      ) : null}
    </>
  );
}

/**
 * Stop 2 shell with live IMAP mail, workspace panels, and production feature wiring.
 */
export function BespokeMailShellPage() {
  return (
    <BespokeComposeBridgeProvider>
      <MailFooterNavBridgeProvider>
        <BespokeMailShellContent />
      </MailFooterNavBridgeProvider>
    </BespokeComposeBridgeProvider>
  );
}
