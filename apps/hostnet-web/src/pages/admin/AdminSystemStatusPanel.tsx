import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { AdminPollSnapshot, AdminSystemStatus, PmailPlatformConfig } from "../../types/site";
import "./AdminDashboard.css";

type Props = {
  poll?: AdminPollSnapshot | null;
  isSuperAdmin?: boolean;
};

export function AdminSystemStatusPanel({ poll, isSuperAdmin = false }: Props) {
  const [status, setStatus] = useState<AdminSystemStatus | null>(null);
  const [pushConfig, setPushConfig] = useState<PmailPlatformConfig | null>(null);
  const [pushStats, setPushStats] = useState<{
    pushEnabledUsers: number;
    subscribedUsers: number;
    deviceSubscriptions: number;
    vapidConfigured: boolean;
  } | null>(null);
  const [pushSaving, setPushSaving] = useState(false);
  const [pushBroadcasting, setPushBroadcasting] = useState(false);
  const [pushBroadcastTitle, setPushBroadcastTitle] = useState("PMail+");
  const [pushBroadcastBody, setPushBroadcastBody] = useState("");
  const [pushBroadcastResult, setPushBroadcastResult] = useState("");
  const [pushError, setPushError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await api.adminSystemStatus();
      setStatus(data);
      if (isSuperAdmin) {
        const [{ config }, stats] = await Promise.all([
          api.adminPmailPlatformConfig(),
          api.adminPmailPushStats(),
        ]);
        setPushConfig(config);
        setPushStats(stats);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [isSuperAdmin]);

  useEffect(() => {
    if (poll) void load();
  }, [poll?.polledAt, isSuperAdmin]);

  async function updatePushConfig(patch: Partial<Pick<PmailPlatformConfig, "mailPushEnabled" | "mailPushDefaultForUsers" | "pwaPushAutoSubscribe">>) {
    if (!pushConfig) return;
    setPushSaving(true);
    setPushError("");
    try {
      const { config } = await api.updateAdminPmailPlatformConfig(patch);
      setPushConfig(config);
      const data = await api.adminSystemStatus();
      setStatus(data);
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "Failed to update push settings");
    } finally {
      setPushSaving(false);
    }
  }

  async function sendPushBroadcast() {
    if (!pushBroadcastBody.trim()) {
      setPushError("Enter a message body for the push notification.");
      return;
    }

    setPushBroadcasting(true);
    setPushError("");
    setPushBroadcastResult("");
    try {
      const result = await api.broadcastAdminPmailPush({
        title: pushBroadcastTitle.trim() || "PMail+",
        body: pushBroadcastBody.trim(),
        url: "/",
      });
      setPushBroadcastResult(
        `Sent to ${result.delivered} device(s) across ${result.targetedUsers} user(s) with push enabled.`,
      );
      setPushBroadcastBody("");
      const stats = await api.adminPmailPushStats();
      setPushStats(stats);
    } catch (err) {
      setPushError(err instanceof Error ? err.message : "Failed to send push broadcast");
    } finally {
      setPushBroadcasting(false);
    }
  }

  if (loading && !status) return <p className="muted">Loading system status…</p>;
  if (!status) return <div className="admin-alert admin-alert-error">Failed to load system status.</div>;

  const checks = Object.entries(status.readiness.checks);
  const push = status.push ?? {
    vapidConfigured: false,
    mailPushEnabled: true,
    mailPushDefaultForUsers: true,
    pwaPushAutoSubscribe: true,
  };

  return (
    <div className="admin-status-grid">
      <section className="card admin-status-hero">
        <div className={`admin-status-pill ${status.readiness.status}`}>
          <span className="admin-health-dot" />
          {status.readiness.status === "ready" ? "Platform ready" : "Platform degraded"}
        </div>
        <p className="muted">
          API uptime {Math.floor(status.readiness.uptimeSeconds / 3600)}h · Polled every 30s
          {poll ? ` · Last ${new Date(poll.polledAt).toLocaleTimeString()}` : ""}
        </p>
      </section>

      <section className="card">
        <h3>PMail+ push notifications</h3>
        <dl className="admin-status-dl">
          <div><dt>VAPID keys</dt><dd>{push.vapidConfigured ? "Configured" : "Not configured"}</dd></div>
          <div><dt>Platform mail push</dt><dd>{push.mailPushEnabled ? "Enabled" : "Disabled"}</dd></div>
          <div><dt>Default for users</dt><dd>{push.mailPushDefaultForUsers ? "On" : "Off"}</dd></div>
          <div><dt>PWA auto-subscribe</dt><dd>{push.pwaPushAutoSubscribe ? "On" : "Off"}</dd></div>
          {pushStats ? (
            <>
              <div><dt>Users with push on</dt><dd>{pushStats.pushEnabledUsers}</dd></div>
              <div><dt>Users with devices</dt><dd>{pushStats.subscribedUsers}</dd></div>
              <div><dt>Device subscriptions</dt><dd>{pushStats.deviceSubscriptions}</dd></div>
            </>
          ) : null}
        </dl>
        {!push.vapidConfigured ? (
          <p className="muted" style={{ marginTop: "0.75rem" }}>
            Set <code className="admin-status-mono">VAPID_PUBLIC_KEY</code> and{" "}
            <code className="admin-status-mono">VAPID_PRIVATE_KEY</code> in the API environment to deliver push notifications.
          </p>
        ) : null}
        {isSuperAdmin && pushConfig ? (
          <div className="admin-status-push-controls">
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={pushConfig.mailPushEnabled}
                disabled={pushSaving}
                onChange={(e) => void updatePushConfig({ mailPushEnabled: e.target.checked })}
              />
              Enable mail push platform-wide
            </label>
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={pushConfig.mailPushDefaultForUsers}
                disabled={pushSaving || !pushConfig.mailPushEnabled}
                onChange={(e) => void updatePushConfig({ mailPushDefaultForUsers: e.target.checked })}
              />
              Default mail push on for all users
            </label>
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={pushConfig.pwaPushAutoSubscribe}
                disabled={pushSaving || !pushConfig.mailPushEnabled}
                onChange={(e) => void updatePushConfig({ pwaPushAutoSubscribe: e.target.checked })}
              />
              Auto-subscribe PWA on login
            </label>
            {pushError ? <p className="admin-alert admin-alert-error">{pushError}</p> : null}
            {pushBroadcastResult ? <p className="admin-alert admin-alert-success">{pushBroadcastResult}</p> : null}
            <div className="admin-status-push-broadcast">
              <h4>Broadcast push</h4>
              <p className="muted">
                Sends to users who have mail push enabled and at least one registered device. New mail still uses
                automatic notifications.
              </p>
              <label>
                <span>Title</span>
                <input
                  type="text"
                  value={pushBroadcastTitle}
                  maxLength={80}
                  disabled={pushBroadcasting || !push.vapidConfigured || !pushConfig.mailPushEnabled}
                  onChange={(e) => setPushBroadcastTitle(e.target.value)}
                />
              </label>
              <label>
                <span>Message</span>
                <textarea
                  value={pushBroadcastBody}
                  maxLength={240}
                  rows={3}
                  placeholder="Platform announcement or test message…"
                  disabled={pushBroadcasting || !push.vapidConfigured || !pushConfig.mailPushEnabled}
                  onChange={(e) => setPushBroadcastBody(e.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={
                  pushBroadcasting ||
                  !push.vapidConfigured ||
                  !pushConfig.mailPushEnabled ||
                  !pushBroadcastBody.trim()
                }
                onClick={() => void sendPushBroadcast()}
              >
                {pushBroadcasting ? "Sending…" : "Send push to opted-in users"}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="card">
        <h3>Infrastructure checks</h3>
        <ul className="admin-status-checks">
          {checks.map(([name, check]) => (
            <li key={name}>
              <span className={`badge ${check.ok ? "badge-status-active" : "badge-status-inactive"}`}>
                {check.ok ? "OK" : "FAIL"}
              </span>
              <strong>{name}</strong>
              {check.detail ? <span className="muted">{check.detail}</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h3>Platform counts</h3>
        <dl className="admin-status-dl">
          <div><dt>Tenants</dt><dd>{status.counts.tenants}</dd></div>
          <div><dt>Marketing leads</dt><dd>{status.counts.leads}</dd></div>
          <div><dt>Completed checkouts</dt><dd>{status.counts.completedCheckouts}</dd></div>
          <div><dt>Webhook events</dt><dd>{status.counts.webhookEvents}</dd></div>
        </dl>
      </section>

      <section className="card">
        <h3>Billing lifecycle</h3>
        <dl className="admin-status-dl">
          <div><dt>Hosting active</dt><dd>{status.billing.hosting.active}</dd></div>
          <div><dt>Hosting past due</dt><dd>{status.billing.hosting.pastDue}</dd></div>
          <div><dt>Add-on active</dt><dd>{status.billing.addons.active}</dd></div>
          <div><dt>Grace period</dt><dd>{status.billing.graceDays} days</dd></div>
        </dl>
      </section>

      <section className="card">
        <h3>Payments config</h3>
        <dl className="admin-status-dl">
          <div><dt>Mock mode</dt><dd>{status.payments.mockMode ? "Yes (dev)" : "No (live)"}</dd></div>
          <div><dt>Providers</dt><dd>{status.payments.providers.join(", ") || "—"}</dd></div>
        </dl>
      </section>

      <section className="card">
        <h3>Environment</h3>
        <dl className="admin-status-dl">
          <div><dt>Node env</dt><dd>{status.config.nodeEnv}</dd></div>
          <div><dt>Secure cookies</dt><dd>{status.config.cookieSecure ? "Yes" : "No"}</dd></div>
          <div><dt>Admin audit</dt><dd>{status.config.auditAdminActions ? "Enabled" : "Disabled"}</dd></div>
          <div><dt>Public API URL</dt><dd className="admin-status-mono">{status.config.publicApiUrl ?? "—"}</dd></div>
        </dl>
      </section>
    </div>
  );
}
