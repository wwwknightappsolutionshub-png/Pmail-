import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import "./MailViews.css";

function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loader());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function WorkspaceCrmPanel() {
  const { data: stages, loading: stagesLoading } = useLoad(() => api.workspaceStages().then((r) => r.stages));
  const [search, setSearch] = useState("");
  const { data: records, loading, error, refresh } = useLoad(
    () => api.workspaceCrm(search || undefined).then((r) => r.records),
    [search],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", organization: "", stage: "lead", notes: "" });
  const [detailForm, setDetailForm] = useState({ name: "", phone: "", organization: "", stage: "lead", notes: "" });

  const selected = records?.find((r) => r.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    setDetailForm({
      name: selected.name,
      phone: selected.phone ?? "",
      organization: selected.organization ?? "",
      stage: selected.stage,
      notes: selected.notes ?? "",
    });
  }, [selected]);

  const create = async () => {
    await api.createCrmRecord(form);
    setForm({ name: "", email: "", phone: "", organization: "", stage: "lead", notes: "" });
    await refresh();
  };

  const moveStage = async (id: string, stage: string) => {
    await api.updateCrmRecord(id, { stage });
    await refresh();
  };

  const saveSelected = async () => {
    if (!selected) return;
    await api.updateCrmRecord(selected.id, detailForm);
    await refresh();
  };

  const remove = async (id: string) => {
    await api.deleteCrmRecord(id);
    if (selectedId === id) setSelectedId(null);
    await refresh();
  };

  return (
    <div className="mail-view-panel">
      <header className="mail-view-header">
        <h2>CRM pipeline</h2>
        <p>Track contacts through industry pipeline stages.</p>
      </header>
      <div className="feature-form-grid">
        <input placeholder="Search contacts" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="feature-form-grid">
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input
          placeholder="Organization"
          value={form.organization}
          onChange={(e) => setForm({ ...form, organization: e.target.value })}
        />
        <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
          {(stages ?? []).map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="button" className="mail-toolbar-btn" onClick={() => void create()}>
          Add contact
        </button>
      </div>
      {stagesLoading || loading ? <p className="mail-view-empty">Loading CRM…</p> : null}
      {error ? <p className="mail-view-error">{error}</p> : null}
      <div className="workspace-split">
        <div className="feature-list">
          {(records ?? []).map((row) => (
            <article
              key={row.id}
              className={`feature-list-card${selectedId === row.id ? " feature-list-card--active" : ""}`}
              onClick={() => setSelectedId(row.id)}
              onKeyDown={(e) => e.key === "Enter" && setSelectedId(row.id)}
              role="button"
              tabIndex={0}
            >
              <strong>{row.name}</strong>
              <p>
                {row.email} · {row.organization ?? "—"}
              </p>
              <div className="feature-form" style={{ marginTop: "0.5rem" }}>
                <select value={row.stage} onChange={(e) => void moveStage(row.id, e.target.value)}>
                  {(stages ?? []).map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <button type="button" className="mail-toolbar-btn" onClick={() => void remove(row.id)}>
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
        {selected && (
          <aside className="workspace-detail card">
            <h3>Contact detail</h3>
            <p className="muted">{selected.email}</p>
            <div className="feature-form" style={{ marginTop: "0.75rem" }}>
              <input value={detailForm.name} onChange={(e) => setDetailForm({ ...detailForm, name: e.target.value })} />
              <input placeholder="Phone" value={detailForm.phone} onChange={(e) => setDetailForm({ ...detailForm, phone: e.target.value })} />
              <input
                placeholder="Organization"
                value={detailForm.organization}
                onChange={(e) => setDetailForm({ ...detailForm, organization: e.target.value })}
              />
              <select value={detailForm.stage} onChange={(e) => setDetailForm({ ...detailForm, stage: e.target.value })}>
                {(stages ?? []).map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.label}
                  </option>
                ))}
              </select>
              <textarea placeholder="Notes" value={detailForm.notes} onChange={(e) => setDetailForm({ ...detailForm, notes: e.target.value })} />
              <button type="button" className="mail-toolbar-btn" onClick={() => void saveSelected()}>
                Save contact
              </button>
            </div>
            <p className="muted">Last activity: {selected.lastActivity ?? "—"}</p>
          </aside>
        )}
      </div>
    </div>
  );
}

export function WorkspaceRemindersPanel() {
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");
  const { data, loading, error, refresh } = useLoad(
    () => api.workspaceReminders(filter === "all" ? undefined : filter).then((r) => r.reminders),
    [filter],
  );
  const { data: contacts } = useLoad(() => api.workspaceCrm().then((r) => r.records));
  const [form, setForm] = useState({ title: "", dueAt: "", crmRecordId: "", channel: "email" });

  const create = async () => {
    await api.createWorkspaceReminder({
      title: form.title,
      dueAt: form.dueAt,
      crmRecordId: form.crmRecordId || undefined,
      channel: form.channel,
    });
    setForm({ title: "", dueAt: "", crmRecordId: "", channel: "email" });
    await refresh();
  };

  const toggleDone = async (id: string, status: string) => {
    await api.updateWorkspaceReminder(id, { status: status === "done" ? "pending" : "done" });
    await refresh();
  };

  const remove = async (id: string) => {
    await api.deleteWorkspaceReminder(id);
    await refresh();
  };

  return (
    <div className="mail-view-panel">
      <header className="mail-view-header">
        <h2>Reminders</h2>
        <p>General follow-up reminders tied to your workspace.</p>
        <div className="feature-form" style={{ marginTop: "0.75rem" }}>
          {(["all", "pending", "done"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`mail-toolbar-btn${filter === tab ? " mail-toolbar-btn--active" : ""}`}
              onClick={() => setFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>
      <div className="feature-form-grid">
        <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input
          type="datetime-local"
          value={form.dueAt}
          onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
        />
        <select value={form.crmRecordId} onChange={(e) => setForm({ ...form, crmRecordId: e.target.value })}>
          <option value="">No linked contact</option>
          {(contacts ?? []).map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.name}
            </option>
          ))}
        </select>
        <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
          <option value="email">Email</option>
          <option value="call">Call</option>
          <option value="meeting">Meeting</option>
          <option value="sms">SMS</option>
        </select>
        <button type="button" className="mail-toolbar-btn" onClick={() => void create()}>
          Add reminder
        </button>
      </div>
      {loading ? <p className="mail-view-empty">Loading reminders…</p> : null}
      {error ? <p className="mail-view-error">{error}</p> : null}
      <div className="feature-list">
        {(data ?? []).map((row) => (
          <article key={row.id} className="feature-list-card">
            <strong>{row.title}</strong>
            <p>
              Due {new Date(row.dueAt).toLocaleString()} · {row.status} · {row.channel}
            </p>
            {row.crmRecord ? (
              <p className="muted">
                Linked contact: {row.crmRecord.name} · {row.crmRecord.email}
              </p>
            ) : null}
            <div className="feature-form" style={{ marginTop: "0.5rem" }}>
              <button type="button" className="mail-toolbar-btn" onClick={() => void toggleDone(row.id, row.status)}>
                {row.status === "done" ? "Mark pending" : "Mark done"}
              </button>
              <button type="button" className="mail-toolbar-btn" onClick={() => void remove(row.id)}>
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ComposeSettingsPanel() {
  const { data, loading, error, refresh } = useLoad(() => api.composeSettings().then((r) => r.settings));
  const [displayName, setDisplayName] = useState("");
  const [sigForm, setSigForm] = useState({ id: "", name: "", body: "", avatarUrl: "", isDefault: false });
  const [replyForm, setReplyForm] = useState({ id: "", name: "", subject: "", body: "", enabled: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.displayName) setDisplayName(data.displayName);
  }, [data?.displayName]);

  const saveDisplayName = async () => {
    setSaving(true);
    try {
      await api.updateComposeSettings({ displayName });
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const resetSignatureForm = () => setSigForm({ id: "", name: "", body: "", avatarUrl: "", isDefault: false });

  const saveSignature = async () => {
    const payload = {
      name: sigForm.name,
      body: sigForm.body,
      avatarUrl: sigForm.avatarUrl || undefined,
      isDefault: sigForm.isDefault,
    };
    if (sigForm.id) {
      await api.updateSignature(sigForm.id, payload);
    } else {
      await api.createSignature(payload);
    }
    resetSignatureForm();
    await refresh();
  };

  const resetAutoReplyForm = () => setReplyForm({ id: "", name: "", subject: "", body: "", enabled: true });

  const saveAutoReply = async () => {
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
  };

  if (loading) return <p className="mail-view-empty">Loading compose settings…</p>;
  if (error) return <p className="mail-view-error">{error}</p>;
  if (!data) return null;

  return (
    <div className="mail-view-panel">
      <header className="mail-view-header">
        <h2>Brand Settings</h2>
        <p>Custom sender name, auto-reply templates, and email signatures for PMail+.</p>
      </header>
      <section className="feature-form">
        <h3>Custom sender name</h3>
        <p className="feature-form-hint">This is the sender display name recipients see in the From header.</p>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jane Doe" />
        <button type="button" className="mail-toolbar-btn" disabled={saving} onClick={() => void saveDisplayName()}>
          Save sender name
        </button>
      </section>
      <section className="feature-form">
        <h3>Auto-reply master switch</h3>
        <label className="feature-toggle">
          <input
            type="checkbox"
            checked={data.autoReplyEnabled}
            onChange={(e) => void api.updateComposeSettings({ autoReplyEnabled: e.target.checked }).then(refresh)}
          />
          Enable vacation auto-replies
        </label>
      </section>
      <section className="feature-form">
        <h3>Signature designer</h3>
        <p className="feature-form-hint">Design a reusable signature with avatar/logo support and choose the active compose signature.</p>
        <div className="signature-designer">
          <div className="signature-designer-form">
            <input
              placeholder="Signature name"
              value={sigForm.name}
              onChange={(e) => setSigForm({ ...sigForm, name: e.target.value })}
            />
            <input
              placeholder="Avatar or logo URL"
              value={sigForm.avatarUrl}
              onChange={(e) => setSigForm({ ...sigForm, avatarUrl: e.target.value })}
            />
            <textarea
              placeholder="<strong>Jane Doe</strong><br>Partner, PMail+"
              value={sigForm.body}
              onChange={(e) => setSigForm({ ...sigForm, body: e.target.value })}
            />
            <label className="feature-toggle">
              <input
                type="checkbox"
                checked={sigForm.isDefault}
                onChange={(e) => setSigForm({ ...sigForm, isDefault: e.target.checked })}
              />
              Make this the default signature
            </label>
            <div className="signature-designer-actions">
              <button type="button" className="mail-toolbar-btn" onClick={() => void saveSignature()}>
                {sigForm.id ? "Update signature" : "Add signature"}
              </button>
              {sigForm.id ? (
                <button type="button" className="mail-toolbar-btn" onClick={resetSignatureForm}>
                  Cancel edit
                </button>
              ) : null}
            </div>
          </div>
          <aside className="signature-preview-card">
            <span>Live preview</span>
            <div className="signature-preview">
              {sigForm.avatarUrl ? <img src={sigForm.avatarUrl} alt="" /> : <div className="signature-preview-avatar">S</div>}
              <iframe title="Signature preview" sandbox="" srcDoc={sigForm.body || "<p>Your signature preview appears here.</p>"} />
            </div>
          </aside>
        </div>
        <div className="feature-list">
          {data.signatures.map((sig) => (
            <article key={sig.id} className="feature-list-card">
              <strong>{sig.name}</strong>
              {sig.avatarUrl ? <p>Avatar/logo: {sig.avatarUrl}</p> : null}
              <div className="signature-mini-preview">
                {sig.avatarUrl ? <img src={sig.avatarUrl} alt="" /> : null}
                <iframe title={`${sig.name} preview`} sandbox="" srcDoc={sig.body} />
              </div>
              <div className="feature-form" style={{ marginTop: "0.5rem" }}>
                <button
                  type="button"
                  className="mail-toolbar-btn"
                  onClick={() =>
                    setSigForm({
                      id: sig.id,
                      name: sig.name,
                      body: sig.body,
                      avatarUrl: sig.avatarUrl ?? "",
                      isDefault: sig.isDefault,
                    })
                  }
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="mail-toolbar-btn"
                  onClick={() => void api.updateComposeSettings({ activeSignatureId: sig.id }).then(refresh)}
                >
                  {data.activeSignatureId === sig.id ? "Active" : "Set active"}
                </button>
                <button
                  type="button"
                  className="mail-toolbar-btn"
                  onClick={() => void api.deleteSignature(sig.id).then(refresh)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="feature-form">
        <h3>Auto-replies</h3>
        <p className="feature-form-hint">Create, preview, edit, and choose the active vacation/triggered reply rule.</p>
        <input placeholder="Rule name" value={replyForm.name} onChange={(e) => setReplyForm({ ...replyForm, name: e.target.value })} />
        <input placeholder="Subject" value={replyForm.subject} onChange={(e) => setReplyForm({ ...replyForm, subject: e.target.value })} />
        <textarea placeholder="Reply body" value={replyForm.body} onChange={(e) => setReplyForm({ ...replyForm, body: e.target.value })} />
        <label className="feature-toggle">
          <input
            type="checkbox"
            checked={replyForm.enabled}
            onChange={(e) => setReplyForm({ ...replyForm, enabled: e.target.checked })}
          />
          Enable this rule
        </label>
        <div className="signature-designer-actions">
          <button type="button" className="mail-toolbar-btn" onClick={() => void saveAutoReply()}>
            {replyForm.id ? "Update auto-reply" : "Add auto-reply"}
          </button>
          {replyForm.id ? (
            <button type="button" className="mail-toolbar-btn" onClick={resetAutoReplyForm}>
              Cancel edit
            </button>
          ) : null}
        </div>
        <aside className="auto-reply-preview-card">
          <span>Reply preview</span>
          <strong>{replyForm.subject || "Auto-reply subject"}</strong>
          <p>{replyForm.body || "Auto-reply body preview appears here."}</p>
        </aside>
        <div className="feature-list">
          {data.autoReplies.map((rule) => (
            <article key={rule.id} className="feature-list-card">
              <strong>{rule.name}</strong>
              <p>{rule.subject} · {rule.enabled ? "enabled" : "disabled"}</p>
              <p className="muted">{rule.body}</p>
              <div className="feature-form" style={{ marginTop: "0.5rem" }}>
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
                  className="mail-toolbar-btn"
                  onClick={() => void api.updateComposeSettings({ activeAutoReplyId: rule.id }).then(refresh)}
                >
                  {data.activeAutoReplyId === rule.id ? "Active rule" : "Set active"}
                </button>
                <button
                  type="button"
                  className="mail-toolbar-btn"
                  onClick={() => void api.updateAutoReply(rule.id, { enabled: !rule.enabled }).then(refresh)}
                >
                  {rule.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  className="mail-toolbar-btn"
                  onClick={() => void api.deleteAutoReply(rule.id).then(refresh)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export function OpenTrackingPanel() {
  const { data, loading, error } = useLoad(() => api.mailTracking().then((r) => r.tracking));

  return (
    <div className="mail-view-panel">
      <header className="mail-view-header">
        <h2>Open tracking</h2>
        <p>Recipient opens on sent mail with tracking pixels.</p>
      </header>
      {loading ? <p className="mail-view-empty">Loading tracking…</p> : null}
      {error ? <p className="mail-view-error">{error}</p> : null}
      <div className="feature-list">
        {(data ?? []).map((row) => (
          <article key={row.id} className="feature-list-card">
            <strong>{row.subject}</strong>
            <p>
              To: {row.toEmail} · Opens: {row.openCount}
            </p>
            <p>
              {row.firstOpenedAt
                ? `First opened ${new Date(row.firstOpenedAt).toLocaleString()}`
                : "Not opened yet"}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

const INDUSTRY_TOOLS = [
  { slug: "matter-registry", label: "Matter registry" },
  { slug: "listing-board", label: "Listing board" },
  { slug: "patient-registry", label: "Patient registry" },
  { slug: "deadline-guard", label: "Deadline guard" },
] as const;

export function IndustryToolsPanel() {
  const [toolSlug, setToolSlug] = useState<string>(INDUSTRY_TOOLS[0].slug);
  const { data, loading, error, refresh } = useLoad(
    () => api.industryToolState(toolSlug).then((r) => r.state),
    [toolSlug],
  );
  const [newItem, setNewItem] = useState("");

  const addItem = async () => {
    if (!newItem.trim()) return;
    await api.industryToolAction(toolSlug, "add-item", { label: newItem.trim() });
    setNewItem("");
    await refresh();
  };

  const removeItem = async (id: string) => {
    await api.industryToolAction(toolSlug, "remove-item", { id });
    await refresh();
  };

  const items = Array.isArray(data?.items) ? (data.items as Array<{ id: string; label: string }>) : [];

  return (
    <div className="mail-view-panel">
      <header className="mail-view-header">
        <h2>Industry tools</h2>
        <p>Operational panels backed by workspace state.</p>
      </header>
      <div className="feature-form">
        <select value={toolSlug} onChange={(e) => setToolSlug(e.target.value)}>
          {INDUSTRY_TOOLS.map((tool) => (
            <option key={tool.slug} value={tool.slug}>
              {tool.label}
            </option>
          ))}
        </select>
        <input placeholder="New item label" value={newItem} onChange={(e) => setNewItem(e.target.value)} />
        <button type="button" className="mail-toolbar-btn" onClick={() => void addItem()}>
          Add item
        </button>
      </div>
      {loading ? <p className="mail-view-empty">Loading tool…</p> : null}
      {error ? <p className="mail-view-error">{error}</p> : null}
      {data ? (
        <p className="muted" style={{ margin: "0.5rem 0" }}>
          {String(data.title ?? toolSlug)}
          {typeof data.activeCount === "number" ? ` · ${data.activeCount} active` : ""}
        </p>
      ) : null}
      <div className="feature-list">
        {items.map((item) => (
          <article key={item.id} className="feature-list-card">
            <strong>{item.label}</strong>
            <button type="button" className="mail-toolbar-btn" onClick={() => void removeItem(item.id)}>
              Remove
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

export { CalendarPanel } from "./CalendarPanel";
