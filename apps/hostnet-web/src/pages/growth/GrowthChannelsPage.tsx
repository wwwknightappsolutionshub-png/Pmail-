import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, ApiError } from "../../api/client";
import type {
  GrowthChannelAsset,
  GrowthChannelDelivery,
  GrowthChannelIntegration,
  GrowthPlanSlug,
} from "../../types/growth";
import { GrowthPlanCheckoutModal } from "./GrowthPlanCheckoutModal";
import { GrowthUpgradeBanner } from "./GrowthUpgradeBanner";
import { isGrowthLimitError, useGrowthContext } from "./GrowthContext";
import "./Growth.css";

const INTEGRATION_FIELDS: Record<
  GrowthChannelIntegration["provider"],
  Array<{ key: string; label: string; placeholder: string }>
> = {
  mailchimp: [
    { key: "apiKey", label: "API key", placeholder: "xxxx-us1" },
    { key: "listId", label: "Audience list ID", placeholder: "abc123" },
  ],
  meta: [
    { key: "pageAccessToken", label: "Page access token", placeholder: "EAA..." },
    { key: "pageId", label: "Facebook Page ID", placeholder: "123456789" },
  ],
  google_ads: [
    { key: "developerToken", label: "Developer token", placeholder: "..." },
    { key: "customerId", label: "Customer ID", placeholder: "1234567890" },
  ],
};

