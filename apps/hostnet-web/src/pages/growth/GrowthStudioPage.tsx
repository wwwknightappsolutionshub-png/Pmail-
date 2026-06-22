import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import type { GrowthContentAsset, GrowthPlanSlug } from "../../types/growth";
import { GrowthPlanCheckoutModal } from "./GrowthPlanCheckoutModal";
import { GrowthUpgradeBanner } from "./GrowthUpgradeBanner";
import { isUpgradeableError, useGrowthContext } from "./GrowthContext";
import "./Growth.css";

const ASSET_GROUPS: Array<{ key: string; label: string; types: string[] }> = [
  {
    key: "strategy",
    label: "Strategy",
    types: ["persona", "positioning", "competitor_analysis", "offer_recommendations"],
  },
  {
    key: "website",
    label: "Website & SEO",
    types: ["website_audit", "seo_recommendations"],
  },
  { key: "pages", label: "Pages", types: ["homepage_copy", "landing_copy"] },
  { key: "blogs", label: "Blog posts", types: ["blog_post"] },
  { key: "social", label: "Social", types: ["social_post"] },
  { key: "email", label: "Email", types: ["email_sequence"] },
];

function formatAssetType(type: string): string {
  return type.replace(/_/g, " ");
}

function formatContentMode(mode: string | null | undefined): string {
  if (mode === "existing_site") return "Existing website — audit & gap-filling content";
  if (mode === "greenfield") return "No website — full greenfield copy";
  return "Marketing bundle";
}

