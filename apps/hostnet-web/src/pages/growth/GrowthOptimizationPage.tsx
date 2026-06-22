import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import type {
  GrowthOptimizationInsight,
  GrowthPlanSlug,
  GrowthWeeklyBrief,
} from "../../types/growth";
import { GrowthPlanCheckoutModal } from "./GrowthPlanCheckoutModal";
import { GrowthUpgradeBanner } from "./GrowthUpgradeBanner";
import { isGrowthLimitError, useGrowthContext } from "./GrowthContext";
import "./Growth.css";

function renderBriefMarkdown(md: string) {
  return md.split("\n").map((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return <br key={i} />;
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      return (
        <li key={i} style={{ marginLeft: "1rem" }}>
          {trimmed.slice(2)}
        </li>
      );
    }
    return (
      <p key={i} className="muted" style={{ margin: "0.25rem 0" }}>
        {trimmed}
      </p>
    );
  });
}

export function GrowthOptimizationPage() {
  const { isOwner, reload } = useGrowthContext();
  const [insights, setInsights] = useState<GrowthOptimizationInsight[]>([]);
  const [weeklyBrief, setWeeklyBrief] = useState<GrowthWeeklyBrief | null>(null);
  const [aiInsightCount, setAiInsightCount] = useState(0);
  const [highPriorityCount, setHighPriorityCount] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<GrowthPlanSlug | null>(null);

  async function load() {
    const res = await api.growthOptimization();
    setInsights(res.insights);
    setWeeklyBrief(res.weeklyBrief);
    setAiInsightCount(res.aiInsightCount ?? 0);
    setHighPriorityCount(res.highPriorityCount);
    setError("");
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          if (isGrowthLimitError(err) && err.status === 403) {
            setError("Upgrade to Pro to unlock the optimization loop with analytics-backed recommendations.");
          } else {
            setError(err instanceof ApiError ? err.message : "Failed to load optimization");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRefresh() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await api.growthOptimizationRefresh();
      setWeeklyBrief(res.weeklyBrief);
      await load();
      setMessage("Insights refreshed with AI recommendations from your analytics.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Refresh failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailBrief() {
    setBusy(true);
    try {
      const res = await api.growthOptimizationBriefEmail();
      setMessage(res.sent ? "Weekly brief emailed to your notify address." : "No brief to email yet — refresh insights first.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Email failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDismiss(id: string) {
    setBusy(true);
    try {
      await api.growthOptimizationDismiss(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Dismiss failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="growth-card">Loading optimization…</div>;
  }

  return (
    <div className="growth-card">
      <div className="growth-analytics-head">
        <div>
          <h1>Optimization loop</h1>
          <p className="muted">
            AI-powered weekly brief and actionable recommendations — pause campaigns, publish content gaps, shift budget.
          </p>
          {aiInsightCount > 0 ? (
            <p className="muted" style={{ fontSize: "0.85rem" }}>
              {aiInsightCount} AI-generated recommendation{aiInsightCount === 1 ? "" : "s"} this cycle
            </p>
          ) : null}
        </div>
        <div className="growth-action-row">
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void handleEmailBrief()}>
            Email weekly brief
          </button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void handleRefresh()}>
            Refresh insights
          </button>
        </div>
      </div>

      {error ? (
        error.includes("Upgrade") ? (
          <GrowthUpgradeBanner
            message={error}
            onUpgrade={isOwner ? (plan) => setCheckoutPlan(plan) : undefined}
          />
        ) : (
          <div className="error-banner">{error}</div>
        )
      ) : null}
      {message ? <div className="success-banner">{message}</div> : null}

      {weeklyBrief ? (
        <section className="growth-settings-section">
          <h2>Weekly executive brief</h2>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            Week of {new Date(weeklyBrief.weekStart).toLocaleDateString()}
            {weeklyBrief.emailedAt ? ` · emailed ${new Date(weeklyBrief.emailedAt).toLocaleDateString()}` : ""}
          </p>
          <div className="growth-card" style={{ background: "var(--growth-muted-bg, #f8f9fa)", padding: "1rem" }}>
            {renderBriefMarkdown(weeklyBrief.briefMarkdown)}
          </div>
        </section>
      ) : null}

      {!error && highPriorityCount > 0 ? (
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          {highPriorityCount} high-priority action{highPriorityCount === 1 ? "" : "s"} this week
        </p>
      ) : null}

      <ul className="growth-optimization-list">
        {insights.map((insight) => (
          <li key={insight.id} className={`growth-optimization-item priority-${insight.priority}`}>
            <div className="growth-optimization-main">
              <span className="growth-optimization-badge">
                {insight.metrics?.source === "ai" ? "AI · " : ""}
                {insight.category}
              </span>
              <strong>{insight.title}</strong>
              <p className="muted">{insight.summary}</p>
              {insight.actionTarget ? (
                insight.actionTarget.startsWith("/") ? (
                  <Link to={insight.actionTarget} className="btn btn-secondary btn-sm">
                    {insight.actionLabel ?? "Take action"}
                  </Link>
                ) : null
              ) : null}
              {insight.category === "plan" && isOwner && insight.actionTarget === "/growth/settings" ? (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setCheckoutPlan("pro")}>
                  Upgrade to Pro
                </button>
              ) : null}
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busy}
              onClick={() => void handleDismiss(insight.id)}
            >
              Dismiss
            </button>
          </li>
        ))}
      </ul>

      {checkoutPlan ? (
        <GrowthPlanCheckoutModal
          planSlug={checkoutPlan}
          onClose={() => setCheckoutPlan(null)}
          onComplete={() => {
            void reload();
            void load();
          }}
        />
      ) : null}
    </div>
  );
}
