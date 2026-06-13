import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { AdminDashboardPayload } from "../../types/site";

export function AdminDashboardHome() {
  const [dashboard, setDashboard] = useState<AdminDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .adminDashboard()
      .then((res) => setDashboard(res.dashboard))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">Loading dashboard…</p>;
  if (!dashboard) return <p className="error-banner">Failed to load dashboard</p>;

  const { summary } = dashboard;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Platform overview</h2>
      <p className="muted">Unified mail, hosting, VPS, and tenant operations — live from the database.</p>

      <div className="admin-stat-grid">
        <StatCard label="Tenants" value={summary.tenants.total} sub={`${summary.tenants.active} active · +${summary.tenants.createdThisWeek} this week`} />
        <StatCard label="Mail users" value={summary.mailUsers.total} sub={`${summary.mailUsers.active} active`} />
        <StatCard
          label="Hosting accounts"
          value={summary.hosting.accounts}
          sub={`${summary.hosting.suspended} suspended · +${summary.hosting.createdThisWeek} this week`}
        />
        <StatCard label="VPS instances" value={summary.vps.total} sub={`${summary.vps.running} running`} />
        <StatCard
          label="hmail add-ons"
          value={summary.addons.catalog}
          sub={`${summary.addons.activeTrials} trials · ${summary.addons.activeSubscriptions} subs`}
        />
        <StatCard label="Platform admins" value={summary.platformAdmins} sub="Active operators" />
      </div>

      <div className="admin-two-col">
        <section className="card editor-card">
          <h3>Recent tenants</h3>
          <ul className="admin-list">
            {dashboard.recentTenants.map((t) => (
              <li key={t.id}>
                <strong>{t.name}</strong> <span className="muted">({t.slug})</span>
                {!t.isActive && <span className="badge">inactive</span>}
              </li>
            ))}
          </ul>
        </section>

        <section className="card editor-card">
          <h3>Recent panel accounts</h3>
          <ul className="admin-list">
            {dashboard.recentHostingAccounts.map((a) => (
              <li key={a.id}>
                <strong>{a.loginId}</strong> — {a.tenant.name}
                {a.isSuspended && <span className="badge">suspended</span>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card editor-card">
        <h3>Recent admin activity</h3>
        {dashboard.recentActivity.length === 0 ? (
          <p className="muted">No audited actions yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Admin</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentActivity.map((log) => (
                  <tr key={log.id}>
                    <td className="muted">{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.action}</td>
                    <td>{log.admin?.email ?? "—"}</td>
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

function StatCard({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="admin-stat-card">
      <span className="muted">{label}</span>
      <strong className="admin-stat-value">{value}</strong>
      <span className="muted admin-stat-sub">{sub}</span>
    </div>
  );
}