function renderAssetPreview(asset: GrowthContentAsset): string {
  const body = asset.body;
  if (asset.assetType === "website_audit") {
    const gaps = body.contentGaps as string[] | undefined;
    const improvements = body.improvements as Array<{ area?: string; recommendation?: string }> | undefined;
    return [
      body.targetUrl ? `Site: ${String(body.targetUrl)}` : "",
      body.note ? String(body.note) : "",
      gaps?.length ? `\nGaps:\n${gaps.map((g) => `• ${g}`).join("\n")}` : "",
      improvements?.length
        ? `\nImprovements:\n${improvements.map((i) => `• ${i.area}: ${i.recommendation}`).join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (asset.assetType === "seo_recommendations") {
    const recs = body.recommendations as Array<{ type?: string; suggestion?: string; reason?: string }> | undefined;
    return recs?.map((r) => `${r.type}\n${r.suggestion}\n${r.reason}`).join("\n\n---\n\n") ?? JSON.stringify(body, null, 2);
  }
  if (asset.assetType === "homepage_copy") {
    if (body.contentMode === "improvement") {
      return [
        body.suggestedHeroHeadline,
        body.suggestedHeroSubheadline,
        body.doNotReplaceSite ? "(Improvements for your existing site — not a replacement.)" : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    }
    return [body.heroHeadline, body.heroSubheadline].filter(Boolean).join("\n\n");
  }
  if (asset.assetType === "landing_copy") {
    return [body.purpose, body.headline, body.subheadline].filter(Boolean).join("\n\n");
  }
  if (asset.assetType === "blog_post") {
    const intro = String(body.introduction ?? body.metaDescription ?? "");
    const strategy = body.contentStrategy ? `[${String(body.contentStrategy)}] ` : "";
    return strategy + intro;
  }
  if (asset.assetType === "social_post") {
    return String(body.caption ?? "");
  }
  if (asset.assetType === "email_sequence") {
    const emails = body.emails as Array<{ subject?: string; body?: string }> | undefined;
    return emails?.map((e) => `Subject: ${e.subject}\n\n${e.body}`).join("\n\n---\n\n") ?? "";
  }
  return JSON.stringify(body, null, 2);
}

export function GrowthStudioPage() {
  const { isOwner } = useGrowthContext();
  const [assets, setAssets] = useState<GrowthContentAsset[]>([]);
  const [summary, setSummary] = useState<{
    totalAssets: number;
    hasBundle: boolean;
    contentMode?: "greenfield" | "existing_site" | null;
  } | null>(null);
  const [workspaceStatus, setWorkspaceStatus] = useState("");
  const [activeGroup, setActiveGroup] = useState("strategy");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [limitError, setLimitError] = useState("");
  const [checkoutPlan, setCheckoutPlan] = useState<GrowthPlanSlug | null>(null);
  const [publishMessage, setPublishMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const publishableTypes = new Set(["homepage_copy", "blog_post", "landing_copy"]);

  useEffect(() => {
    void (async () => {
      try {
        const [bundleRes, assetsRes] = await Promise.all([api.growthContentBundle(), api.growthContentAssets()]);
        setSummary(bundleRes.summary);
        setWorkspaceStatus(bundleRes.workspaceStatus);
        const visible = assetsRes.assets.filter((a) => a.assetType !== "bundle_summary");
        setAssets(visible);
        setSelectedId(visible[0]?.id ?? null);
        if (bundleRes.summary.contentMode === "existing_site") {
          setActiveGroup("website");
          const firstWebsite = visible.find((a) => ASSET_GROUPS[1].types.includes(a.assetType));
          if (firstWebsite) setSelectedId(firstWebsite.id);
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to load studio");
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const group = ASSET_GROUPS.find((g) => g.key === activeGroup);
    if (!group) return assets;
    return assets.filter((a) => group.types.includes(a.assetType));
  }, [activeGroup, assets]);

  const visibleGroups = useMemo(() => {
    if (summary?.contentMode !== "existing_site") {
      return ASSET_GROUPS.filter((g) => g.key !== "website");
    }
    return ASSET_GROUPS;
  }, [summary?.contentMode]);

  const selected = assets.find((a) => a.id === selectedId) ?? filtered[0] ?? null;
  const selectedPublish = selected?.body?.publish as { panelPath?: string; publishedAt?: string } | undefined;

  async function handlePublishSelected() {
    if (!selected) return;
    setBusy(true);
    setPublishMessage("");
    setError("");
    setLimitError("");
    try {
      const result = await api.growthContentPublishAsset(selected.id);
      setPublishMessage(`Published to ${String(result.published.panelPath ?? "panel site")}`);
    } catch (err) {
      if (isUpgradeableError(err)) {
        setLimitError(err.message);
      } else {
        setError(err instanceof ApiError ? err.message : "Publish failed");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenerate() {
    setBusy(true);
    setError("");
    try {
      await api.growthContentRegenerate();
      setPublishMessage("Regeneration queued — refresh in a minute.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Regenerate failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="growth-card">
      <h1>Content studio</h1>
      <p className="muted">
        Phase B day-one bundle — {formatContentMode(summary?.contentMode)} generated from your wizard answers
        {summary?.contentMode === "existing_site"
          ? " and a lightweight review of your live site where fetchable."
          : "."}
      </p>

      {limitError ? (
        <GrowthUpgradeBanner
          message={limitError}
          onUpgrade={isOwner ? (plan) => setCheckoutPlan(plan) : undefined}
        />
      ) : null}
      {error ? <div className="error-banner">{error}</div> : null}

      {!summary?.hasBundle ? (
        <p style={{ marginTop: "1rem" }}>
          No content bundle yet.{" "}
          <Link to="/growth/onboarding" className="btn btn-primary btn-sm">
            Complete onboarding
          </Link>
        </p>
      ) : (
        <>
          <div className="growth-status-grid">
            <div className="growth-status-card">
              <strong>Status</strong>
              <p className="muted">{workspaceStatus}</p>
            </div>
            <div className="growth-status-card">
              <strong>Bundle mode</strong>
              <p className="muted">{formatContentMode(summary.contentMode)}</p>
            </div>
            <div className="growth-status-card">
              <strong>Generated assets</strong>
              <p className="muted">{summary.totalAssets - 1} items</p>
            </div>
          </div>

          <div className="growth-action-row" style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void handleRegenerate()}>
              Regenerate bundle
            </button>
            {selected && publishableTypes.has(selected.assetType) ? (
              <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void handlePublishSelected()}>
                Publish to panel site
              </button>
            ) : null}
          </div>

          {publishMessage ? <p className="muted" style={{ marginTop: "0.75rem" }}>{publishMessage}</p> : null}
          {selectedPublish?.panelPath ? (
            <p className="muted" style={{ marginTop: "0.5rem" }}>
              Last published: {selectedPublish.panelPath}
            </p>
          ) : null}

          <div className="growth-studio-tabs">
            {visibleGroups.map((group) => (
              <button
                key={group.key}
                type="button"
                className={`growth-studio-tab${activeGroup === group.key ? " active" : ""}`}
                onClick={() => {
                  setActiveGroup(group.key);
                  const first = assets.find((a) => group.types.includes(a.assetType));
                  setSelectedId(first?.id ?? null);
                }}
              >
                {group.label}
              </button>
            ))}
          </div>

          <div className="growth-studio-layout">
            <ul className="growth-studio-list">
              {filtered.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    className={`growth-studio-item${selected?.id === asset.id ? " active" : ""}`}
                    onClick={() => setSelectedId(asset.id)}
                  >
                    <strong>{asset.title}</strong>
                    <span className="muted">{formatAssetType(asset.assetType)}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="growth-studio-preview">
              {selected ? (
                <>
                  <div className="growth-studio-preview-head">
                    <h2>{selected.title}</h2>
                    <span className="badge">{formatAssetType(selected.assetType)}</span>
                  </div>
                  <pre className="growth-studio-preview-body">{renderAssetPreview(selected)}</pre>
                </>
              ) : (
                <p className="muted">Select an asset to preview.</p>
              )}
            </div>
          </div>
        </>
      )}

      {checkoutPlan ? (
        <GrowthPlanCheckoutModal planSlug={checkoutPlan} onClose={() => setCheckoutPlan(null)} />
      ) : null}
    </div>
  );
}