export function GrowthChannelsPage() {
  const { isOwner } = useGrowthContext();
  const [assets, setAssets] = useState<GrowthChannelAsset[]>([]);
  const [deliveries, setDeliveries] = useState<GrowthChannelDelivery[]>([]);
  const [integrations, setIntegrations] = useState<GrowthChannelIntegration[]>([]);
  const [llmConfigured, setLlmConfigured] = useState(false);
  const [contentLlmConfigured, setContentLlmConfigured] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [checkoutPlan, setCheckoutPlan] = useState<GrowthPlanSlug | null>(null);
  const [locked, setLocked] = useState(false);
  const [connectProvider, setConnectProvider] = useState<GrowthChannelIntegration["provider"] | "">("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  async function load() {
    const [assetsRes, deliveriesRes, llmRes, integrationsRes, contentLlmRes] = await Promise.all([
      api.growthChannelAssets(),
      api.growthChannelDeliveries(),
      api.growthLlmStatus(),
      api.growthChannelIntegrations(),
      api.growthContentLlmStatus(),
    ]);
    setAssets(assetsRes.assets);
    setDeliveries(deliveriesRes.deliveries);
    setIntegrations(integrationsRes.integrations);
    setLlmConfigured(llmRes.configured);
    setContentLlmConfigured(contentLlmRes.configured);
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
            setError(err instanceof ApiError ? err.message : "Failed to load channels");
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

  const socialPosts = assets.filter((a) => a.assetType === "social_post");
  const emailSequence = assets.find((a) => a.assetType === "email_sequence");
  const adCopy = assets.find((a) => a.assetType === "ad_copy");

  async function handleSendSocial(assetId: string) {
    setBusyId(assetId);
    setMessage("");
    setError("");
    try {
      await api.growthChannelSocialSend(assetId);
      const metaConnected = integrations.find((i) => i.provider === "meta")?.connected;
      setMessage(
        metaConnected
          ? "Post published via Meta API (or queued)."
          : "Social post pack emailed — connect Meta to post directly.",
      );
      await load();
    } catch (err) {
      if (isGrowthLimitError(err) && err.code === "feature_locked") {
        setLocked(true);
        setError(err.message);
      } else {
        setError(err instanceof ApiError ? err.message : "Send failed");
      }
    } finally {
      setBusyId("");
    }
  }

  async function handleEmailBroadcast(step: number) {
    setBusyId(`email-${step}`);
    setMessage("");
    setError("");
    try {
      const result = await api.growthChannelEmailBroadcast({ emailStep: step });
      const mcConnected = integrations.find((i) => i.provider === "mailchimp")?.connected;
      setMessage(
        mcConnected
          ? `Mailchimp campaign sent (${result.sentCount} recipients).`
          : `Nurture broadcast sent to ${result.sentCount} lead(s).`,
      );
      await load();
    } catch (err) {
      if (isGrowthLimitError(err) && err.code === "feature_locked") {
        setLocked(true);
        setError(err.message);
      } else {
        setError(err instanceof ApiError ? err.message : "Broadcast failed");
      }
    } finally {
      setBusyId("");
    }
  }

  async function handleProcessDue() {
    setBusyId("process-due");
    try {
      const result = await api.growthChannelsProcessDue();
      setMessage(`Processed ${result.processed.length} due social delivery(ies).`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Process failed");
    } finally {
      setBusyId("");
    }
  }

  async function handleConnect() {
    if (!connectProvider) return;
    setBusyId("connect");
    setError("");
    try {
      await api.growthChannelIntegrationConnect({
        provider: connectProvider,
        credentials,
        accountLabel: `${connectProvider} account`,
      });
      setMessage(`${connectProvider} connected.`);
      setConnectProvider("");
      setCredentials({});
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Connect failed");
    } finally {
      setBusyId("");
    }
  }

  async function handleDisconnect(provider: GrowthChannelIntegration["provider"]) {
    setBusyId(provider);
    try {
      await api.growthChannelIntegrationDisconnect(provider);
      setMessage(`${provider} disconnected.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Disconnect failed");
    } finally {
      setBusyId("");
    }
  }

  if (loading) {
    return <div className="growth-card">Loading channels…</div>;
  }

  return (
    <div className="growth-card">
      <div className="growth-analytics-head">
        <div>
          <h1>Channel execution</h1>
          <p className="muted">
            Connect Mailchimp, Meta, and Google Ads — then schedule, send, and sync generated content to live channels.
          </p>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            Agents: {llmConfigured ? "live LLM" : "template"} · Content:{" "}
            {contentLlmConfigured ? "live LLM" : "template"}
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" disabled={!!busyId} onClick={() => void handleProcessDue()}>
          Process due posts
        </button>
      </div>

      {locked ? (
        <GrowthUpgradeBanner
          message={error}
          onUpgrade={isOwner ? (plan) => setCheckoutPlan(plan) : undefined}
        />
      ) : error ? (
        <div className="error-banner">{error}</div>
      ) : null}
      {message ? <div className="success-banner">{message}</div> : null}

      <section className="growth-settings-section">
        <h2>Integrations</h2>
        <ul className="growth-agent-list">
          {integrations.map((row) => (
            <li key={row.provider}>
              <strong>{row.provider}</strong> — {row.connected ? `connected (${row.accountLabel ?? "account"})` : "not connected"}
              {row.lastSyncAt ? <span className="muted"> · last sync {new Date(row.lastSyncAt).toLocaleString()}</span> : null}
              {row.connected ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ marginLeft: "0.5rem" }}
                  disabled={!!busyId}
                  onClick={() => void handleDisconnect(row.provider)}
                >
                  Disconnect
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="growth-action-row" style={{ marginTop: "0.75rem" }}>
          <select
            value={connectProvider}
            onChange={(e) => {
              setConnectProvider(e.target.value as GrowthChannelIntegration["provider"] | "");
              setCredentials({});
            }}
            disabled={locked}
          >
            <option value="">Connect provider…</option>
            <option value="mailchimp">Mailchimp</option>
            <option value="meta">Meta (Facebook Page)</option>
            <option value="google_ads">Google Ads</option>
          </select>
          {connectProvider
            ? INTEGRATION_FIELDS[connectProvider].map((field) => (
                <input
                  key={field.key}
                  type="password"
                  placeholder={field.placeholder}
                  aria-label={field.label}
                  value={credentials[field.key] ?? ""}
                  onChange={(e) => setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))}
                />
              ))
            : null}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!connectProvider || !!busyId || locked}
            onClick={() => void handleConnect()}
          >
            Save connection
          </button>
        </div>
      </section>

      <section className="growth-settings-section">
        <h2>Social posts ({socialPosts.length})</h2>
        <ul className="growth-optimization-list">
          {socialPosts.slice(0, 8).map((post) => (
            <li key={post.id} className="growth-optimization-item priority-medium">
              <div className="growth-optimization-main">
                <span className="growth-optimization-badge">{String(post.body.platform ?? "social")}</span>
                <strong>{post.title}</strong>
                <p className="muted">{String(post.body.caption ?? "").slice(0, 160)}</p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!!busyId || locked}
                onClick={() => void handleSendSocial(post.id)}
              >
                {integrations.find((i) => i.provider === "meta")?.connected ? "Post to Meta" : "Send / schedule"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {emailSequence ? (
        <section className="growth-settings-section">
          <h2>Email sequence</h2>
          <p className="muted">
            {emailSequence.title} — broadcast via Mailchimp when connected, otherwise PMail nurture to pipeline leads.
          </p>
          <div className="growth-action-row">
            {[1, 2, 3].map((step) => (
              <button
                key={step}
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={!!busyId || locked}
                onClick={() => void handleEmailBroadcast(step)}
              >
                Send step {step}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {adCopy ? (
        <section className="growth-settings-section">
          <h2>Ad copy pack</h2>
          <p className="muted">
            Google & Meta ad variants generated in Content Studio. Push to ad accounts from{" "}
            <Link to="/growth/ads-seo">Ads & SEO</Link>.
          </p>
        </section>
      ) : null}

      <section className="growth-settings-section">
        <h2>Delivery log</h2>
        {deliveries.length === 0 ? (
          <p className="muted">No channel deliveries yet.</p>
        ) : (
          <ul className="growth-agent-list">
            {deliveries.map((row) => (
              <li key={row.id}>
                <strong>{row.channelType}</strong> — {row.status}
                {typeof row.result?.method === "string" ? (
                  <span className="muted"> · {String(row.result.method)}</span>
                ) : null}
                {row.scheduledAt ? <span className="muted"> · scheduled {new Date(row.scheduledAt).toLocaleString()}</span> : null}
                {row.sentAt ? <span className="muted"> · sent {new Date(row.sentAt).toLocaleString()}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {checkoutPlan ? (
        <GrowthPlanCheckoutModal planSlug={checkoutPlan} onClose={() => setCheckoutPlan(null)} onComplete={() => void load()} />
      ) : null}
    </div>
  );
}
