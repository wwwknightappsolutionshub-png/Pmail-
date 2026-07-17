import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, forwardRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useAddons } from "../context/AddonContext";
import {
  defaultMailConfig,
  emptyMailConfig,
  isHostingerForcedEmailDomain,
  providerPresetDisplayLabel,
  resolveHostingerForcedDomainMailConfig,
  resolveMailConfigFromPreset,
  resolveProviderPresetFromEmail,
  type MailConfigValues,
  type MailProviderPresetKey,
} from "../constants/mailProviders";
import { formatMailConnectError } from "../utils/mailConnectErrors";
import { ProviderPresetPicker } from "./ProviderPresetPicker";
import { Mails } from "lucide-react";
import { PmailLoadingScreen } from "./PmailLoadingScreen";
import { GmailConnectWizard } from "./GmailConnectWizard";
import "./InboxSwitcher.css";
import "./MailBottomNavButton.css";
import "./ProviderPresetPicker.css";
import "./LoginProviderCorrector.css";

export type MailAccountSummary = {
  id: string;
  email: string;
  label: string | null;
  isPrimary: boolean;
  isActive: boolean;
  unread?: number;
};

export type InboxSwitcherHandle = {
  openWithAddForm: () => void;
  openPanel: () => void;
};

interface InboxSwitcherProps {
  activeAccount: MailAccountSummary | null;
  onSwitched: () => void;
  variant?: "sidebar" | "header" | "bottom-nav";
  themeVersion?: "dark" | "light";
  onPaidAddonGate?: () => void;
  onAccountCountChange?: (count: number) => void;
  onAccountConnected?: () => void;
  onAccountConnectFailed?: () => void;
  onAccountSwitched?: (account: MailAccountSummary) => void;
}

