import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import type { AdminDashboardPayload, AdminPollSnapshot, AdminTrends } from "../../types/site";
import { AdminPageHeader } from "./AdminPageHeader";
import { AdminTrendCharts } from "./AdminTrendCharts";
import "./AdminDashboard.css";

type Props = {
  onNavigate?: (tab: "sales-pipeline" | "tenants" | "mail-users" | "accounts" | "vps" | "addons" | "billing" | "system" | "marketing") => void;
  poll?: AdminPollSnapshot | null;
};

export function AdminDashboardHome({ onNavigate, poll }: Props) {
  const [dashboard, setDashboard] = useState<AdminDashboardPayload | null>(null);
  const [trends, setTrends] = useState<AdminTrends | null>(null);
  const [loading, setLoading] = useState(true);

  function loadDashboard() {
    return api.adminDashboard().then((res) => setDashboard(res.dashboard));
  }

  useEffect(() => {
    Promise.all([loadDashboard(), api.adminTrends(30).then((r) => setTrends(r.trends))]).finally(() =>
      setLoading(false),
    );
  }, []);

  useEffect(() => {
    if (poll) void loadDashboard();
  }, [poll?.polledAt]);

  if (loading) return <p className="muted">Loading platform metrics…</p>;
  if (!dashboard) return <div className="admin-alert admin-alert-error">Failed to load dashboard data.</div>;

  const { summary, health, alerts } = dashboard;
  const uptimeHours = Math.floor(health.uptimeSeconds / 3600);

  return (
    <div>
      <AdminPageHeader
        title="Platform overview"
        description="Operational snapshot across tenants, mail, hosting, leads, and infrastructure health."
      />

      <div className="admin-health-strip">
        <div className={`admin-health-pill ${health.status}`}>
          <span className="admin-health-dot" aria-hidden="true" />
          {health.status === "ready" ? "All systems operational" : "Degraded — action required"}
        </div>
        <span className="muted">API uptime {uptimeHours}h · DB {health.databaseOk ? "connected" : "offline"}</span>
        <Link to="/" className="admin-health-link" target="_blank" rel="noreferrer">
          View public site ↗
        </Link>
      </div>

      {alerts.length > 0 ? (
        <div className="admin-alerts-stack">
          {alerts.map((alert) => (
            <div
              key={alert.message}
              className={`admin-alert ${
                alert.level === "error"
                  ? "admin-alert-error"
                  : alert.level === "warning"
                    ? "admin-alert-warning"
                    : "admin-alert-success"
              }`}
            >
              {alert.message}
              {alert.message.includes("lead") && onNavigate ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => onNavigate("sales-pipeline")}>
                  Open sales pipeline
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="admin-stat-grid">
        <StatCard label="Tenants" value={summary.tenants.total} sub={`${summary.tenants.active} active · +${summary.tenants.createdThisWeek} this week`} />
        <StatCard
          label="Mail users"
          value={summary.mailUsers.total}
          sub={`${summary.mailUsers.active} active · ${summary.mailUsers.onlineNow} online now`}
          highlight={summary.mailUsers.onlineNow > 0}
        />
        <StatCard
          label="PMail+ sessions"
          value={summary.mailUsers.activeSessions}
          sub={`${summary.mailUsers.onlineNow} user(s) online`}
          highlight={summary.mailUsers.activeSessions > 0}
        />
        <StatCard
          label="Hosting accounts"
          value={summary.hosting.accounts}
          sub={`${summary.hosting.suspended} suspended · +${summary.hosting.createdThisWeek} this week`}
          warn={summary.hosting.suspended > 0}
        />
        <StatCard label="VPS instances" value={summary.vps.total} sub={`${summary.vps.running} running`} />
        <StatCard
          label="Marketing leads"
          value={summary.leads.total}
          sub={`${summary.leads.newThisWeek} new this week · ${summary.leads.conversionRate}% converted`}
          highlight={summary.leads.funnel.new > 0}
        />
        <StatCard
          label="PMail+ add-ons"
          value={summary.addons.catalog}
          sub={`${summary.addons.activeTrials} trials · ${summary.addons.activeSubscriptions} subs`}
        />
      </div>

      <div className="admin-quick-actions card">
        <h3>Quick actions</h3>
        <div className="admin-quick-actions-grid">
          {onNavigate ? (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => onNavigate("sales-pipeline")}>
                Sales pipeline
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => onNavigate("tenants")}>
                Manage tenants
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => onNavigate("mail-users")}>
                PMail+ users
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => onNavigate("accounts")}>
                Panel accounts
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => onNavigate("addons")}>
                PMail+ add-ons
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => onNavigate("billing")}>
                Billing & revenue
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => onNavigate("system")}>
                System status
              </button>
            </>
          ) : null}
        </div>
      </div>

      {trends ? (
        <section className="card editor-card">
          <h3>Growth trends (30 days)</h3>
          <AdminTrendCharts
            series={[
              { label: "Tenants", color: "#0d9488", data: trends.tenants, valueKey: "count" },
              { label: "Leads", color: "#14b8a6", data: trends.leads, valueKey: "count" },
              { label: "Hosting", color: "#2dd4bf", data: trends.hostingAccounts, valueKey: "count" },
            ]}
          />
        </section>
      ) : null}

      <div className="admin-leads-pipeline card editor-card">
        <h3>Lead pipeline</h3>
        <div className="admin-leads-pipeline-bars">
          {(["new", "contacted", "qualified", "converted", "closed"] as const).map((status) => {
            const count = summary.leads.funnel[status];
            const pct = summary.leads.total > 0 ? Math.round((count / summary.leads.total) * 100) : 0;
            return (
              <div key={status} className="admin-pipeline-row">
                <span className="admin-pipeline-label">{status}</span>
                <div className="admin-pipeline-track">
                  <div className="admin-pipeline-fill" style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }} />
                </div>
                <strong>{count}</strong>
              </div>
            );
          })}
        </div>
        {summary.leads.qualifiedUnconverted > 0 ? (
          <p className="muted admin-pipeline-note">
            {summary.leads.qualifiedUnconverted} qualified lead(s) ready for tenant conversion.
          </p>
        ) : null}
      </div>

      <div className="admin-two-col">
        <section className="card editor-card">
          <h3>Recent tenants</h3>
          <ul className="admin-list">
            {dashboard.recentTenants.length === 0 ? (
              <li className="muted">No tenants yet.</li>
            ) : (
              dashboard.recentTenants.map((t) => (
                <li key={t.id}>
                  <strong>{t.name}</strong> <span className="muted">({t.slug})</span>
                  {!t.isActive && <span className="badge badge-status-inactive">inactive</span>}
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="card editor-card">
          <h3>Recent panel accounts</h3>
          <ul className="admin-list">
            {dashboard.recentHostingAccounts.length === 0 ? (
              <li className="muted">No hosting accounts yet.</li>
            ) : (
              dashboard.recentHostingAccounts.map((a) => (
                <li key={a.id}>
                  <strong>{a.loginId}</strong> — {a.tenant.name}
                  {a.isSuspended && <span className="badge badge-status-suspended">suspended</span>}
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <section className="card editor-card">
        <h3>Admin audit trail</h3>
        {dashboard.recentActivity.length === 0 ? (
          <p className="muted">No audited actions recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Operator</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentActivity.map((log) => (
                  <tr key={log.id}>
                    <td className="muted">{new Date(log.createdAt).toLocaleString()}</td>
                    <td>
                      <code className="admin-audit-action">{log.action}</code>
                    </td>
                    <td className="muted">
                      {log.entityType ?? "—"}
                      {log.entityId ? ` · ${log.entityId.slice(0, 8)}…` : ""}
                    </td>
                    <td>{log.admin?.name ?? log.admin?.email ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  warn,
  highlight,
}: {
  label: string;
  value: number;
  sub: string;
  warn?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`admin-stat-card${warn ? " warn" : ""}${highlight ? " highlight" : ""}`}>
      <span className="admin-stat-label">{label}</span>
      <strong className="admin-stat-value">{value}</strong>
      <span className="muted admin-stat-sub">{sub}</span>
    </div>
  );
}
