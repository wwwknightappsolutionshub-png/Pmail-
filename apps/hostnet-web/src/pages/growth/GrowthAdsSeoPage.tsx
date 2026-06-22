import { useEffect, useState } from "react";
import { api, ApiError } from "../../api/client";
import type { GrowthAdCampaign, GrowthPlanSlug, GrowthSeoKeyword } from "../../types/growth";
import { GrowthPlanCheckoutModal } from "./GrowthPlanCheckoutModal";
import { GrowthUpgradeBanner } from "./GrowthUpgradeBanner";
import { isGrowthLimitError, useGrowthContext } from "./GrowthContext";
import "./Growth.css";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function GrowthAdsSeoPage() {
  const { isOwner } = useGrowthContext();
  const [campaigns, setCampaigns] = useState<GrowthAdCampaign[]>([]);
  const [keywords, setKeywords] = useState<GrowthSeoKeyword[]>([]);
  const [avgRank, setAvgRank] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [checkoutPlan, setCheckoutPlan] = useState<GrowthPlanSlug | null>(null);
  const [locked, setLocked] = useState(false);
  const [linkPlatform, setLinkPlatform] = useState<"google_ads" | "meta" | "">("");

  async function load() {
    const res = await api.growthAdsSeo();
    setCampaigns(res.campaigns);
    setKeywords(res.keywords);
    setAvgRank(res.avgRank);
    setError("");
    setLocked(false);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          if (isGrowthLimitError(err) && err.code === "feature_locked") {
            setLocked(true);
            setError(err.message);
          } else {
            setError(err instanceof ApiError ? err.message : "Failed to load ads & SEO");
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

  async function handleSync(campaignId: string) {
    setBusyId(campaignId);
    setMessage("");
    try {
      await api.growthAdsSeoSyncCampaign(campaignId);
      setMessage("Ad copy synced to connected ad account.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sync failed");
    } finally {
      setBusyId("");
    }
  }

  async function handleRefreshPacing() {
    setBusyId("pacing");
    try {
      const res = await api.growthAdsSeoRefreshPacing();
      setCampaigns(res.campaigns);
      setMessage("Budget pacing updated.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Pacing refresh failed");
    } finally {
      setBusyId("");
    }
  }

  async function handleRefreshRanks() {
    setBusyId("ranks");
    try {
      const res = await api.growthAdsSeoRefreshRanks();
      setKeywords(res.keywords);
      setMessage("Keyword ranks refreshed.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Rank refresh failed");
    } finally {
      setBusyId("");
    }
  }

  async function handleLinkAccount() {
    if (!linkPlatform) return;
    setBusyId("link");
    setError("");
    try {
      await api.growthAdsSeoLinkAccount({
        platform: linkPlatform,
        credentials:
          linkPlatform === "google_ads"
            ? { developerToken: "demo-token", customerId: "1234567890" }
            : { pageAccessToken: "demo-token", pageId: "demo-page" },
        accountLabel: linkPlatform === "google_ads" ? "Google Ads demo" : "Meta Ads demo",
      });
      setMessage(`${linkPlatform === "google_ads" ? "Google Ads" : "Meta"} account linked.`);
      setLinkPlatform("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Link failed");
    } finally {
      setBusyId("");
    }
  }

  if (loading) {
    return <div className="growth-card">Loading ads & SEO…</div>;
  }

  return (
    <div className="growth-card">
      <div className="growth-analytics-head">
        <div>
          <h1>Ads & SEO ops</h1>
          <p className="muted">
            Link ad accounts, track budget pacing, and monitor keyword ranks beyond your site audit.
          </p>
          {avgRank != null ? (
            <p className="muted" style={{ fontSize: "0.85rem" }}>
              Average tracked rank: #{avgRank}
            </p>
          ) : null}
        </div>
        <div className="growth-action-row">
          <button type="button" className="btn btn-secondary btn-sm" disabled={!!busyId || locked} onClick={() => void handleRefreshPacing()}>
            Refresh pacing
          </button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={!!busyId || locked} onClick={() => void handleRefreshRanks()}>
            Refresh ranks
          </button>
        </div>
      </div>

      {locked ? (
        <GrowthUpgradeBanner message={error} onUpgrade={isOwner ? (plan) => setCheckoutPlan(plan) : undefined} />
      ) : error ? (
        <div className="error-banner">{error}</div>
      ) : null}
      {message ? <div className="success-banner">{message}</div> : null}

      <section className="growth-settings-section">
        <h2>Ad account linking</h2>
        <div className="growth-action-row">
          <select value={linkPlatform} onChange={(e) => setLinkPlatform(e.target.value as "" | "google_ads" | "meta")} disabled={locked}>
            <option value="">Select platform…</option>
            <option value="google_ads">Google Ads</option>
            <option value="meta">Meta Ads</option>
          </select>
          <button type="button" className="btn btn-primary btn-sm" disabled={!linkPlatform || !!busyId || locked} onClick={() => void handleLinkAccount()}>
            Link account
          </button>
        </div>
      </section>

      <section className="growth-settings-section">
        <h2>Campaigns ({campaigns.length})</h2>
        <ul className="growth-optimization-list">
          {campaigns.map((campaign) => (
            <li key={campaign.id} className="growth-optimization-item priority-medium">
              <div className="growth-optimization-main">
                <span className="growth-optimization-badge">{campaign.platform}</span>
                <strong>{campaign.name}</strong>
                <p className="muted">
                  {campaign.status} · daily {formatCents(campaign.dailyBudgetCents)} · spent {formatCents(campaign.spentCents)}
                  {campaign.externalId ? ` · synced (${campaign.externalId})` : ""}
                </p>
                <p className="muted">
                  Pacing: {campaign.pacing.pacePercent}% of expected ·{" "}
                  {campaign.pacing.onTrack ? "on track" : "review budget"}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={!!busyId || locked}
                onClick={() => void handleSync(campaign.id)}
              >
                Push ad copy
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="growth-settings-section">
        <h2>Keyword rank tracking ({keywords.length})</h2>
        <ul className="growth-agent-list">
          {keywords.map((kw) => (
            <li key={kw.id}>
              <strong>{kw.keyword}</strong>
              {kw.currentRank != null ? (
                <span className="muted">
                  {" "}
                  — rank #{kw.currentRank}
                  {kw.rankDelta != null && kw.rankDelta !== 0 ? (
                    <span> ({kw.rankDelta > 0 ? `↑${kw.rankDelta}` : `↓${Math.abs(kw.rankDelta)}`})</span>
                  ) : null}
                </span>
              ) : null}
              {kw.targetUrl ? <span className="muted"> · {kw.targetUrl}</span> : null}
            </li>
          ))}
        </ul>
      </section>

      {checkoutPlan ? (
        <GrowthPlanCheckoutModal planSlug={checkoutPlan} onClose={() => setCheckoutPlan(null)} onComplete={() => void load()} />
      ) : null}
    </div>
  );
}
