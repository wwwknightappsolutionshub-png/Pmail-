import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, forwardRef, type CSSProperties } from "react";
import { api } from "../api/client";
import { useAddons } from "../context/AddonContext";
import {
  defaultMailConfig,
  resolveMailConfigFromPreset,
  type MailConfigValues,
} from "../constants/mailProviders";
import { ProviderPresetPicker } from "./ProviderPresetPicker";
import { Mails } from "lucide-react";
import "./InboxSwitcher.css";
import "./MailBottomNavButton.css";

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
  onPaidAddonGate?: () => void;
  onAccountCountChange?: (count: number) => void;
}

export const InboxSwitcher = forwardRef<InboxSwitcherHandle, InboxSwitcherProps>(function InboxSwitcher(
  {
    activeAccount,
    onSwitched,
    variant = "sidebar",
    onPaidAddonGate,
    onAccountCountChange,
  },
  ref,
) {
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
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [unreadByAccountId, setUnreadByAccountId] = useState<Record<string, number>>({});

  const entitled = hasAddon("multi-inbox-functionality");
  const isHeader = variant === "header";
  const isBottomNav = variant === "bottom-nav";

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
      return;
    }
    if (!hasMultipleAccounts && accounts.length <= 1) {
      setOpen(true);
      setShowAddForm(true);
      return;
    }
    setOpen((value) => !value);
  };

  const handleSwitch = async (accountId: string) => {
    if (accountId === activeAccount?.id) {
      setOpen(false);
      return;
    }
    setSwitchingId(accountId);
    setError("");
    try {
      await api.activateMailAccount(accountId);
      setOpen(false);
      onSwitched();
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
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add mailbox");
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

  const mailboxTooltip = isBottomNav ? `Mailboxes: ${displayEmail}` : undefined;

  return (
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
        data-tooltip={isBottomNav ? "Mailboxes" : undefined}
      >
        {isBottomNav ? (
          <>
            <Mails className="mail-bottom-nav-icon" strokeWidth={2} aria-hidden />
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
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                />
              </label>
              <label>
                <span>Label (optional)</span>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                />
              </label>
              <ProviderPresetPicker
                value={form.providerPreset}
                onChange={(preset) => setForm((prev) => ({ ...prev, ...resolveMailConfigFromPreset(preset) }))}
                idPrefix="inbox-switcher"
              />
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
  );
});
