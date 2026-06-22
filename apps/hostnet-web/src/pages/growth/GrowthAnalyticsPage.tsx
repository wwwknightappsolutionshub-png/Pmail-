import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import type { GrowthAnalyticsDashboard, GrowthPlanSlug } from "../../types/growth";
import { GrowthPlanCheckoutModal } from "./GrowthPlanCheckoutModal";
import { GrowthUpgradeBanner } from "./GrowthUpgradeBanner";
import { isGrowthLimitError, useGrowthContext } from "./GrowthContext";
import "./Growth.css";

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function maxDailyValue(daily: GrowthAnalyticsDashboard["daily"]): number {
  return Math.max(1, ...daily.map((d) => Math.max(d.pageViews, d.leads)));
}

export function GrowthAnalyticsPage() {
  const { isOwner } = useGrowthContext();
  const [dashboard, setDashboard] = useState<GrowthAnalyticsDashboard | null>(null);
  const [days, setDays] = useState(30);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<GrowthPlanSlug | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await api.growthAnalyticsDashboard(days);
        if (!cancelled) {
          setDashboard(res.dashboard);
          setError("");
          setLocked(false);
        }
      } catch (err) {
        if (!cancelled) {
          if (isGrowthLimitError(err) && err.code === "feature_locked") {
            setLocked(true);
            setError(err.message);
          } else {
            setError(err instanceof ApiError ? err.message : "Failed to load analytics");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  if (loading && !dashboard) {
    return <div className="growth-card">Loading analytics…</div>;
  }

  const dailyMax = dashboard ? maxDailyValue(dashboard.daily) : 1;
  const sourcePages = dashboard
    ? Object.entries(dashboard.bySourcePage).sort((a, b) => b[1].pageViews - a[1].pageViews)
    : [];
  const utmSources = dashboard
    ? Object.entries(dashboard.byUtmSource).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="growth-analytics-page">
      <div className="growth-card">
        <div className="growth-analytics-head">
          <div>
            <h1>Analytics command center</h1>
            <p className="muted">
              Page views, capture funnel, chat completions, and UTM attribution from your published Growth pages.
            </p>
          </div>
          <label className="growth-analytics-range">
            <span className="muted">Range</span>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </label>
        </div>

        {locked ? (
          <GrowthUpgradeBanner
            message={error}
            onUpgrade={isOwner ? (plan) => setCheckoutPlan(plan) : undefined}
          />
        ) : error ? (
          <div className="error-banner">{error}</div>
        ) : null}

        {dashboard ? (
          <>
            <div className="growth-status-grid" style={{ marginTop: "1rem" }}>
              <div className="growth-status-card">
                <strong>Page views</strong>
                <p className="growth-analytics-kpi">{dashboard.totals.pageViews}</p>
              </div>
              <div className="growth-status-card">
                <strong>Form submits</strong>
                <p className="growth-analytics-kpi">{dashboard.totals.formSubmits}</p>
              </div>
              <div className="growth-status-card">
                <strong>Chat opens</strong>
                <p className="growth-analytics-kpi">{dashboard.totals.chatOpens}</p>
              </div>
              <div className="growth-status-card">
                <strong>Leads</strong>
                <p className="growth-analytics-kpi">{dashboard.totals.leads}</p>
              </div>
              <div className="growth-status-card">
                <strong>Conversion</strong>
                <p className="growth-analytics-kpi">{formatPercent(dashboard.funnel.conversionRate)}</p>
                <p className="muted" style={{ fontSize: "0.78rem" }}>Leads ÷ page views</p>
              </div>
            </div>

            <h2 style={{ marginTop: "1.5rem", fontSize: "1rem" }}>Funnel</h2>
            <div className="growth-analytics-funnel">
              {[
                { label: "Page views", value: dashboard.funnel.pageViews },
                { label: "Form submits", value: dashboard.funnel.formSubmits },
                { label: "Chat completes", value: dashboard.funnel.chatCompletes },
                { label: "Leads", value: dashboard.funnel.leads },
              ].map((step) => {
                const width =
                  dashboard.funnel.pageViews > 0
                    ? Math.max(8, Math.round((step.value / dashboard.funnel.pageViews) * 100))
                    : 8;
                return (
                  <div key={step.label} className="growth-analytics-funnel-row">
                    <span className="growth-analytics-funnel-label">{step.label}</span>
                    <div className="growth-analytics-funnel-bar-wrap">
                      <div className="growth-analytics-funnel-bar" style={{ width: `${width}%` }} />
                    </div>
                    <span className="growth-analytics-funnel-value">{step.value}</span>
                  </div>
                );
              })}
            </div>

            <h2 style={{ marginTop: "1.5rem", fontSize: "1rem" }}>Daily trend</h2>
            <div className="growth-analytics-daily">
              {dashboard.daily.map((day) => (
                <div key={day.date} className="growth-analytics-daily-col" title={`${day.date}: ${day.pageViews} views, ${day.leads} leads`}>
                  <div className="growth-analytics-daily-bars">
                    <div
                      className="growth-analytics-daily-bar views"
                      style={{ height: `${Math.round((day.pageViews / dailyMax) * 100)}%` }}
                    />
                    <div
                      className="growth-analytics-daily-bar leads"
                      style={{ height: `${Math.round((day.leads / dailyMax) * 100)}%` }}
                    />
                  </div>
                  <span className="growth-analytics-daily-label">{day.date.slice(5)}</span>
                </div>
              ))}
            </div>
            <p className="muted" style={{ fontSize: "0.78rem", marginTop: "0.35rem" }}>
              Teal = page views · navy = leads
            </p>

            <div className="growth-analytics-split">
              <div>
                <h2 style={{ fontSize: "1rem" }}>By source page</h2>
                {sourcePages.length === 0 ? (
                  <p className="muted">No page data yet. Republish from Content studio to enable tracking.</p>
                ) : (
                  <ul className="growth-agent-list">
                    {sourcePages.map(([page, stats]) => (
                      <li key={page}>
                        <strong>{page}</strong>
                        <div className="muted">
                          {stats.pageViews} views · {stats.leads} leads
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h2 style={{ fontSize: "1rem" }}>UTM sources</h2>
                {utmSources.length === 0 ? (
                  <p className="muted">No UTM-tagged traffic yet. Share links with ?utm_source=…</p>
                ) : (
                  <ul className="growth-agent-list">
                    {utmSources.map(([source, count]) => (
                      <li key={source}>
                        <strong>{source}</strong>
                        <div className="muted">{count} events</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {dashboard.topReferrers.length > 0 ? (
              <>
                <h2 style={{ marginTop: "1.25rem", fontSize: "1rem" }}>Top referrers</h2>
                <ul className="growth-agent-list">
                  {dashboard.topReferrers.map((row) => (
                    <li key={row.referrer}>
                      <strong>{row.referrer}</strong>
                      <div className="muted">{row.count} page views</div>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            <p className="muted" style={{ marginTop: "1.25rem", fontSize: "0.85rem" }}>
              Tracking fires on republished pages.{" "}
              <Link to="/growth/studio">Republish in Content studio</Link> after upgrading analytics.
            </p>
          </>
        ) : null}
      </div>

      {checkoutPlan ? (
        <GrowthPlanCheckoutModal planSlug={checkoutPlan} onClose={() => setCheckoutPlan(null)} />
      ) : null}
    </div>
  );
}
