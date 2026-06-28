import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { BespokeWorkspace } from "@hostnet-demo/components/demo/BespokeMailDemo";
import { api } from "../api/client";
import { GmailMailSearch } from "./GmailMailSearch";
import { useAuth } from "../context/AuthContext";
import { useAddons } from "../context/AddonContext";
import type { MailSearchState } from "../constants/mailViews";
import { VerticalBespokeMailDemoPage } from "../pages/VerticalBespokeMailDemoPage";
import { BespokeComposeBridgeProvider } from "../context/BespokeComposeBridge";
import { MailFooterNavBridgeProvider } from "../context/MailFooterNavBridge";
import { ShellMailFooterNav } from "./ShellMailFooterNav";

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

type CareerPMailShellProps = {
  children: ReactNode;
};

export function CareerPMailShell({ children }: CareerPMailShellProps) {
  const { user, logout } = useAuth();
  const { hasAddon, hasJobHunterAccess } = useAddons();
  const navigate = useNavigate();
  const [uiThemeVersion, setUiThemeVersion] = useState<"dark" | "light">(
    (user?.uiThemeVersion as "dark" | "light" | undefined) ?? "dark",
  );
  const [platformNotice, setPlatformNotice] = useState("");
  const [searchDraft, setSearchDraft] = useState<MailSearchState>({ field: "subject", query: "", scope: "all" });
  const [liveComposeSettings, setLiveComposeSettings] = useState<LiveComposeSettings | null>(null);
  const [organizationUsers, setOrganizationUsers] = useState<Array<{ id: string; email: string; displayName: string }>>(
    [],
  );

  const displayName = user?.displayName?.trim() || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.activeMailAccount?.email ?? user?.email ?? "";

  const refreshComposeSettings = useCallback(async () => {
    const response = await api.composeSettings();
    const { settings } = response;
    setLiveComposeSettings({
      autoReplyEnabled: settings.autoReplyEnabled,
      activeAutoReplyId: settings.activeAutoReplyId,
      autoReplies: settings.autoReplies,
      autoReplyEntitlement: settings.autoReplyEntitlement,
    });
  }, []);

  useEffect(() => {
    void refreshComposeSettings().catch(() => setLiveComposeSettings(null));
    void api.organizationUsers().then((response) => setOrganizationUsers(response.users));
  }, [refreshComposeSettings]);

  const onWorkspaceTabNavigate = useCallback(
    (workspace: BespokeWorkspace) => {
      if (workspace === "career") return;
      navigate("/");
    },
    [navigate],
  );

  const topbarSearch = useMemo(
    () => (
      <GmailMailSearch
        variant="icon"
        value={searchDraft}
        onChange={setSearchDraft}
        onSearch={() => navigate("/")}
        onClear={() => setSearchDraft({ field: "subject", query: "", scope: "all" })}
      />
    ),
    [navigate, searchDraft],
  );

  const renderWorkspace = useCallback(
    (workspace: BespokeWorkspace) => {
      if (workspace !== "career") return null;
      return <div className="career-pmail-workspace">{children}</div>;
    },
    [children],
  );

  return (
    <BespokeComposeBridgeProvider>
      <MailFooterNavBridgeProvider>
        <VerticalBespokeMailDemoPage
      businessVertical={user?.businessVertical ?? null}
      userName={displayName}
      userEmail={displayEmail}
      calendarEnterpriseEnabled={hasAddon("full-calendar-functionality")}
      whatsappEnabled={hasAddon("whatsapp-functionality")}
      mailToPdfEnabled={hasAddon("mail2pdf-functionality")}
      uiThemeVersion={uiThemeVersion}
      platformNotice={platformNotice}
      onThemeChange={async (theme) => {
        setUiThemeVersion(theme);
        try {
          await api.updateTheme(theme);
        } catch {
          setUiThemeVersion((user?.uiThemeVersion as "dark" | "light" | undefined) ?? "dark");
        }
      }}
      workspaceToolsGated={false}
      hideIndustryTools
      onStartAddonSubscription={(slug) => navigate(`/addons?highlight=${slug}`)}
      onLogout={() => logout()}
      onReferFriend={async () => {
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
      }}
      organizationUsers={organizationUsers}
      liveComposeSettings={liveComposeSettings}
      onAutoReplySettingsPersist={async (payload) => {
        await api.updateComposeSettings({
          autoReplyEnabled: payload.autoReplyOn,
          activeAutoReplyId: payload.activeAutoReplyId,
        });
        await refreshComposeSettings();
      }}
      onAutoReplyTemplateSave={async (payload) => {
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
      }}
      renderTopbarSearch={topbarSearch}
      renderWorkspace={renderWorkspace}
      renderMobileFooterNav={<ShellMailFooterNav uiThemeVersion={uiThemeVersion} />}
      showCareerTab={hasJobHunterAccess()}
      forcedWorkspace="career"
      onWorkspaceTabNavigate={onWorkspaceTabNavigate}
        />
      </MailFooterNavBridgeProvider>
    </BespokeComposeBridgeProvider>
  );
}
