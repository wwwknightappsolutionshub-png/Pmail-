import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import "./MailViews.css";
import "./PlatformToolsPanel.css";
import "./AutoReplyPanel.css";
import { PlatformToolsResults, PlatformToolsShell } from "./PlatformToolsShell";

function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loader());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refresh };
}

/** Email-style preview: always light paper so HTML body text stays readable in dark UI. */
function wrapAutoReplyPreviewHtml(body: string): string {
  const trimmed = body.trim();
  const inner = trimmed.startsWith("<") ? trimmed : `<p>${trimmed.replace(/</g, "&lt;")}</p>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0.65rem 0.85rem;background:#ffffff;color:#0f172a;font-family:system-ui,-apple-system,sans-serif;font-size:0.9rem;line-height:1.55;}
    p{margin:0 0 0.5rem;} p:last-child{margin-bottom:0;}
    a{color:#0f766e;}
  </style></head><body>${inner}</body></html>`;
}

function AutoReplyPreview({ body, title }: { body: string; title: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const srcDoc = useMemo(() => wrapAutoReplyPreviewHtml(body), [body]);

  const syncHeight = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc?.body) return;
    iframe.style.height = `${Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight)}px`;
  }, []);

  useEffect(() => {
    syncHeight();
  }, [srcDoc, syncHeight]);

  return (
    <aside className="auto-reply-preview-card">
      <iframe ref={iframeRef} title={title} sandbox="" srcDoc={srcDoc} scrolling="no" onLoad={syncHeight} />
    </aside>
  );
}

