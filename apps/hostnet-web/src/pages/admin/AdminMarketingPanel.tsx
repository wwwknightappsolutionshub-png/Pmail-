import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../../api/client";
import type {
  MarketingAiSessionSummary,
  MarketingPlatformConfig,
  MarketingPlaybook,
} from "../../types/site";
import "./AdminDashboard.css";

type AiProvider = MarketingPlatformConfig["aiProvider"];

const AI_PROVIDERS: { value: AiProvider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
  { value: "custom", label: "Custom (OpenAI-compatible)" },
];

function errMsg(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export function AdminMarketingPanel({
  onError,
  onMessage,
}: {
  onError: (msg: string) => void;
  onMessage: (msg: string) => void;
}) {
  const [config, setConfig] = useState<MarketingPlatformConfig | null>(null);
  const [playbooks, setPlaybooks] = useState<MarketingPlaybook[]>([]);
  const [sessions, setSessions] = useState<MarketingAiSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [provider, setProvider] = useState<AiProvider>("openai");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [configBusy, setConfigBusy] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState("");
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [playbookBusy, setPlaybookBusy] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const res = await api.adminMarketingSessions();
      setSessions(res.sessions);
    } catch (err) {
      onError(errMsg(err, "Failed to load AI sessions"));
    }
  }, [onError]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, playbooksRes, sessionsRes] = await Promise.all([
        api.adminMarketingConfig(),
        api.adminMarketingPlaybooks(),
        api.adminMarketingSessions(),
      ]);
      setConfig(configRes.config);
      setProvider(configRes.config.aiProvider);
      setModel(configRes.config.aiModel ?? "");
      setBaseUrl(configRes.config.aiBaseUrl ?? "");
      setPlaybooks(playbooksRes.playbooks);
      setSessions(sessionsRes.sessions);
    } catch (err) {
      onError(errMsg(err, "Failed to load marketing engine"));
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveConfig(e: FormEvent) {
    e.preventDefault();
    setConfigBusy(true);
    try {
      const res = await api.updateAdminMarketingConfig({
        aiProvider: provider,
        aiModel: model.trim() || null,
        aiApiKey: apiKey.trim() || null,
        aiBaseUrl: baseUrl.trim() || null,
      });
      setConfig(res.config);
      setApiKey("");
      onMessage("AI configuration saved");
    } catch (err) {
      onError(errMsg(err, "Config save failed"));
    } finally {
      setConfigBusy(false);
    }
  }

  async function runAssistant(userPrompt: string, opts?: { sessionId?: string; playbookId?: string }) {
    if (!userPrompt.trim()) return;
    setChatBusy(true);
    setPlaybookBusy(opts?.playbookId ?? null);
    try {
      const res = await api.adminMarketingAssistant({
        prompt: userPrompt.trim(),
        sessionId: opts?.sessionId ?? sessionId ?? undefined,
        context: opts?.playbookId ? { playbookId: opts.playbookId } : undefined,
      });
      setSessionId(res.sessionId);
      setReply(res.reply);
      setRecommendations(res.recommendations);
      setPrompt("");
      await loadSessions();
      onMessage("Assistant reply ready");
    } catch (err) {
      onError(errMsg(err, "Assistant request failed"));
    } finally {
      setChatBusy(false);
      setPlaybookBusy(null);
    }
  }

  async function openSession(id: string) {
    setChatBusy(true);
    try {
      const res = await api.adminMarketingSession(id);
      setSessionId(res.session.id);
      const lastAssistant = [...res.session.messages].reverse().find((m) => m.role === "assistant");
      setReply(lastAssistant?.content ?? "");
      setRecommendations(res.session.recommendations);
      onMessage(`Loaded session “${res.session.title}”`);
    } catch (err) {
      onError(errMsg(err, "Failed to load session"));
    } finally {
      setChatBusy(false);
    }
  }

  async function deleteSession(id: string) {
    if (!window.confirm("Delete this AI session?")) return;
    try {
      await api.deleteAdminMarketingSession(id);
      if (sessionId === id) {
        setSessionId(null);
        setReply("");
        setRecommendations([]);
      }
      await loadSessions();
      onMessage("Session deleted");
    } catch (err) {
      onError(errMsg(err, "Delete session failed"));
    }
  }

  function startNewSession() {
    setSessionId(null);
    setReply("");
    setRecommendations([]);
    setPrompt("");
  }

  if (loading && !config) return <p className="muted">Loading marketing engine…</p>;

  return (
    <div className="admin-billing-module">
      <div className="admin-stat-grid">
        <div className="admin-stat-card highlight">
          <span className="admin-stat-label">AI provider</span>
          <span className="admin-stat-value" style={{ fontSize: "1.25rem" }}>
            {AI_PROVIDERS.find((p) => p.value === config?.aiProvider)?.label ?? "—"}
          </span>
          <span className="admin-stat-sub">{config?.aiModel ?? "No model configured"}</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">API key</span>
          <span className="admin-stat-value" style={{ fontSize: "1.25rem" }}>
            {config?.hasApiKey ? "Configured" : "Missing"}
          </span>
          <span className="admin-stat-sub">
            {config?.updatedAt ? `Updated ${formatDate(config.updatedAt)}` : "Not saved yet"}
          </span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Playbooks</span>
          <span className="admin-stat-value">{playbooks.length}</span>
          <span className="admin-stat-sub">One-click growth workflows</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">AI sessions</span>
          <span className="admin-stat-value">{sessions.length}</span>
          <span className="admin-stat-sub">Saved strategist conversations</span>
        </div>
      </div>

      <div className="card editor-card">
        <strong>AI configuration</strong>
        <form className="form-grid admin-addon-edit-form" onSubmit={saveConfig}>
          <label>
            Provider
            <select value={provider} onChange={(e) => setProvider(e.target.value as AiProvider)}>
              {AI_PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Model
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={provider === "openai" ? "gpt-4o" : provider === "anthropic" ? "claude-sonnet-4-20250514" : "model-id"}
            />
          </label>
          <label>
            API key
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config?.hasApiKey ? "Leave blank to keep existing key" : "sk-…"}
              autoComplete="off"
            />
          </label>
          {provider === "custom" ? (
            <label>
              Base URL
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.example.com/v1"
              />
            </label>
          ) : null}
          <div className="editor-actions">
            <button type="submit" className="btn btn-primary" disabled={configBusy}>
              Save configuration
            </button>
          </div>
        </form>
      </div>

      <div className="admin-addon-group">
        <h3 className="admin-addon-group-title">Conversion playbooks</h3>
        <div className="admin-stat-grid">
          {playbooks.map((playbook) => (
            <button
              key={playbook.id}
              type="button"
              className="admin-stat-card"
              style={{ textAlign: "left", cursor: "pointer", border: "1px solid var(--admin-border)" }}
              disabled={chatBusy}
              onClick={() => void runAssistant(playbook.prompt, { playbookId: playbook.id })}
            >
              <span className="admin-stat-label">{playbook.title}</span>
              <span className="admin-stat-sub" style={{ marginTop: "0.35rem" }}>
                {playbook.description}
              </span>
              <span className="badge" style={{ marginTop: "0.65rem", alignSelf: "flex-start" }}>
                {playbookBusy === playbook.id ? "Running…" : "Run playbook"}
              </span>
            </button>
          ))}
          {playbooks.length === 0 ? <p className="muted">No playbooks available.</p> : null}
        </div>
      </div>

      <div className="admin-sections-layout">
        <div className="card admin-sections-rail">
          <div className="admin-sections-rail-head">
            <strong>Sessions</strong>
            <button type="button" className="btn btn-secondary btn-sm" onClick={startNewSession}>
              New
            </button>
          </div>
          <ul className="admin-sections-list">
            {sessions.map((session) => (
              <li key={session.id}>
                <button
                  type="button"
                  className={`admin-sections-list-item${sessionId === session.id ? " active" : ""}`}
                  onClick={() => void openSession(session.id)}
                >
                  <span className="admin-sections-list-text">
                    <strong>{session.title}</strong>
                    <span className="muted">{formatDate(session.updatedAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {sessions.length === 0 ? (
            <p className="muted admin-sections-rail-foot">No sessions yet — run a playbook or ask a question.</p>
          ) : null}
          {sessionId ? (
            <div className="admin-sections-rail-foot">
              <button
                type="button"
                className="btn btn-danger btn-sm btn-block"
                onClick={() => void deleteSession(sessionId)}
              >
                Delete session
              </button>
            </div>
          ) : null}
        </div>

        <div className="card admin-sections-editor">
          <div className="admin-sections-editor-head">
            <div>
              <h2>Marketing strategist</h2>
              <p className="muted">
                SEO, paid acquisition, landing copy, and funnel optimization — powered by your configured AI provider.
              </p>
            </div>
            {sessionId ? <span className="badge">Session active</span> : <span className="badge">New session</span>}
          </div>

          {reply ? (
            <div
              className="admin-sections-preview-card"
              style={{ maxWidth: "none", marginBottom: "1rem" }}
            >
              <p className="admin-preview-eyebrow">Assistant reply</p>
              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  fontFamily: "inherit",
                  fontSize: "0.9rem",
                  lineHeight: 1.55,
                  color: "var(--admin-text)",
                }}
              >
                {reply}
              </pre>
            </div>
          ) : (
            <p className="muted admin-preview-body">
              Ask about keyword strategy, ad copy, CRO experiments, or run a playbook above.
            </p>
          )}

          {recommendations.length > 0 ? (
            <div style={{ marginBottom: "1rem" }}>
              <strong style={{ fontSize: "0.82rem" }}>Recommendations</strong>
              <ul className="admin-preview-bullets">
                {recommendations.map((rec) => (
                  <li key={rec}>{rec}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runAssistant(prompt);
            }}
          >
            <label>
              Your prompt
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="How should we position PMail+ add-ons against Google Workspace for churches?"
                disabled={chatBusy}
              />
            </label>
            <div className="editor-actions">
              <button type="submit" className="btn btn-primary" disabled={chatBusy || !prompt.trim()}>
                {chatBusy ? "Thinking…" : "Send to assistant"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
