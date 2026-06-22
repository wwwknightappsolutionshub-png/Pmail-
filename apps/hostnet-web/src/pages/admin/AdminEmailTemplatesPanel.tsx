import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../api/client";
import type { EmailTemplate } from "../../types/site";
import { EmailHtmlEditor } from "./EmailHtmlEditor";
import "./AdminDashboard.css";

const EMPTY_TEMPLATE: Omit<EmailTemplate, "id" | "createdAt" | "updatedAt"> = {
  slug: "",
  name: "",
  category: "transactional",
  subject: "",
  htmlBody: "<p>Hello {{name}},</p>",
  textBody: "Hello {{name}},",
  variables: [],
  isActive: true,
};

const TEMPLATE_GUIDANCE: Record<string, { summary: string; variables: string }> = {
  "pmail-refer-friend": {
    summary:
      "Workspace users see this invitation when they click Refer a friend in PMail+. Edits apply immediately to new referral sends.",
    variables: "senderName, senderEmail, referralUrl, productName, signatureFooter",
  },
  "auto-reply-upsell": {
    summary:
      "Sent automatically 3 days before complimentary Auto Reply access ends (day 11 of 14). The entitlement job uses slug auto-reply-upsell.",
    variables: "fullName, daysLeft, ctaUrl, productName",
  },
  "platform-tools-referral-upsell": {
    summary:
      "Sent when complimentary Platform workspace tools are about to expire after a referral reward trial.",
    variables: "fullName, ctaUrl, productName",
  },
};

const TEMPLATE_SAMPLE_VARIABLES: Record<string, Record<string, string>> = {
  "auto-reply-upsell": {
    fullName: "Jordan",
    daysLeft: "3",
    ctaUrl: "https://example.com/addons?highlight=auto-reply-functionality",
    productName: "PMail+",
  },
  "platform-tools-referral-upsell": {
    fullName: "Jordan",
    ctaUrl: "https://example.com/addons?highlight=platform-tools",
    productName: "PMail+",
  },
  "pmail-refer-friend": {
    senderName: "Jordan Lee",
    senderEmail: "jordan@example.com",
    referralUrl: "https://example.com/login?ref=jordan%40example.com",
    productName: "PMail+",
    signatureFooter: "Jordan Lee\njordan@example.com",
  },
};

