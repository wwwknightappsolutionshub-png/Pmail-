import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import type { GrowthChatbotConfig, GrowthChatSessionSummary } from "../../types/growth";
import "./Growth.css";

export function GrowthChatbotPage() {
  const [config, setConfig] = useState<GrowthChatbotConfig | null>(null);
  const [sessions, setSessions] = useState<GrowthChatSessionSummary[]>([]);
  const [tenantSlug, setTenantSlug] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [botRes, sessionRes, meRes] = await Promise.all([
          api.growthChatbot(),
          api.growthChatSessions(),
          api.panelMe(),
        ]);
        if (cancelled) return;
        setConfig(botRes.configs[0] ?? null);
        setSessions(sessionRes.sessions);
        setTenantSlug(meRes.account.tenant.slug);
        setError("");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load chatbot");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="growth-card">Loading chatbot…</div>;
  }

  return (
    <div className="growth-chatbot-page">
      <div className="growth-card">
        <h1>Qualification chatbot</h1>
        <p className="muted">
          Wizard-aware conversation flow embedded on your published pages. Completed chats become scored leads in your pipeline.
        </p>
        {error ? <div className="error-banner">{error}</div> : null}

        {config ? (
          <>
            <div className="growth-capture-info">
              <strong>{config.title}</strong>
              <p className="muted">{config.welcomeMessage}</p>
              <p className="muted" style={{ fontSize: "0.78rem" }}>
                Public API: <code>/api/public/growth/{tenantSlug}/chatbot</code>
                {" · "}
                <Link to="/growth/studio">Republish pages</Link> to embed the floating chat widget.
              </p>
            </div>

            <h2 style={{ marginTop: "1.25rem", fontSize: "1rem" }}>Conversation flow ({config.steps.length} steps)</h2>
            <ol className="growth-chatbot-steps">
              {config.steps.map((step) => (
                <li key={step.id}>
                  <span className={`growth-chatbot-step-kind ${step.kind}`}>{step.kind === "ask" ? "Ask" : "Say"}</span>
                  <span>{step.message}</span>
                  {step.field ? <span className="muted"> → {step.field}</span> : null}
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="muted">Chatbot not configured yet. Complete onboarding to generate your qualification bot.</p>
        )}
      </div>

      <div className="growth-card">
        <h2 style={{ margin: 0, fontSize: "1rem" }}>Recent chat sessions</h2>
        <ul className="growth-agent-list" style={{ marginTop: "0.75rem" }}>
          {sessions.length === 0 ? <li className="muted">No chat sessions yet.</li> : null}
          {sessions.map((session) => (
            <li key={session.id}>
              <strong>{session.status}</strong>
              {session.sourcePage ? <span className="muted"> · {session.sourcePage}</span> : null}
              {session.leadId ? (
                <>
                  {" "}
                  ·{" "}
                  <Link to="/growth/pipeline">View in pipeline</Link>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