export function AutoReplyPanel() {
  const { data, loading, error, refresh } = useLoad(() => api.composeSettings().then((r) => r.settings));
  const [replyForm, setReplyForm] = useState({ id: "", name: "", subject: "", body: "", enabled: true });
  const [saving, setSaving] = useState(false);

  const resetAutoReplyForm = () => setReplyForm({ id: "", name: "", subject: "", body: "", enabled: true });

  const saveAutoReply = async () => {
    setSaving(true);
    try {
      const payload = {
        name: replyForm.name,
        subject: replyForm.subject,
        body: replyForm.body,
        enabled: replyForm.enabled,
      };
      if (replyForm.id) {
        await api.updateAutoReply(replyForm.id, payload);
      } else {
        await api.createAutoReply(payload);
      }
      resetAutoReplyForm();
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="mail-view-empty platform-tools-panel">Loading auto-reply settings…</p>;
  if (error) return <p className="platform-tools-alert platform-tools-alert--error" role="alert">{error}</p>;
  if (!data) return null;

  const entitlement = data.autoReplyEntitlement;
  const masterDisabled = entitlement.gated && !entitlement.entitled;
  const masterOn = data.autoReplyEnabled && !masterDisabled;

  return (
    <PlatformToolsShell layout="split" className="auto-reply-panel">
      <header className="mail-view-header platform-tools-hero platform-tools-split-header">
        <div className="platform-tools-hero__text">
          <p className="platform-tools-hero__eyebrow">Platform tool</p>
          <h2>Auto-reply</h2>
          <p>Send automatic vacation or triggered replies to new inbound mail. Create rules, preview content, and choose which rule is active.</p>
        </div>
      </header>

      {masterDisabled ? (
        <p className="platform-tools-alert platform-tools-alert--error platform-tools-split-header" role="alert">
          Auto-reply requires an active subscription
          {entitlement.daysLeft > 0 ? ` (complimentary period: ${entitlement.daysLeft} days left)` : ""}.
        </p>
      ) : null}

      <div className="platform-tools-split-primary">
        <div className="auto-reply-status-card">
          <div className="auto-reply-status-card__copy">
            <strong>Master auto-reply</strong>
            <p>When enabled, PMail+ sends your active rule to new inbound messages.</p>
            <label className="feature-toggle">
              <input
                type="checkbox"
                checked={data.autoReplyEnabled}
                disabled={masterDisabled}
                onChange={(e) => void api.updateComposeSettings({ autoReplyEnabled: e.target.checked }).then(refresh)}
              />
              <span>Enable auto-replies for incoming mail</span>
            </label>
          </div>
          <span className={`auto-reply-status-badge auto-reply-status-badge--${masterOn ? "on" : "off"}`}>
            <span className="auto-reply-status-badge__dot" aria-hidden="true" />
            {masterOn ? "Active" : "Off"}
          </span>
        </div>

        <div className="auto-reply-composer">
          <h3 className="auto-reply-composer__title">{replyForm.id ? "Edit rule" : "Create rule"}</h3>
          <div className="auto-reply-composer__grid">
            <label>
              <span>Rule name</span>
              <input
                placeholder="e.g. Summer vacation"
                value={replyForm.name}
                onChange={(e) => setReplyForm({ ...replyForm, name: e.target.value })}
              />
            </label>
            <label>
              <span>Subject line</span>
              <input
                placeholder="Out of office"
                value={replyForm.subject}
                onChange={(e) => setReplyForm({ ...replyForm, subject: e.target.value })}
              />
            </label>
            <label>
              <span>Reply body (HTML supported)</span>
              <textarea
                placeholder="Thank you for your message. I am currently away and will respond when I return."
                value={replyForm.body}
                onChange={(e) => setReplyForm({ ...replyForm, body: e.target.value })}
              />
            </label>
            <label className="feature-toggle">
              <input
                type="checkbox"
                checked={replyForm.enabled}
                onChange={(e) => setReplyForm({ ...replyForm, enabled: e.target.checked })}
              />
              <span>Enable this rule when saved</span>
            </label>
          </div>
          <div className="auto-reply-rule-card__actions">
            {replyForm.id ? (
              <button type="button" className="mail-toolbar-btn" onClick={resetAutoReplyForm}>
                Cancel edit
              </button>
            ) : null}
            <button
              type="button"
              className="mail-toolbar-btn mail-toolbar-btn--primary"
              disabled={saving || !replyForm.name.trim() || !replyForm.subject.trim()}
              onClick={() => void saveAutoReply()}
            >
              {saving ? "Saving…" : replyForm.id ? "Update rule" : "Add rule"}
            </button>
          </div>
        </div>
      </div>

      <div className="platform-tools-split-secondary">
        <PlatformToolsResults title="Your rules">
          <div className="auto-reply-rule-list">
            {data.autoReplies.map((rule) => {
              const isActive = data.activeAutoReplyId === rule.id;
              return (
                <article key={rule.id} className={`auto-reply-rule-card${isActive ? " is-active" : ""}`}>
                  <div className="auto-reply-rule-card__head">
                    <div>
                      <strong>{rule.name}</strong>
                      <p className="auto-reply-rule-card__subject">{rule.subject}</p>
                    </div>
                    {isActive ? (
                      <span className="auto-reply-status-badge auto-reply-status-badge--on">
                        <span className="auto-reply-status-badge__dot" aria-hidden="true" />
                        Live rule
                      </span>
                    ) : null}
                  </div>
                  <AutoReplyPreview body={rule.body} title={`${rule.name} preview`} />
                  <div className="auto-reply-rule-card__actions">
                    <button
                      type="button"
                      className="mail-toolbar-btn"
                      onClick={() =>
                        setReplyForm({
                          id: rule.id,
                          name: rule.name,
                          subject: rule.subject,
                          body: rule.body,
                          enabled: rule.enabled,
                        })
                      }
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={`mail-toolbar-btn${isActive ? " is-active" : ""}`}
                      onClick={() => void api.updateComposeSettings({ activeAutoReplyId: rule.id }).then(refresh)}
                    >
                      {isActive ? "Active" : "Set active"}
                    </button>
                    <button type="button" className="mail-toolbar-btn" onClick={() => void api.deleteAutoReply(rule.id).then(refresh)}>
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
            {data.autoReplies.length === 0 ? (
              <p className="platform-tools-empty">No rules yet. Create your first auto-reply using the form on the left.</p>
            ) : null}
          </div>
        </PlatformToolsResults>
      </div>
    </PlatformToolsShell>
  );
}
