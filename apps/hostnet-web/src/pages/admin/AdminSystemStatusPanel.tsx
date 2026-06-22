import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { AdminPollSnapshot, AdminSystemStatus } from "../../types/site";
import "./AdminDashboard.css";

type Props = {
  poll?: AdminPollSnapshot | null;
};

export function AdminSystemStatusPanel({ poll }: Props) {
  const [status, setStatus] = useState<AdminSystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await api.adminSystemStatus();
      setStatus(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (poll) void load();
  }, [poll?.polledAt]);

  if (loading && !status) return <p className="muted">Loading system status…</p>;
  if (!status) return <div className="admin-alert admin-alert-error">Failed to load system status.</div>;

  const checks = Object.entries(status.readiness.checks);

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
