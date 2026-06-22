import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { AdminTrends, BillingRevenueDashboard } from "../../types/site";
import { AdminTrendCharts, formatMoney } from "./AdminTrendCharts";
import "./AdminDashboard.css";

export function AdminBillingPanel() {
  const [revenue, setRevenue] = useState<BillingRevenueDashboard | null>(null);
  const [trends, setTrends] = useState<AdminTrends | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.adminBillingRevenue(), api.adminTrends(30)])
      .then(([revRes, trendsRes]) => {
        setRevenue(revRes.revenue);
        setTrends(trendsRes.trends);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">Loading billing & revenue…</p>;
  if (!revenue) return <div className="admin-alert admin-alert-error">Failed to load revenue data.</div>;

  return (
    <div className="admin-billing-module">
      <div className="admin-stat-grid">
        <div className="admin-stat-card highlight">
          <span className="admin-stat-label">MRR (estimated)</span>
          <strong className="admin-stat-value">{formatMoney(revenue.mrrCents)}</strong>
          <span className="muted admin-stat-sub">
            Hosting {formatMoney(revenue.hostingMrrCents)} · Add-ons {formatMoney(revenue.addonMrrCents)}
          </span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Last 30 days</span>
          <strong className="admin-stat-value">{formatMoney(revenue.last30RevenueCents)}</strong>
          <span className="muted admin-stat-sub">{revenue.last30Orders} completed orders</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Lifetime revenue</span>
          <strong className="admin-stat-value">{formatMoney(revenue.lifetimeRevenueCents)}</strong>
          <span className="muted admin-stat-sub">{revenue.lifetimeOrders} orders total</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Active subscriptions</span>
          <strong className="admin-stat-value">{revenue.activeHostingSubscriptions + revenue.activeAddonSubscriptions}</strong>
          <span className="muted admin-stat-sub">
            {revenue.activeHostingSubscriptions} hosting · {revenue.activeAddonSubscriptions} add-ons
          </span>
        </div>
      </div>

      {trends ? (
        <section className="card editor-card">
          <h3>Revenue trend (30 days)</h3>
          <AdminTrendCharts
            series={[{ label: "Revenue", color: "#0d9488", data: trends.revenue, valueKey: "revenueCents" }]}
            height={160}
          />
        </section>
      ) : null}

      <div className="admin-two-col">
        <section className="card editor-card">
          <h3>Hosting plan MRR</h3>
          {revenue.topHostingPlans.length === 0 ? (
            <p className="muted">No active hosting subscriptions.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Subs</th>
                  <th>MRR</th>
                </tr>
              </thead>
              <tbody>
                {revenue.topHostingPlans.map((p) => (
                  <tr key={p.slug}>
                    <td>{p.name}</td>
                    <td>{p.count}</td>
                    <td>{formatMoney(p.mrrCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card editor-card">
          <h3>Add-on MRR</h3>
          {revenue.topAddons.length === 0 ? (
            <p className="muted">No active add-on subscriptions.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Add-on</th>
                  <th>Subs</th>
                  <th>MRR</th>
                </tr>
              </thead>
              <tbody>
                {revenue.topAddons.map((a) => (
                  <tr key={a.slug}>
                    <td>{a.name}</td>
                    <td>{a.count}</td>
                    <td>{formatMoney(a.mrrCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="card editor-card">
        <h3>Recent payments</h3>
        {revenue.recentPayments.length === 0 ? (
          <p className="muted">No completed payments yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Product</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Provider</th>
                </tr>
              </thead>
              <tbody>
                {revenue.recentPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="muted">{p.completedAt ? new Date(p.completedAt).toLocaleString() : "—"}</td>
                    <td>{p.productName}</td>
                    <td>{p.customerEmail}</td>
                    <td>{formatMoney(p.amountCents)}</td>
                    <td>{p.provider}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card editor-card">
        <h3>Subscription health</h3>
        <div className="admin-billing-health">
          <span className="badge badge-status-active">Hosting active: {revenue.billing.hosting.active}</span>
          <span className="badge badge-status-contacted">Hosting past due: {revenue.billing.hosting.pastDue}</span>
          <span className="badge badge-status-active">Add-ons active: {revenue.billing.addons.active}</span>
          <span className="badge badge-status-contacted">Add-ons past due: {revenue.billing.addons.pastDue}</span>
        </div>
      </section>
    </div>
  );
}
