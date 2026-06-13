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

export function TemplatesPanel({ onUseTemplate }: { onUseTemplate: (t: { subject: string; html: string }) => void }) {
  const { data, loading, error } = useLoad(() => api.featureTemplates().then((r) => r.templates));

  return (
    <div className="mail-view-panel">
      <header className="mail-view-header">
        <h2>Immigration templates</h2>
        <p>Canada-specific templates with merge fields for your practice.</p>
      </header>
      {loading ? <p className="mail-view-empty">Loading templates…</p> : null}
      {error ? <p className="mail-view-error">{error}</p> : null}
      <div className="mail-template-grid">
        {(data ?? []).map((template) => (
          <article key={template.id} className="mail-template-card">
            <h3>{template.name}</h3>
            <p className="mail-template-desc">{template.description}</p>
            <p className="mail-template-subject">
              <strong>Subject:</strong> {template.subject}
            </p>
            <button
              type="button"
              className="mail-toolbar-btn"
              onClick={() => onUseTemplate({ subject: template.subject, html: template.bodyHtml })}
            >
              Use template
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ScheduledPanelFeature() {
  const { data, loading, error, refresh } = useLoad(() => api.featureScheduled().then((r) => r.messages));
  const [form, setForm] = useState({ to: "", subject: "", scheduledFor: "" });
  const [saving, setSaving] = useState(false);

  const onSchedule = async () => {
    setSaving(true);
    try {
      await api.createScheduled({
        to: form.to,
        subject: form.subject,
        html: `<p>${form.subject}</p>`,
        scheduledFor: form.scheduledFor,
      });
      setForm({ to: "", subject: "", scheduledFor: "" });
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mail-view-panel">
      <header className="mail-view-header">
        <h2>Scheduled send</h2>
        <p>Queue messages to send later. Due messages are processed every minute.</p>
      </header>
      <div className="feature-form">
        <input placeholder="To" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
        <input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        <input type="datetime-local" value={form.scheduledFor} onChange={(e) => setForm({ ...form, scheduledFor: e.target.value })} />
        <button type="button" className="mail-toolbar-btn" disabled={saving} onClick={() => void onSchedule()}>
          {saving ? "Scheduling…" : "Schedule message"}
        </button>
      </div>
      {loading ? <p className="mail-view-empty">Loading queue…</p> : null}
      {error ? <p className="mail-view-error">{error}</p> : null}
      <div className="mail-scheduled-list">
        {(data ?? []).map((item) => (
          <article key={item.id} className="mail-scheduled-card">
            <strong>{item.subject}</strong>
            <p>To: {item.to}</p>
            <p>Sends: {new Date(item.scheduledFor).toLocaleString()}</p>
            <span className="mail-scheduled-badge">{item.status}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ImmigrationDeskPanel() {
  const { data, loading, error, refresh } = useLoad(() => api.featureMatters().then((r) => r.matters));
  const [clientForm, setClientForm] = useState({ firstName: "", lastName: "", email: "" });
  const [matterForm, setMatterForm] = useState({ clientId: "", title: "", uci: "", program: "express_entry" });

  const createClient = async () => {
    await api.createClient(clientForm);
    setClientForm({ firstName: "", lastName: "", email: "" });
    await refresh();
  };

  const createMatter = async () => {
    await api.createMatter(matterForm);
    setMatterForm({ clientId: "", title: "", uci: "", program: "express_entry" });
    await refresh();
  };

  return (
    <div className="mail-view-panel">
      <header className="mail-view-header">
        <h2>Immigration Desk</h2>
        <p>Clients and matters with UCI and program tracking.</p>
      </header>
      {error ? <p className="mail-view-error">{error}</p> : null}
      <div className="feature-form-grid">
        <section>
          <h3>New client</h3>
          <input placeholder="First name" value={clientForm.firstName} onChange={(e) => setClientForm({ ...clientForm, firstName: e.target.value })} />
          <input placeholder="Last name" value={clientForm.lastName} onChange={(e) => setClientForm({ ...clientForm, lastName: e.target.value })} />
          <input placeholder="Email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} />
          <button type="button" className="mail-toolbar-btn" onClick={() => void createClient()}>Add client</button>
        </section>
        <section>
          <h3>New matter</h3>
          <input placeholder="Client ID" value={matterForm.clientId} onChange={(e) => setMatterForm({ ...matterForm, clientId: e.target.value })} />
          <input placeholder="Matter title" value={matterForm.title} onChange={(e) => setMatterForm({ ...matterForm, title: e.target.value })} />
          <input placeholder="UCI" value={matterForm.uci} onChange={(e) => setMatterForm({ ...matterForm, uci: e.target.value })} />
          <button type="button" className="mail-toolbar-btn" onClick={() => void createMatter()}>Open matter</button>
        </section>
      </div>
      {loading ? <p className="mail-view-empty">Loading matters…</p> : null}
      <div className="feature-list">
        {(data ?? []).map((m) => (
          <article key={m.id} className="feature-list-card">
            <strong>{m.title}</strong>
            <p>{m.clientName} · {m.program} · {m.status}</p>
            {m.uci ? <p>UCI: {m.uci}</p> : null}
            <code className="feature-id">{m.id}</code>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ChecklistsPanel() {
  const [matterId, setMatterId] = useState("");
  const { data, loading, error, refresh } = useLoad(
    () => (matterId ? api.featureChecklist(matterId) : Promise.resolve(null)),
    [matterId],
  );

  const toggle = async (itemId: string, isComplete: boolean) => {
    if (!matterId) return;
    await api.toggleChecklistItem(matterId, itemId, isComplete);
    await refresh();
  };

  return (
    <div className="mail-view-panel">
      <header className="mail-view-header">
        <h2>Program checklists</h2>
        <p>IMM forms and supporting documents per matter.</p>
      </header>
      <div className="feature-form">
        <input placeholder="Matter ID" value={matterId} onChange={(e) => setMatterId(e.target.value)} />
      </div>
      {loading ? <p className="mail-view-empty">Loading checklist…</p> : null}
      {error ? <p className="mail-view-error">{error}</p> : null}
      {data ? (
        <ul className="feature-checklist">
          {data.items.map((item) => (
            <li key={item.id}>
              <label>
                <input type="checkbox" checked={item.isComplete} onChange={(e) => void toggle(item.id, e.target.checked)} />
                {item.label}
              </label>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function CompliancePanel() {
  const { data, loading, error } = useLoad(() => api.featureCompliance().then((r) => r.logs));

  return (
    <div className="mail-view-panel">
      <header className="mail-view-header">
        <h2>Compliance audit</h2>
        <p>Activity log for regulated immigration practice.</p>
      </header>
      {loading ? <p className="mail-view-empty">Loading audit log…</p> : null}
      {error ? <p className="mail-view-error">{error}</p> : null}
      <div className="feature-list">
        {(data ?? []).map((log) => (
          <article key={log.id} className="feature-list-card">
            <strong>{log.action}</strong>
            <p>{log.userEmail ?? "system"} · {new Date(log.createdAt).toLocaleString()}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function IrccIntelPanel() {
  const { data, loading, error, refresh } = useLoad(() => api.featureIrccClassifications().then((r) => r.classifications));
  const [form, setForm] = useState({ folder: "INBOX", messageUid: "", sender: "", subject: "" });

  const classify = async () => {
    await api.classifyIrccMessage({
      folder: form.folder,
      messageUid: Number(form.messageUid),
      sender: form.sender,
      subject: form.subject,
    });
    await refresh();
  };

  return (
    <div className="mail-view-panel">
      <header className="mail-view-header">
        <h2>IRCC Mail Intelligence</h2>
        <p>Classify IRCC correspondence by sender and subject patterns.</p>
      </header>
      <div className="feature-form-grid">
        <input placeholder="Folder" value={form.folder} onChange={(e) => setForm({ ...form, folder: e.target.value })} />
        <input placeholder="Message UID" value={form.messageUid} onChange={(e) => setForm({ ...form, messageUid: e.target.value })} />
        <input placeholder="Sender" value={form.sender} onChange={(e) => setForm({ ...form, sender: e.target.value })} />
        <input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        <button type="button" className="mail-toolbar-btn" onClick={() => void classify()}>Classify</button>
      </div>
      {loading ? <p className="mail-view-empty">Loading…</p> : null}
      {error ? <p className="mail-view-error">{error}</p> : null}
      <div className="feature-list">
        {(data ?? []).map((row) => (
          <article key={row.id} className="feature-list-card">
            <strong>{row.classification}</strong>
            <p>{row.subject ?? "No subject"} · priority: {row.priority}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function CaseLinkedPanel() {
  const { data, loading, error, refresh } = useLoad(() => api.featureMailLinks().then((r) => r.links));
  const [form, setForm] = useState({ matterId: "", folder: "INBOX", messageUid: "", subject: "" });

  const link = async () => {
    await api.linkMailToMatter({ ...form, messageUid: Number(form.messageUid) });
    await refresh();
  };

  return (
    <div className="mail-view-panel">
      <header className="mail-view-header">
        <h2>Case-linked mail</h2>
        <p>Link IMAP messages to matters for UCI-centric search.</p>
      </header>
      <div className="feature-form-grid">
        <input placeholder="Matter ID" value={form.matterId} onChange={(e) => setForm({ ...form, matterId: e.target.value })} />
        <input placeholder="Folder" value={form.folder} onChange={(e) => setForm({ ...form, folder: e.target.value })} />
        <input placeholder="Message UID" value={form.messageUid} onChange={(e) => setForm({ ...form, messageUid: e.target.value })} />
        <button type="button" className="mail-toolbar-btn" onClick={() => void link()}>Link message</button>
      </div>
      {loading ? <p className="mail-view-empty">Loading links…</p> : null}
      {error ? <p className="mail-view-error">{error}</p> : null}
      <div className="feature-list">
        {(data ?? []).map((link) => (
          <article key={link.id} className="feature-list-card">
            <strong>{link.matter.title}</strong>
            <p>{link.subject ?? "Message"} · UID {link.messageUid}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function DeadlinesPanel() {
  const { data, loading, error, refresh } = useLoad(() => api.featureDeadlines().then((r) => r.deadlines));
  const [form, setForm] = useState({ matterId: "", title: "", dueAt: "" });

  const create = async () => {
    await api.createDeadline(form);
    setForm({ matterId: "", title: "", dueAt: "" });
    await refresh();
  };

  return (
    <div className="mail-view-panel">
      <header className="mail-view-header">
        <h2>Deadline Guard</h2>
        <p>Track IRCC and document deadlines per matter.</p>
      </header>
      <div className="feature-form-grid">
        <input placeholder="Matter ID" value={form.matterId} onChange={(e) => setForm({ ...form, matterId: e.target.value })} />
        <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
        <button type="button" className="mail-toolbar-btn" onClick={() => void create()}>Add deadline</button>
      </div>
      {loading ? <p className="mail-view-empty">Loading…</p> : null}
      {error ? <p className="mail-view-error">{error}</p> : null}
      <div className="feature-list">
        {(data ?? []).map((d) => (
          <article key={d.id} className="feature-list-card">
            <strong>{d.title}</strong>
            <p>{d.clientName} · due {new Date(d.dueAt).toLocaleString()}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ClientPortalPanel() {
  const [matterId, setMatterId] = useState("");
  const { data, loading, error, refresh } = useLoad(
    () => (matterId ? api.featurePortalDocuments(matterId).then((r) => r.documents) : Promise.resolve([])),
    [matterId],
  );
  const [portalUrl, setPortalUrl] = useState("");
  const [docLabel, setDocLabel] = useState("");

  const createAccess = async () => {
    const { access } = await api.createPortalAccess(matterId);
    setPortalUrl(access.portalUrl);
  };

  const requestDoc = async () => {
    await api.createPortalDocument(matterId, docLabel);
    setDocLabel("");
    await refresh();
  };

  return (
    <div className="mail-view-panel">
      <header className="mail-view-header">
        <h2>Client portal</h2>
        <p>Generate portal links and document requests per matter.</p>
      </header>
      <div className="feature-form">
        <input placeholder="Matter ID" value={matterId} onChange={(e) => setMatterId(e.target.value)} />
        <button type="button" className="mail-toolbar-btn" onClick={() => void createAccess()}>Create portal link</button>
        {portalUrl ? <p className="feature-portal-url">{portalUrl}</p> : null}
        <input placeholder="Document label" value={docLabel} onChange={(e) => setDocLabel(e.target.value)} />
        <button type="button" className="mail-toolbar-btn" onClick={() => void requestDoc()}>Request document</button>
      </div>
      {loading ? <p className="mail-view-empty">Loading…</p> : null}
      {error ? <p className="mail-view-error">{error}</p> : null}
      <div className="feature-list">
        {(data ?? []).map((doc) => (
          <article key={doc.id} className="feature-list-card">
            <strong>{doc.label}</strong>
            <p>Status: {doc.status}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