export const InboxSwitcher = forwardRef<InboxSwitcherHandle, InboxSwitcherProps>(function InboxSwitcher(
  {
    activeAccount,
    onSwitched,
    variant = "sidebar",
    themeVersion = "light",
    onPaidAddonGate,
    onAccountCountChange,
    onAccountConnected,
    onAccountConnectFailed,
    onAccountSwitched,
  },
  ref,
) {
  const { user, setUser } = useAuth();
  const { hasAddon } = useAddons();
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<MailAccountSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [form, setForm] = useState<MailConfigValues & { email: string; password: string; label: string }>({
    email: "",
    password: "",
    label: "",
    ...defaultMailConfig(),
  });
  const [showProviderCorrector, setShowProviderCorrector] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [unreadByAccountId, setUnreadByAccountId] = useState<Record<string, number>>({});

  const entitled = hasAddon("multi-inbox-functionality");
  const isHeader = variant === "header";
  const isBottomNav = variant === "bottom-nav";
  const isGoogleProvider = form.providerPreset === "google";

  const loadAccounts = useCallback(async () => {
    if (!entitled) return;
    setLoading(true);
    setError("");
    try {
      const result = await api.listMailAccounts();
      setAccounts(result.accounts);
      onAccountCountChange?.(result.accounts.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load mail accounts");
    } finally {
      setLoading(false);
    }
  }, [entitled, onAccountCountChange]);

  useEffect(() => {
    if (!entitled) return;
    const loadUnread = async () => {
      try {
        const summary = await api.mailAccountsUnreadSummary();
        const next: Record<string, number> = {};
        for (const row of summary.accounts) {
          next[row.id] = row.unread;
        }
        setUnreadByAccountId(next);
      } catch {
        setUnreadByAccountId({});
      }
    };
    void loadUnread();
    const timer = window.setInterval(() => {
      void loadUnread();
    }, 45_000);
    return () => window.clearInterval(timer);
  }, [entitled, accounts.length]);

  useImperativeHandle(
    ref,
    () => ({
      openWithAddForm: () => {
        if (!entitled) {
          onPaidAddonGate?.();
          return;
        }
        setOpen(true);
        setShowAddForm(true);
      },
      openPanel: () => {
        if (!entitled) {
          onPaidAddonGate?.();
          return;
        }
        setOpen(true);
      },
    }),
    [entitled, onPaidAddonGate],
  );

  useEffect(() => {
    if (entitled) {
      void loadAccounts();
    }
  }, [entitled, loadAccounts]);

  useEffect(() => {
    if (open && entitled) {
      void loadAccounts();
    }
  }, [open, entitled, loadAccounts]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setShowAddForm(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || (!isHeader && !isBottomNav) || !triggerRef.current) {
      setPanelStyle({});
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      if (isBottomNav) {
        const panelWidth = Math.min(22 * 16, window.innerWidth - 24);
        setPanelStyle({
          position: "fixed",
          bottom: "calc(var(--mail-bottom-nav-h, 2.75rem) + env(safe-area-inset-bottom) + 0.5rem)",
          left: "50%",
          transform: "translateX(-50%)",
          width: panelWidth,
          zIndex: 1500,
        });
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const panelWidth = Math.min(Math.max(20 * 16, rect.width + 48), window.innerWidth - 24);
      const left = Math.min(Math.max(12, rect.right - panelWidth), window.innerWidth - panelWidth - 12);
      setPanelStyle({
        position: "fixed",
        top: rect.bottom + 6,
        left,
        width: panelWidth,
        zIndex: 1500,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, isHeader, isBottomNav, showAddForm, accounts.length, loading]);

  const displayEmail = activeAccount?.email ?? "Primary mailbox";
  const hasMultipleAccounts = accounts.length > 1;
  const inactiveUnreadTotal = accounts.reduce((sum, account) => {
    if (account.isActive) return sum;
    return sum + (unreadByAccountId[account.id] ?? 0);
  }, 0);

  const handleTriggerClick = () => {
    if (!entitled) {
      onPaidAddonGate?.();
      if (isBottomNav) triggerRef.current?.blur();
      return;
    }
    if (!hasMultipleAccounts && accounts.length <= 1) {
      setOpen(true);
      setShowAddForm(true);
      if (isBottomNav) triggerRef.current?.blur();
      return;
    }
    setOpen((value) => !value);
    if (isBottomNav) triggerRef.current?.blur();
  };

  const handleSwitch = async (accountId: string) => {
    if (accountId === activeAccount?.id) {
      setOpen(false);
      return;
    }
    const targetAccount = accounts.find((account) => account.id === accountId);
    if (!targetAccount) return;

    setSwitchingId(accountId);
    setError("");
    let switchedAccount: MailAccountSummary | null = null;
    try {
      const result = await api.activateMailAccount(accountId);
      const active =
        result.accounts.find((account) => account.id === result.activeMailAccountId) ??
        targetAccount;
      setAccounts(
        result.accounts.map((account) => ({
          ...account,
          isActive: account.id === result.activeMailAccountId,
        })),
      );
      if (user) {
        setUser({
          ...user,
          activeMailAccount: active,
          mailAccountCount: result.accounts.length,
        });
      }
      switchedAccount = { ...active, isActive: true };
      setOpen(false);
      // Drop the blocking overlay as soon as the session is switched; MailPage loads inbox next.
      setSwitchingId(null);
      void onSwitched();
      onAccountSwitched?.(switchedAccount);
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch mailbox");
    } finally {
      setSwitchingId(null);
    }
  };

  const handleAddAccount = async () => {
    if (!form.email.trim() || !form.password.trim()) {
      setError("Email and password are required.");
      return;
    }
    if (form.providerPreset === "custom") {
      if (!form.imapHost.trim()) {
        setError("Enter your incoming mail server (IMAP).");
        return;
      }
      if (!form.smtpHost.trim()) {
        setError("Enter your outgoing mail server (SMTP).");
        return;
      }
    }
    setAdding(true);
    setError("");
    try {
      await api.createMailAccount({
        email: form.email.trim(),
        password: form.password,
        label: form.label.trim() || undefined,
        providerPreset: form.providerPreset,
        imapHost: form.imapHost,
        imapPort: form.imapPort,
        imapSecure: form.imapSecure,
        smtpHost: form.smtpHost,
        smtpPort: form.smtpPort,
        smtpSecure: form.smtpSecure,
      });
      setForm({ email: "", password: "", label: "", ...defaultMailConfig() });
      setShowAddForm(false);
      setOpen(false);
      await loadAccounts();
      onAccountConnected?.();
    } catch (err) {
      setError(formatMailConnectError(err));
      onAccountConnectFailed?.();
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (accountId: string) => {
    setError("");
    try {
      await api.deleteMailAccount(accountId);
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove mailbox");
    }
  };

  if (!entitled && !isHeader && !isBottomNav) {
    return null;
  }

  const mailboxTooltip = isBottomNav ? `Switcher: ${displayEmail}` : undefined;

  return (
    <>
    <div className={`inbox-switcher inbox-switcher--${variant}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`inbox-switcher-trigger${isHeader ? " inbox-switcher-trigger--header" : ""}${
          isBottomNav ? " inbox-switcher-trigger--bottom-nav" : ""
        }`}
        onClick={handleTriggerClick}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={isBottomNav ? mailboxTooltip : undefined}
        title={mailboxTooltip}
        data-tooltip={isBottomNav ? "Switcher" : undefined}
      >
        {isBottomNav ? (
          <>
            <Mails className="mail-bottom-nav-icon" strokeWidth={2} aria-hidden />
            <span className="mail-bottom-nav-label">Switcher</span>
            {inactiveUnreadTotal > 0 ? (
              <span className="inbox-switcher-unread-badge" aria-label={`${inactiveUnreadTotal} unread in other mailboxes`}>
                {inactiveUnreadTotal > 99 ? "99+" : inactiveUnreadTotal}
              </span>
            ) : null}
          </>
        ) : isHeader ? (
          <>
            <span className="inbox-switcher-header-label">Mailboxes</span>
            <span className="inbox-switcher-header-email">{displayEmail}</span>
            <span className="inbox-switcher-header-chevron" aria-hidden="true">
              {open ? "▴" : "▾"}
            </span>
          </>
        ) : (
          <>
            <span className="inbox-switcher-kicker">Active mailbox</span>
            <span className="inbox-switcher-email">{displayEmail}</span>
          </>
        )}
      </button>
      {open && entitled ? (
        <div
          className={`inbox-switcher-panel${
            themeVersion === "light" ? " inbox-switcher-panel--light" : ""
          }${
            isHeader || isBottomNav ? " inbox-switcher-panel--header inbox-switcher-panel--fixed" : ""
          }${isBottomNav ? " inbox-switcher-panel--bottom-nav" : ""}`}
          style={isHeader || isBottomNav ? panelStyle : undefined}
        >
          {loading ? <p className="inbox-switcher-muted">Loading accounts…</p> : null}
          {error ? <p className="inbox-switcher-error">{error}</p> : null}
          <ul className="inbox-switcher-list">
            {accounts.map((account) => (
              <li key={account.id} className={account.isActive ? "is-active" : ""}>
                <button
                  type="button"
                  className="inbox-switcher-item"
                  disabled={switchingId === account.id}
                  onClick={() => void handleSwitch(account.id)}
                >
                  <strong>{account.label || account.email}</strong>
                  <span>{account.email}</span>
                  {account.isPrimary ? <em>Primary</em> : null}
                  {(unreadByAccountId[account.id] ?? 0) > 0 ? (
                    <span className="inbox-switcher-item-unread">{unreadByAccountId[account.id]}</span>
                  ) : null}
                </button>
                {!account.isPrimary ? (
                  <button
                    type="button"
                    className="inbox-switcher-remove"
                    onClick={() => void handleRemove(account.id)}
                    aria-label={`Remove ${account.email}`}
                  >
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {showAddForm ? (
            <div className="inbox-switcher-form">
              <p className="inbox-switcher-form-intro">
                Enter the login details for your other account. PMail+ will pull in the mailboxes and group incoming mail
                by sender.
              </p>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => {
                    const nextEmail = e.target.value;
                    const normalized = nextEmail.trim().toLowerCase();
                    setShowProviderCorrector(false);
                    if (!normalized.includes("@")) {
                      setForm((prev) => ({
                        ...prev,
                        email: nextEmail,
                        ...emptyMailConfig(),
                        providerPreset: defaultMailConfig().providerPreset,
                      }));
                      return;
                    }
                    if (isHostingerForcedEmailDomain(normalized)) {
                      setForm((prev) => ({
                        ...prev,
                        email: nextEmail,
                        ...resolveHostingerForcedDomainMailConfig(),
                      }));
                      return;
                    }
                    const resolved = resolveProviderPresetFromEmail(normalized);
                    setForm((prev) => ({
                      ...prev,
                      email: nextEmail,
                      ...(resolved ? resolveMailConfigFromPreset(resolved) : {}),
                    }));
                  }}
                />
              </label>
              <label>
                <span>{isGoogleProvider ? "Google App Password (16 characters)" : "Password"}</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder={
                    isGoogleProvider
                      ? "Paste your 16-character Google App Password"
                      : undefined
                  }
                />
              </label>
              {isGoogleProvider ? (
                <p className="inbox-switcher-provider-hint">
                  Use the special password for PMail+ from Google — not your normal Gmail password.
                </p>
              ) : null}
              <label>
                <span>Label (optional)</span>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                />
              </label>
              <div className="inbox-switcher-detected-provider" aria-label="Detected mail provider">
                <span className="inbox-switcher-detected-label">Detected provider</span>
                <p className="inbox-switcher-detected-value">
                  Detected: <strong>{providerPresetDisplayLabel(form.providerPreset)}</strong>
                </p>
                {!isHostingerForcedEmailDomain(form.email) ? (
                  <button
                    type="button"
                    className="inbox-switcher-correct-provider"
                    onClick={() => setShowProviderCorrector(true)}
                  >
                    Wrong provider? Tell us who hosts your email
                  </button>
                ) : null}
              </div>
              {showProviderCorrector ? (
                <div
                  className="login-provider-corrector-overlay inbox-switcher-corrector-overlay"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="inbox-switcher-provider-corrector-title"
                >
                  <div className="login-provider-corrector">
                    <div className="login-provider-corrector-copy">
                      <strong id="inbox-switcher-provider-corrector-title">
                        WHO IS YOUR CURRENT EMAIL PROVIDER?
                      </strong>
                      <p className="login-provider-corrector-subtitle">
                        Confirm or correct the service that hosts this mailbox.
                      </p>
                    </div>
                    <ProviderPresetPicker
                      value={form.providerPreset}
                      onChange={(preset: MailProviderPresetKey) => {
                        setShowProviderCorrector(false);
                        setForm((prev) => ({
                          ...prev,
                          ...resolveMailConfigFromPreset(preset, preset === "custom" ? prev : undefined),
                        }));
                      }}
                      idPrefix="inbox-switcher-corrector"
                    />
                    <div className="login-provider-corrector-actions">
                      <button
                        type="button"
                        className="login-provider-corrector-dismiss"
                        onClick={() => setShowProviderCorrector(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              {form.providerPreset === "custom" ? (
                <div className="inbox-switcher-custom-fields" aria-label="Custom mail server settings">
                  <p className="inbox-switcher-custom-intro">
                    Enter the IMAP and SMTP details from your hosting panel or mail provider.
                  </p>
                  <div className="inbox-switcher-custom-grid">
                    <label>
                      <span>Incoming server (IMAP)</span>
                      <input
                        value={form.imapHost}
                        onChange={(e) => setForm((prev) => ({ ...prev, imapHost: e.target.value }))}
                        placeholder="e.g. mail.yourdomain.com"
                        required
                        autoComplete="off"
                      />
                    </label>
                    <label>
                      <span>IMAP port</span>
                      <input
                        type="number"
                        value={form.imapPort}
                        onChange={(e) => setForm((prev) => ({ ...prev, imapPort: Number(e.target.value) }))}
                        placeholder="993"
                        required
                      />
                    </label>
                    <label>
                      <span>Outgoing server (SMTP)</span>
                      <input
                        value={form.smtpHost}
                        onChange={(e) => setForm((prev) => ({ ...prev, smtpHost: e.target.value }))}
                        placeholder="e.g. mail.yourdomain.com"
                        required
                        autoComplete="off"
                      />
                    </label>
                    <label>
                      <span>SMTP port</span>
                      <input
                        type="number"
                        value={form.smtpPort}
                        onChange={(e) => setForm((prev) => ({ ...prev, smtpPort: Number(e.target.value) }))}
                        placeholder="465"
                        required
                      />
                    </label>
                  </div>
                  <div className="inbox-switcher-check-group">
                    <label className="inbox-switcher-check-row">
                      <input
                        type="checkbox"
                        checked={form.imapSecure}
                        onChange={(e) => setForm((prev) => ({ ...prev, imapSecure: e.target.checked }))}
                      />
                      <span>Incoming SSL/TLS (port 993)</span>
                    </label>
                    <label className="inbox-switcher-check-row">
                      <input
                        type="checkbox"
                        checked={form.smtpSecure}
                        onChange={(e) => setForm((prev) => ({ ...prev, smtpSecure: e.target.checked }))}
                      />
                      <span>Outgoing SSL/TLS (port 465)</span>
                    </label>
                  </div>
                </div>
              ) : null}
              {isGoogleProvider ? (
                <div className="inbox-switcher-gmail-help" aria-label="Gmail setup help">
                  <GmailConnectWizard key={form.providerPreset} />
                </div>
              ) : null}
              <div className="inbox-switcher-form-actions">
                <button type="button" className="mail-toolbar-btn" disabled={adding} onClick={() => void handleAddAccount()}>
                  {adding ? "Connecting…" : "Connect mailbox"}
                </button>
                <button type="button" className="ghost-btn" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="mail-toolbar-btn inbox-switcher-add" onClick={() => setShowAddForm(true)}>
              Add mailbox
            </button>
          )}
        </div>
      ) : null}
    </div>
    {switchingId
      ? createPortal(
          <PmailLoadingScreen
            className="pmail-loading-screen--overlay"
            heading="Switching your mailbox"
            subtitle="PMail+"
          />,
          document.body,
        )
      : null}
    </>
  );
});
