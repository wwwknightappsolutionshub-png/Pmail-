import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import type {
  GrowthFormDefinition,
  GrowthChatSession,
  GrowthLead,
  GrowthLeadActivity,
  GrowthLeadStats,
  GrowthPipelineBoard,
  GrowthPipelineStage,
} from "../../types/growth";
import "./Growth.css";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type LeadFormState = {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  message: string;
};

const emptyLeadForm = (): LeadFormState => ({
  fullName: "",
  email: "",
  phone: "",
  company: "",
  message: "",
});

export function GrowthPipelinePage() {
  const [board, setBoard] = useState<GrowthPipelineBoard | null>(null);
  const [stats, setStats] = useState<GrowthLeadStats | null>(null);
  const [forms, setForms] = useState<GrowthFormDefinition[]>([]);
  const [tenantSlug, setTenantSlug] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<GrowthLead | null>(null);
  const [activities, setActivities] = useState<GrowthLeadActivity[]>([]);
  const [chatSession, setChatSession] = useState<GrowthChatSession | null>(null);
  const [error, setError] = useState("");
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddLead, setShowAddLead] = useState(false);
  const [addForm, setAddForm] = useState<LeadFormState>(emptyLeadForm);
  const [addBusy, setAddBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<LeadFormState>(emptyLeadForm);
  const [editBusy, setEditBusy] = useState(false);
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const loadBoard = useCallback(async () => {
    const [boardRes, statsRes, formsRes, meRes] = await Promise.all([
      api.growthPipelineBoard(),
      api.growthLeadStats(),
      api.growthForms(),
      api.panelMe(),
    ]);
    setBoard(boardRes);
    setStats(statsRes.stats);
    setForms(formsRes.forms);
    setTenantSlug(meRes.account.tenant.slug);
    setError("");
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await loadBoard();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load pipeline");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadBoard]);

  useEffect(() => {
    if (!selectedLeadId) {
      setSelectedLead(null);
      setActivities([]);
      setChatSession(null);
      setEditing(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.growthLead(selectedLeadId);
        if (cancelled) return;
        setSelectedLead(res.lead);
        setActivities(res.activities);
        setChatSession(res.chatSession);
        setEditForm({
          fullName: res.lead.fullName,
          email: res.lead.email,
          phone: res.lead.phone ?? "",
          company: res.lead.company ?? "",
          message: res.lead.message ?? "",
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load lead");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedLeadId]);

  async function handleMoveStage(leadId: string, stageSlug: string) {
    if (busyLeadId === leadId) return;
    setBusyLeadId(leadId);
    setError("");
    try {
      await api.growthUpdateLeadStage(leadId, stageSlug);
      await loadBoard();
      if (selectedLeadId === leadId) {
        const res = await api.growthLead(leadId);
        setSelectedLead(res.lead);
        setActivities(res.activities);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update stage");
    } finally {
      setBusyLeadId(null);
      setDraggingLeadId(null);
      setDragOverStage(null);
    }
  }

  async function handleCreateLead(e: FormEvent) {
    e.preventDefault();
    setAddBusy(true);
    setError("");
    try {
      const res = await api.growthCreateLead({
        fullName: addForm.fullName.trim(),
        email: addForm.email.trim(),
        phone: addForm.phone.trim() || undefined,
        company: addForm.company.trim() || undefined,
        message: addForm.message.trim() || undefined,
      });
      setShowAddLead(false);
      setAddForm(emptyLeadForm());
      await loadBoard();
      setSelectedLeadId(res.lead.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add lead");
    } finally {
      setAddBusy(false);
    }
  }

  async function handleSaveLead(e: FormEvent) {
    e.preventDefault();
    if (!selectedLeadId) return;
    setEditBusy(true);
    setError("");
    try {
      const res = await api.growthUpdateLead(selectedLeadId, {
        fullName: editForm.fullName.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
        company: editForm.company.trim() || null,
        message: editForm.message.trim() || null,
      });
      setSelectedLead(res.lead);
      setEditing(false);
      await loadBoard();
      const detail = await api.growthLead(selectedLeadId);
      setActivities(detail.activities);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save lead");
    } finally {
      setEditBusy(false);
    }
  }

  const captureForm = forms.find((f) => f.formKey === "capture");
  const publicLeadUrl = tenantSlug ? `/api/public/growth/${tenantSlug}/leads` : "";

  if (loading) {
    return <div className="growth-card">Loading pipeline…</div>;
  }

  return (
    <div className="growth-pipeline-page">
      <div className="growth-card">
        <div className="growth-pipeline-head">
          <div>
            <h1>Lead pipeline</h1>
            <p className="muted">
              Drag cards between stages, add leads manually, and get email alerts when visitors submit your capture form.
            </p>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddLead(true)}>
            Add lead
          </button>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        {stats ? (
          <div className="growth-status-grid growth-pipeline-stats">
            <div className="growth-status-card">
              <strong>Total leads</strong>
              <p className="muted">{stats.totalLeads}</p>
            </div>
            <div className="growth-status-card">
              <strong>Open</strong>
              <p className="muted">{stats.openLeads}</p>
            </div>
            <div className="growth-status-card">
              <strong>Last 7 days</strong>
              <p className="muted">{stats.last7Days}</p>
            </div>
            <div className="growth-status-card">
              <strong>Avg. score</strong>
              <p className="muted">{stats.averageScore}</p>
            </div>
          </div>
        ) : null}

        {captureForm && tenantSlug ? (
          <div className="growth-capture-info">
            <strong>Capture form</strong>
            <p className="muted">{captureForm.title}</p>
            <p className="muted growth-capture-url">
              Public endpoint: <code>{publicLeadUrl}</code>
            </p>
            <p className="muted" style={{ fontSize: "0.78rem" }}>
              New submissions email your panel address ({tenantSlug} hosting account). Republish from{" "}
              <Link to="/growth/studio">Content studio</Link> to embed the form on live pages.
            </p>
          </div>
        ) : null}
      </div>

      {showAddLead ? (
        <div className="growth-card growth-lead-form-card">
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>Add lead manually</h2>
          <form className="growth-lead-form" onSubmit={(e) => void handleCreateLead(e)}>
            <label>
              Full name
              <input
                required
                value={addForm.fullName}
                onChange={(e) => setAddForm((f) => ({ ...f, fullName: e.target.value }))}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                required
                value={addForm.email}
                onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
              />
            </label>
            <label>
              Phone
              <input value={addForm.phone} onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))} />
            </label>
            <label>
              Company
              <input value={addForm.company} onChange={(e) => setAddForm((f) => ({ ...f, company: e.target.value }))} />
            </label>
            <label className="growth-lead-form-wide">
              Message
              <textarea
                rows={3}
                value={addForm.message}
                onChange={(e) => setAddForm((f) => ({ ...f, message: e.target.value }))}
              />
            </label>
            <div className="growth-lead-form-actions">
              <button type="submit" className="btn btn-primary btn-sm" disabled={addBusy}>
                {addBusy ? "Saving…" : "Save lead"}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={addBusy}
                onClick={() => {
                  setShowAddLead(false);
                  setAddForm(emptyLeadForm());
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="growth-pipeline-layout">
        <div className="growth-pipeline-board">
          {board?.stages.map((stage: GrowthPipelineStage) => {
            const leads = board.leadsByStage[stage.slug] ?? [];
            const isDropTarget = dragOverStage === stage.slug;
            return (
              <section
                key={stage.id}
                className={`growth-pipeline-column${stage.isClosed ? " closed" : ""}${isDropTarget ? " drop-target" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStage(stage.slug);
                }}
                onDragLeave={() => {
                  if (dragOverStage === stage.slug) setDragOverStage(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const leadId = e.dataTransfer.getData("text/growth-lead-id");
                  if (leadId) void handleMoveStage(leadId, stage.slug);
                }}
              >
                <header className="growth-pipeline-column-head">
                  <strong>{stage.label}</strong>
                  <span className="growth-pipeline-count">{leads.length}</span>
                </header>
                <ul className="growth-pipeline-cards">
                  {leads.length === 0 ? (
                    <li className="growth-pipeline-empty muted">Drop leads here</li>
                  ) : (
                    leads.map((lead) => (
                      <li key={lead.id}>
                        <button
                          type="button"
                          draggable
                          className={`growth-pipeline-card${selectedLeadId === lead.id ? " active" : ""}${draggingLeadId === lead.id ? " dragging" : ""}`}
                          onClick={() => setSelectedLeadId(lead.id)}
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/growth-lead-id", lead.id);
                            e.dataTransfer.effectAllowed = "move";
                            setDraggingLeadId(lead.id);
                          }}
                          onDragEnd={() => {
                            setDraggingLeadId(null);
                            setDragOverStage(null);
                          }}
                        >
                          <strong>{lead.fullName}</strong>
                          <span className="muted">{lead.email}</span>
                          {lead.company ? <span className="muted">{lead.company}</span> : null}
                          <div className="growth-pipeline-card-meta">
                            <span>Score {lead.score}</span>
                            <span>{formatDate(lead.createdAt)}</span>
                          </div>
                          {lead.source === "manual" ? (
                            <span className="growth-pipeline-badge">Manual</span>
                          ) : lead.source === "chatbot" ? (
                            <span className="growth-pipeline-badge">Chatbot</span>
                          ) : null}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            );
          })}
        </div>

        <aside className="growth-pipeline-detail growth-card">
          {!selectedLead ? (
            <p className="muted">Select a lead to view details, edit contact info, or review activity.</p>
          ) : editing ? (
            <>
              <h2>Edit lead</h2>
              <form className="growth-lead-form" onSubmit={(e) => void handleSaveLead(e)}>
                <label>
                  Full name
                  <input
                    required
                    value={editForm.fullName}
                    onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </label>
                <label>
                  Phone
                  <input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
                </label>
                <label>
                  Company
                  <input value={editForm.company} onChange={(e) => setEditForm((f) => ({ ...f, company: e.target.value }))} />
                </label>
                <label>
                  Message
                  <textarea
                    rows={4}
                    value={editForm.message}
                    onChange={(e) => setEditForm((f) => ({ ...f, message: e.target.value }))}
                  />
                </label>
                <div className="growth-lead-form-actions">
                  <button type="submit" className="btn btn-primary btn-sm" disabled={editBusy}>
                    {editBusy ? "Saving…" : "Save changes"}
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={editBusy} onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="growth-pipeline-detail-head">
                <h2>{selectedLead.fullName}</h2>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
                  Edit
                </button>
              </div>
              <p className="muted">{selectedLead.email}</p>
              {selectedLead.phone ? <p className="muted">{selectedLead.phone}</p> : null}
              {selectedLead.company ? <p className="muted">{selectedLead.company}</p> : null}
              {selectedLead.message ? (
                <blockquote className="growth-lead-message">{selectedLead.message}</blockquote>
              ) : null}
              <dl className="growth-lead-meta">
                <div>
                  <dt>Source</dt>
                  <dd>
                    {selectedLead.source}
                    {selectedLead.sourcePage ? ` · ${selectedLead.sourcePage}` : ""}
                  </dd>
                </div>
                <div>
                  <dt>Score</dt>
                  <dd>{selectedLead.score}</dd>
                </div>
                <div>
                  <dt>Stage</dt>
                  <dd>{selectedLead.stageSlug}</dd>
                </div>
                <div>
                  <dt>Captured</dt>
                  <dd>{formatDate(selectedLead.createdAt)}</dd>
                </div>
              </dl>
              <h3 style={{ fontSize: "0.9rem", marginTop: "1rem" }}>Activity</h3>
              <ul className="growth-agent-list">
                {activities.length === 0 ? <li className="muted">No activity yet.</li> : null}
                {activities.map((item) => (
                  <li key={item.id}>
                    <strong>{item.summary}</strong>
                    <div className="muted">{formatDate(item.createdAt)}</div>
                  </li>
                ))}
              </ul>
              {chatSession && chatSession.messages.length > 0 ? (
                <>
                  <h3 style={{ fontSize: "0.9rem", marginTop: "1rem" }}>Chat transcript</h3>
                  <div className="growth-chat-transcript">
                    {chatSession.messages.map((msg) => (
                      <div key={msg.id} className={`growth-chat-transcript-line ${msg.role}`}>
                        <strong>{msg.role === "bot" ? "Bot" : "Visitor"}:</strong> {msg.content}
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
