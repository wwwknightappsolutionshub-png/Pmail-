import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import type {
  GrowthAgentMeta,
  GrowthAgentRun,
  GrowthContentBundleSummary,
  GrowthJob,
  GrowthLeadStats,
  GrowthWorkspace,
} from "../../types/growth";
import "./Growth.css";

const STATUS_LABELS: Record<string, string> = {
  onboarding: "Getting started",
  foundation_ready: "Foundation ready",
  content_generating: "Generating content",
  content_ready: "Content ready",
  capture_ready: "Lead capture live",
  chatbot_ready: "Chatbot live",
  analytics_ready: "Analytics live",
  automations_ready: "Automations active",
  packaging_ready: "Packaging configured",
  optimization_ready: "Optimization ready",
  channels_ready: "All systems go",
};

type PipelineStep = {
  id: string;
  label: string;
  ready: boolean;
  href?: string;
};

function formatStatus(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

function jobStatusClass(status: string): string {
  if (status === "completed" || status === "done") return "success";
  if (status === "failed" || status === "error") return "failed";
  if (status === "running" || status === "processing") return "running";
  return "pending";
}

export function GrowthDashboardPage() {
  const [workspace, setWorkspace] = useState<GrowthWorkspace | null>(null);
  const [jobs, setJobs] = useState<GrowthJob[]>([]);
  const [runs, setRuns] = useState<GrowthAgentRun[]>([]);
  const [agents, setAgents] = useState<GrowthAgentMeta[]>([]);
  const [bundle, setBundle] = useState<GrowthContentBundleSummary | null>(null);
  const [leadStats, setLeadStats] = useState<GrowthLeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const [ws, jobRes, runRes, agentRes, bundleRes, statsRes] = await Promise.all([
          api.growthWorkspace(),
          api.growthJobs(),
          api.growthAgentRuns(),
          api.growthAgents(),
          api.growthContentBundle(),
          api.growthLeadStats().catch(() => ({ stats: null })),
        ]);
        if (cancelled) return;
        setWorkspace(ws.workspace);
        setJobs(jobRes.jobs);
        setRuns(runRes.runs);
        setAgents(agentRes.agents);
        setBundle(bundleRes.summary);
        setLeadStats(statsRes.stats);
        setError("");
        setLoading(false);

        const generating =
          bundleRes.workspaceStatus === "content_generating" ||
          (ws.workspace?.wizard.completed &&
            bundleRes.workspaceStatus === "foundation_ready" &&
            !bundleRes.summary.hasBundle);
        const awaitingAutomations =
          ws.workspace?.status === "content_ready" ||
          ws.workspace?.status === "capture_ready" ||
          ws.workspace?.status === "chatbot_ready" ||
          ws.workspace?.status === "analytics_ready" ||
          (bundleRes.summary.hasBundle &&
            ws.workspace?.status !== "channels_ready" &&
            ws.workspace?.status !== "optimization_ready" &&
            ws.workspace?.status !== "packaging_ready" &&
            ws.workspace?.status !== "automations_ready" &&
            !generating);
        if (generating || awaitingAutomations) {
          pollTimer = setTimeout(() => void load(), 5000);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load dashboard");
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, []);

  const flags = useMemo(() => {
    const status = workspace?.status ?? "";
    return {
      contentReady: [
        "content_ready",
        "capture_ready",
        "chatbot_ready",
        "analytics_ready",
        "automations_ready",
        "packaging_ready",
        "optimization_ready",
        "channels_ready",
      ].includes(status),
      captureReady: [
        "capture_ready",
        "chatbot_ready",
        "analytics_ready",
        "automations_ready",
        "packaging_ready",
        "optimization_ready",
        "channels_ready",
      ].includes(status),
      chatbotReady: [
        "chatbot_ready",
        "analytics_ready",
        "automations_ready",
        "packaging_ready",
        "optimization_ready",
        "channels_ready",
      ].includes(status),
      analyticsReady: [
        "analytics_ready",
        "automations_ready",
        "packaging_ready",
        "optimization_ready",
        "channels_ready",
      ].includes(status),
      automationsReady: ["automations_ready", "packaging_ready", "optimization_ready", "channels_ready"].includes(status),
      packagingReady: ["packaging_ready", "optimization_ready", "channels_ready"].includes(status),
      optimizationReady: ["optimization_ready", "channels_ready"].includes(status),
      channelsReady: status === "channels_ready",
      generating: status === "content_generating",
      wizardDone: Boolean(workspace?.wizard.completed),
    };
  }, [workspace]);

  const pipelineSteps: PipelineStep[] = useMemo(
    () => [
      { id: "wizard", label: "Wizard", ready: flags.wizardDone, href: "/growth/onboarding" },
      { id: "content", label: "Content", ready: flags.contentReady, href: "/growth/studio" },
      { id: "capture", label: "Capture", ready: flags.captureReady, href: "/growth/pipeline" },
      { id: "chatbot", label: "Chatbot", ready: flags.chatbotReady, href: "/growth/chatbot" },
      { id: "analytics", label: "Analytics", ready: flags.analyticsReady, href: "/growth/analytics" },
      { id: "automations", label: "Automations", ready: flags.automationsReady, href: "/growth/automations" },
      { id: "optimize", label: "Optimize", ready: flags.optimizationReady, href: "/growth/optimization" },
      { id: "channels", label: "Channels", ready: flags.channelsReady, href: "/growth/channels" },
    ],
    [flags],
  );

  const completedAgents = runs.filter((r) => r.status === "completed" || r.status === "done").length;
  const assetCount = bundle?.hasBundle ? Math.max(0, (bundle.totalAssets ?? 1) - 1) : 0;

  async function handleRegenerate() {
    setActionBusy(true);
    setActionMessage("");
    setError("");
    try {
      await api.growthContentRegenerate();
      setActionMessage("Regenerating content bundle from your wizard answers…");
      window.setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to queue regeneration");
    } finally {
      setActionBusy(false);
    }
  }

  async function handlePublishAll() {
    setActionBusy(true);
    setActionMessage("");
    setError("");
    try {
      const result = await api.growthContentPublishAll();
      setActionMessage(`Published ${result.publishedCount} page(s) to public_html in your panel.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to publish content");
    } finally {
      setActionBusy(false);
    }
  }

  if (loading && !workspace) {
    return (
      <div className="growth-dashboard">
        <div className="growth-dashboard-skeleton growth-card">Loading command center…</div>
      </div>
    );
  }

  return (
    <div className="growth-dashboard">
      <header className="growth-dashboard-hero">
        <div className="growth-dashboard-hero-text">
          <p className="growth-dashboard-eyebrow">Command center</p>
          <h1>Your marketing workspace</h1>
          <p className="muted">
            Wizard insights, published content, live capture, and pipeline — everything in one place.
          </p>
        </div>
        {workspace ? (
          <div className={`growth-dashboard-status-pill${flags.channelsReady ? " ready" : ""}`}>
            {formatStatus(workspace.status)}
          </div>
        ) : null}
      </header>

      {error ? <div className="error-banner">{error}</div> : null}
      {actionMessage ? <div className="success-banner">{actionMessage}</div> : null}

      {flags.generating ? (
        <div className="growth-dashboard-alert">
          Generating your day-one content bundle… this usually takes under a minute.
        </div>
      ) : null}

      {!flags.wizardDone ? (
        <div className="growth-dashboard-cta growth-card">
          <div>
            <strong>Finish onboarding</strong>
            <p className="muted">Complete the 6-step wizard to generate your marketing foundation.</p>
          </div>
          <Link to="/growth/onboarding" className="btn btn-primary btn-sm">
            Continue wizard
          </Link>
        </div>
      ) : null}

      <section className="growth-dashboard-stats" aria-label="Key metrics">
        <article className="growth-dashboard-stat">
          <span className="growth-dashboard-stat-value">{assetCount}</span>
          <span className="growth-dashboard-stat-label">Content assets</span>
        </article>
        <article className="growth-dashboard-stat">
          <span className="growth-dashboard-stat-value">{completedAgents}</span>
          <span className="growth-dashboard-stat-label">Agents complete</span>
        </article>
        <article className="growth-dashboard-stat">
          <span className="growth-dashboard-stat-value">{leadStats?.totalLeads ?? "—"}</span>
          <span className="growth-dashboard-stat-label">Total leads</span>
        </article>
        <article className="growth-dashboard-stat">
          <span className="growth-dashboard-stat-value">{leadStats?.last7Days ?? "—"}</span>
          <span className="growth-dashboard-stat-label">Leads this week</span>
        </article>
      </section>

      <section className="growth-card growth-dashboard-progress" aria-label="Setup progress">
        <div className="growth-dashboard-section-head">
          <h2>Setup progress</h2>
          <span className="muted">
            {pipelineSteps.filter((s) => s.ready).length} of {pipelineSteps.length} live
          </span>
        </div>
        <ol className="growth-dashboard-pipeline">
          {pipelineSteps.map((step) => (
            <li key={step.id} className={step.ready ? "done" : ""}>
              {step.href ? (
                <Link to={step.href} className="growth-dashboard-pipeline-link">
                  <span className="growth-dashboard-pipeline-dot" aria-hidden="true" />
                  <span>{step.label}</span>
                </Link>
              ) : (
                <>
                  <span className="growth-dashboard-pipeline-dot" aria-hidden="true" />
                  <span>{step.label}</span>
                </>
              )}
            </li>
          ))}
        </ol>
      </section>

      {flags.contentReady ? (
        <section className="growth-card growth-dashboard-actions" aria-label="Quick actions">
          <h2>Quick actions</h2>
          <div className="growth-dashboard-action-grid">
            {flags.captureReady ? (
              <Link to="/growth/pipeline" className="growth-dashboard-action-card primary">
                <strong>Lead pipeline</strong>
                <span className="muted">Manage and move leads</span>
              </Link>
            ) : null}
            <Link to="/growth/studio" className="growth-dashboard-action-card">
              <strong>Content studio</strong>
              <span className="muted">Review & publish assets</span>
            </Link>
            {flags.analyticsReady ? (
              <Link to="/growth/analytics" className="growth-dashboard-action-card">
                <strong>Analytics</strong>
                <span className="muted">Traffic & conversions</span>
              </Link>
            ) : null}
            {flags.optimizationReady ? (
              <Link to="/growth/optimization" className="growth-dashboard-action-card">
                <strong>Optimization</strong>
                <span className="muted">AI weekly brief</span>
              </Link>
            ) : null}
            {flags.channelsReady ? (
              <Link to="/growth/channels" className="growth-dashboard-action-card">
                <strong>Channels</strong>
                <span className="muted">Social & email send</span>
              </Link>
            ) : null}
            {flags.channelsReady ? (
              <Link to="/growth/ads-seo" className="growth-dashboard-action-card">
                <strong>Ads & SEO</strong>
                <span className="muted">Campaigns & ranks</span>
              </Link>
            ) : null}
            {flags.automationsReady ? (
              <Link to="/growth/automations" className="growth-dashboard-action-card">
                <strong>Automations</strong>
                <span className="muted">Nurture & rules</span>
              </Link>
            ) : null}
            <button
              type="button"
              className="growth-dashboard-action-card as-button"
              disabled={actionBusy}
              onClick={() => void handlePublishAll()}
            >
              <strong>Publish to site</strong>
              <span className="muted">Push pages to panel</span>
            </button>
            <button
              type="button"
              className="growth-dashboard-action-card as-button"
              disabled={actionBusy}
              onClick={() => void handleRegenerate()}
            >
              <strong>Regenerate bundle</strong>
              <span className="muted">Re-run from wizard</span>
            </button>
          </div>
        </section>
      ) : null}

      <div className="growth-dashboard-panels">
        <section className="growth-card growth-dashboard-panel">
          <div className="growth-dashboard-section-head">
            <h2>Job queue</h2>
            <span className="muted">{jobs.length} job{jobs.length === 1 ? "" : "s"}</span>
          </div>
          <ul className="growth-dashboard-activity">
            {jobs.length === 0 ? <li className="muted">No jobs yet.</li> : null}
            {jobs.slice(0, 6).map((job) => (
              <li key={job.id}>
                <div className="growth-dashboard-activity-main">
                  <strong>{job.jobType}</strong>
                  {job.errorMessage ? <p className="muted">{job.errorMessage}</p> : null}
                </div>
                <span className={`growth-dashboard-chip ${jobStatusClass(job.status)}`}>{job.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="growth-card growth-dashboard-panel">
          <div className="growth-dashboard-section-head">
            <h2>Agent runs</h2>
            <span className="muted">{runs.length} run{runs.length === 1 ? "" : "s"}</span>
          </div>
          <ul className="growth-dashboard-activity">
            {runs.length === 0 ? (
              <li className="muted">Complete the wizard to queue analysis agents.</li>
            ) : null}
            {runs.slice(0, 6).map((run) => (
              <li key={run.id}>
                <div className="growth-dashboard-activity-main">
                  <strong>{run.agentKey.replace(/_/g, " ")}</strong>
                  {run.output?.generationMode ? (
                    <p className="muted">Mode: {String(run.output.generationMode)}</p>
                  ) : null}
                </div>
                <span className={`growth-dashboard-chip ${jobStatusClass(run.status)}`}>{run.status}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="growth-card growth-dashboard-panel">
        <div className="growth-dashboard-section-head">
          <h2>Registered agents</h2>
          <span className="muted">{agents.length} agents</span>
        </div>
        <ul className="growth-dashboard-agent-grid">
          {agents.map((agent) => (
            <li key={agent.key}>
              <strong>{agent.label}</strong>
              <p className="muted">{agent.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
