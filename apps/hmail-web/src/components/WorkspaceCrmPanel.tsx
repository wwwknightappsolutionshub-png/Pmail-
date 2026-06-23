import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import "./WorkspaceCrmPanel.css";

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

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  organization: "",
  stage: "lead",
  notes: "",
};

function contactInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (!parts[0]) return "?";
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export function WorkspaceCrmPanel() {
  const { data: stages, loading: stagesLoading } = useLoad(() => api.workspaceStages().then((r) => r.stages));
  const [search, setSearch] = useState("");
  const { data: records, loading, error, refresh } = useLoad(
    () => api.workspaceCrm(search || undefined).then((r) => r.records),
    [search],
  );
  const [stageFilter, setStageFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [detailForm, setDetailForm] = useState({ name: "", phone: "", organization: "", stage: "lead", notes: "" });
  const [showForm, setShowForm] = useState(false);

  const selected = records?.find((r) => r.id === selectedId) ?? null;

  const filteredRecords = useMemo(() => {
    const rows = records ?? [];
    if (stageFilter === "all") return rows;
    return rows.filter((row) => row.stage === stageFilter);
  }, [records, stageFilter]);

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

  const resetForm = () => {
    setForm(emptyForm);
    setShowForm(false);
  };

  const create = async () => {
    await api.createCrmRecord(form);
    resetForm();
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

  const remove = async (id: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    await api.deleteCrmRecord(id);
    if (selectedId === id) setSelectedId(null);
    await refresh();
  };

  return (
    <div className="mail-view-panel crm-panel">
      <header className="crm-toolbar">
        <div>
          <h2 className="crm-title">Pipeline</h2>
          <p className="crm-subtitle">Contacts by stage</p>
        </div>
        {!showForm ? (
          <button type="button" className="crm-primary-btn" onClick={() => setShowForm(true)}>
            New contact
          </button>
        ) : null}
      </header>

      <div className="crm-stage-tabs" role="tablist" aria-label="Pipeline stages">
        <button
          type="button"
          className={stageFilter === "all" ? "is-active" : ""}
          onClick={() => setStageFilter("all")}
        >
          All
        </button>
        {(stages ?? []).map((stage) => (
          <button
            key={stage.slug}
            type="button"
            className={stageFilter === stage.slug ? "is-active" : ""}
            onClick={() => setStageFilter(stage.slug)}
          >
            {stage.label}
          </button>
        ))}
      </div>

      <div className="crm-search-wrap">
        <input
          type="search"
          className="crm-search"
          placeholder="Search pipeline"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search pipeline"
        />
        <span className="crm-count">{filteredRecords.length}</span>
      </div>

      {showForm ? (
        <form
          className="crm-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <div className="crm-composer-head">
            <h3>New contact</h3>
            <button type="button" className="crm-icon-btn" aria-label="Close form" onClick={resetForm}>
              ×
            </button>
          </div>
          <div className="crm-form-grid">
            <label className="crm-field">
              <span>Name</span>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="crm-field">
              <span>Email</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="crm-field">
              <span>Phone</span>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label className="crm-field">
              <span>Organization</span>
              <input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} />
            </label>
            <label className="crm-field">
              <span>Stage</span>
              <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                {(stages ?? []).map((stage) => (
                  <option key={stage.slug} value={stage.slug}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="crm-form-actions">
            <button type="submit" className="crm-primary-btn">
              Add contact
            </button>
            <button type="button" className="crm-secondary-btn" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {stagesLoading || loading ? <p className="crm-status">Loading…</p> : null}
      {error ? <p className="mail-view-error">{error}</p> : null}

      <div className="crm-split">
        {!loading && filteredRecords.length === 0 ? (
          <p className="crm-empty">
            {(records ?? []).length === 0 ? "No contacts in the pipeline yet." : "No contacts match this filter."}
          </p>
        ) : (
          <ul className="crm-list">
            {filteredRecords.map((row) => (
              <li
                key={row.id}
                className={`crm-card${selectedId === row.id ? " is-selected" : ""}`}
                onClick={() => setSelectedId(row.id)}
                onKeyDown={(e) => e.key === "Enter" && setSelectedId(row.id)}
                role="button"
                tabIndex={0}
              >
                <div className="crm-avatar" aria-hidden="true">
                  {contactInitials(row.name)}
                </div>
                <div className="crm-card-body">
                  <strong className="crm-card-name">{row.name}</strong>
                  <span className="crm-card-meta">
                    {row.email}
                    {row.organization ? ` · ${row.organization}` : ""}
                  </span>
                </div>
                <div className="crm-card-side">
                  <select
                    className="crm-stage-select"
                    value={row.stage}
                    aria-label={`Move ${row.name}`}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      e.stopPropagation();
                      void moveStage(row.id, e.target.value);
                    }}
                  >
                    {(stages ?? []).map((stage) => (
                      <option key={stage.slug} value={stage.slug}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="crm-text-btn"
                    onClick={(e) => void remove(row.id, e)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {selected ? (
          <aside className="crm-detail">
            <div className="crm-detail-head">
              <div>
                <h3>{selected.name}</h3>
                <p className="crm-detail-email">{selected.email}</p>
              </div>
              <button type="button" className="crm-icon-btn" aria-label="Close detail" onClick={() => setSelectedId(null)}>
                ×
              </button>
            </div>
            <div className="crm-form-grid">
              <label className="crm-field crm-field--full">
                <span>Name</span>
                <input value={detailForm.name} onChange={(e) => setDetailForm({ ...detailForm, name: e.target.value })} />
              </label>
              <label className="crm-field">
                <span>Phone</span>
                <input
                  value={detailForm.phone}
                  onChange={(e) => setDetailForm({ ...detailForm, phone: e.target.value })}
                />
              </label>
              <label className="crm-field">
                <span>Organization</span>
                <input
                  value={detailForm.organization}
                  onChange={(e) => setDetailForm({ ...detailForm, organization: e.target.value })}
                />
              </label>
              <label className="crm-field crm-field--full">
                <span>Stage</span>
                <select
                  value={detailForm.stage}
                  onChange={(e) => setDetailForm({ ...detailForm, stage: e.target.value })}
                >
                  {(stages ?? []).map((stage) => (
                    <option key={stage.slug} value={stage.slug}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="crm-field crm-field--full">
                <span>Notes</span>
                <textarea
                  rows={3}
                  value={detailForm.notes}
                  onChange={(e) => setDetailForm({ ...detailForm, notes: e.target.value })}
                />
              </label>
            </div>
            <div className="crm-form-actions">
              <button type="button" className="crm-primary-btn" onClick={() => void saveSelected()}>
                Save
              </button>
              <button type="button" className="crm-secondary-btn" onClick={() => void remove(selected.id)}>
                Delete
              </button>
            </div>
            <p className="crm-detail-footnote">Last activity: {selected.lastActivity ?? "—"}</p>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