function errMsg(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export function AdminEmailTemplatesPanel({
  onError,
  onMessage,
}: {
  onError: (msg: string) => void;
  onMessage: (msg: string) => void;
}) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(EMPTY_TEMPLATE);
  const [variablesJson, setVariablesJson] = useState("[]");
  const [busy, setBusy] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [testRecipient, setTestRecipient] = useState("");

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(templates.map((template) => template.category))).sort()],
    [templates],
  );

  const filteredTemplates = useMemo(() => {
    if (categoryFilter === "all") return templates;
    return templates.filter((template) => template.category === categoryFilter);
  }, [templates, categoryFilter]);

  const previewVariables = useMemo(() => {
    const slugSamples = draft.slug ? TEMPLATE_SAMPLE_VARIABLES[draft.slug] : undefined;
    try {
      const parsed: unknown = JSON.parse(variablesJson);
      if (!Array.isArray(parsed)) return slugSamples ?? {};
      const placeholders = Object.fromEntries(
        parsed.filter((v): v is string => typeof v === "string").map((key) => [key, `[${key}]`]),
      );
      return { ...placeholders, ...slugSamples };
    } catch {
      return slugSamples ?? {};
    }
  }, [variablesJson, draft.slug]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminEmailTemplates();
      setTemplates(res.templates);
      if (!creating && !selectedId && res.templates[0]) {
        setSelectedId(res.templates[0].id);
      } else if (selectedId && !res.templates.some((t) => t.id === selectedId)) {
        setSelectedId(res.templates[0]?.id ?? null);
      }
    } catch (err) {
      onError(errMsg(err, "Failed to load email templates"));
    } finally {
      setLoading(false);
    }
  }, [creating, selectedId, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (creating) {
      setDraft(EMPTY_TEMPLATE);
      setVariablesJson("[]");
      return;
    }
    if (selected) {
      setDraft({
        slug: selected.slug,
        name: selected.name,
        category: selected.category,
        subject: selected.subject,
        htmlBody: selected.htmlBody,
        textBody: selected.textBody,
        variables: selected.variables,
        isActive: selected.isActive,
      });
      setVariablesJson(JSON.stringify(selected.variables, null, 2));
    }
  }, [creating, selected?.id, selected?.updatedAt]);

  function parseVariables(): string[] | null {
    try {
      const parsed: unknown = JSON.parse(variablesJson);
      if (!Array.isArray(parsed) || !parsed.every((v) => typeof v === "string")) {
        onError("Variables must be a JSON array of strings.");
        return null;
      }
      return parsed;
    } catch {
      onError("Invalid variables JSON.");
      return null;
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const variables = parseVariables();
    if (!variables) return;

    setBusy(true);
    try {
      const body = { ...draft, textBody: draft.textBody || null, variables };

      if (creating) {
        const res = await api.createAdminEmailTemplate(body);
        setTemplates((prev) => [...prev, res.template]);
        setSelectedId(res.template.id);
        setCreating(false);
        onMessage(`Template “${res.template.name}” created`);
      } else if (selected) {
        const res = await api.updateAdminEmailTemplate(selected.id, body);
        setTemplates((prev) => prev.map((t) => (t.id === res.template.id ? res.template : t)));
        onMessage(`Template “${res.template.name}” saved`);
      }
    } catch (err) {
      onError(errMsg(err, "Save failed"));
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    if (!selected) return;
    const to = testRecipient.trim();
    if (!to.includes("@")) {
      onError("Enter a valid test recipient email.");
      return;
    }
    setBusy(true);
    try {
      await api.sendTestAdminEmailTemplate(selected.id, to, previewVariables);
      onMessage(`Test email sent to ${to}`);
    } catch (err) {
      onError(errMsg(err, "Test send failed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!selected) return;
    const guidance = TEMPLATE_GUIDANCE[selected.slug];
    const warning = guidance
      ? `\n\nThis is a system template (${selected.slug}). Deleting it may break automated emails until you recreate it.`
      : "";
    if (!window.confirm(`Delete template “${selected.name}”?${warning}`)) return;
    setBusy(true);
    try {
      await api.deleteAdminEmailTemplate(selected.id);
      setTemplates((prev) => prev.filter((t) => t.id !== selected.id));
      setSelectedId(null);
      onMessage("Template deleted");
    } catch (err) {
      onError(errMsg(err, "Delete failed"));
    } finally {
      setBusy(false);
    }
  }

  if (loading && templates.length === 0) return <p className="muted">Loading email templates…</p>;

  return (
    <div className="admin-editor-shell admin-email-shell">
      <aside className="admin-editor-rail card">
        <div className="admin-sections-rail-head">
          <strong>Email templates</strong>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setCreating(true);
              setSelectedId(null);
            }}
          >
            New
          </button>
        </div>
        <label className="admin-email-filter">
          Category
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? "All categories" : category}
              </option>
            ))}
          </select>
        </label>
        <ul className="admin-sections-list">
          {filteredTemplates.map((template) => (
            <li key={template.id}>
              <button
                type="button"
                className={`admin-sections-list-item${!creating && template.id === selectedId ? " active" : ""}`}
                onClick={() => {
                  setCreating(false);
                  setSelectedId(template.id);
                }}
              >
                <span className={`admin-sections-dot${template.isActive ? " live" : ""}`} />
                <span className="admin-sections-list-text">
                  <strong>{template.name}</strong>
                  <span className="muted">
                    {template.slug} · {template.category}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="admin-editor-main">
        {(creating || selected) ? (
          <form className="admin-email-editor card" onSubmit={save}>
            <header className="admin-email-template-head">
              <div>
                <h2>{creating ? "New template" : selected?.name}</h2>
                {!creating && selected ? <p className="muted">Updated {formatDate(selected.updatedAt)}</p> : null}
                {!creating && TEMPLATE_GUIDANCE[draft.slug] ? (
                  <p className="muted">
                    {TEMPLATE_GUIDANCE[draft.slug].summary}
                    <br />
                    Variables: {TEMPLATE_GUIDANCE[draft.slug].variables}.
                  </p>
                ) : null}
              </div>
              <label className="admin-toggle">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
                />
                Active
              </label>
            </header>

            <div className="admin-email-meta-grid">
              <label>
                Name
                <input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} required />
              </label>
              <label>
                Slug
                <input
                  value={draft.slug}
                  onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                  required
                  disabled={!creating}
                />
              </label>
              <label>
                Category
                <input value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} />
              </label>
              <label>
                Subject
                <input value={draft.subject} onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))} required />
              </label>
            </div>

            <EmailHtmlEditor
              htmlBody={draft.htmlBody}
              onChange={(htmlBody) => setDraft((d) => ({ ...d, htmlBody }))}
              previewVariables={previewVariables}
            />

            <div className="admin-email-extra-grid">
              <label>
                Plain text body
                <textarea
                  rows={4}
                  value={draft.textBody ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, textBody: e.target.value || null }))}
                  className="admin-status-mono"
                  spellCheck={false}
                />
              </label>
              <label>
                Variable names (JSON array)
                <textarea
                  rows={4}
                  value={variablesJson}
                  onChange={(e) => setVariablesJson(e.target.value)}
                  className="admin-status-mono"
                  spellCheck={false}
                />
              </label>
            </div>

            {!creating && selected ? (
              <div className="admin-email-test-row">
                <label>
                  Send test to
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={(event) => setTestRecipient(event.target.value)}
                    placeholder="you@example.com"
                  />
                </label>
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void sendTest()}>
                  Send test email
                </button>
              </div>
            ) : null}

            <div className="editor-actions admin-sections-actions">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {creating ? "Create template" : "Save changes"}
              </button>
              {creating ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setCreating(false);
                    setSelectedId(templates[0]?.id ?? null);
                  }}
                >
                  Cancel
                </button>
              ) : (
                <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void remove()}>
                  Delete
                </button>
              )}
            </div>
          </form>
        ) : (
          <div className="card admin-sections-empty">
            <p className="muted">Select a template or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
