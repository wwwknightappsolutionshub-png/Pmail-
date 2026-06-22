import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../api/client";
import type { MarketingLead, MarketingLeadStats } from "../../types/site";
import "./AdminDashboard.css";

const STATUSES = ["new", "contacted", "qualified", "converted", "closed"] as const;
const STATUS_LABELS: Record<MarketingLead["status"], string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  converted: "Converted",
  closed: "Closed",
};

function leadAge(createdAt: string) {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (24 * 60 * 60 * 1000));
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function AdminLeadsPanel({
  pollKey,
  onError,
  onMessage,
}: {
  pollKey?: string;
  onError: (msg: string) => void;
  onMessage: (msg: string) => void;
}) {
  const [leads, setLeads] = useState<MarketingLead[]>([]);
  const [stats, setStats] = useState<MarketingLeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MarketingLead["status"] | "all">("all");
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [converting, setConverting] = useState(false);
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);

  const selected = leads.find((l) => l.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leadsRes, statsRes] = await Promise.all([
        api.adminLeads({
          status: statusFilter === "all" ? undefined : statusFilter,
          q: search || undefined,
        }),
        api.adminLeadStats(),
      ]);
      setLeads(leadsRes.leads);
      setStats(statsRes.stats);
      if (!selectedId && leadsRes.leads[0]) {
        setSelectedId(leadsRes.leads[0].id);
        setNotesDraft(leadsRes.leads[0].notes ?? "");
      } else if (selectedId && !leadsRes.leads.some((l) => l.id === selectedId)) {
        setSelectedId(leadsRes.leads[0]?.id ?? null);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to load leads";
      setError(msg);
      onError(msg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, onError]);

  useEffect(() => {
    void load();
  }, [statusFilter, search]);

  useEffect(() => {
    if (pollKey) void load();
  }, [pollKey]);

  useEffect(() => {
    if (selected) setNotesDraft(selected.notes ?? "");
  }, [selected?.id]);

  const filteredLabel = useMemo(() => {
    if (search) return `Search: “${search}”`;
    if (statusFilter !== "all") return STATUS_LABELS[statusFilter];
    return "All leads";
  }, [search, statusFilter]);

  async function saveLead(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    try {
      const res = await api.updateAdminLead(selected.id, { notes: notesDraft });
      setLeads((prev) => prev.map((l) => (l.id === res.lead.id ? res.lead : l)));
      onMessage("Lead notes saved");
      setMessage("Lead notes saved");
      setError(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Update failed";
      setError(msg);
      onError(msg);
    }
  }

  async function changeStatus(id: string, status: MarketingLead["status"]) {
    try {
      const res = await api.updateAdminLead(id, { status });
      setLeads((prev) => prev.map((l) => (l.id === res.lead.id ? res.lead : l)));
      onMessage(`Pipeline updated → ${STATUS_LABELS[status]}`);
      setMessage(`Pipeline updated → ${STATUS_LABELS[status]}`);
      void load();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Status update failed");
    }
  }

  async function convertLead(id: string) {
    setConverting(true);
    setError(null);
    try {
      const res = await api.convertAdminLead(id);
      setShowConvertConfirm(false);
      await load();
      onMessage(`Tenant provisioned: ${res.tenant.slug} · Panel ${res.panelLoginId}`);
      setMessage(`Tenant provisioned: ${res.tenant.slug} · Panel ${res.panelLoginId}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Conversion failed";
      setError(msg);
      onError(msg);
    } finally {
      setConverting(false);
    }
  }

  if (loading && !stats) return <p className="muted">Loading lead pipeline…</p>;

  return (
    <div className="admin-leads-module">
      {stats ? (
        <div className="admin-leads-funnel">
          <button
            type="button"
            className={`admin-funnel-step${statusFilter === "all" ? " active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            <strong>{stats.total}</strong>
            <span>Total</span>
          </button>
          {STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className={`admin-funnel-step${statusFilter === status ? " active" : ""}`}
              onClick={() => setStatusFilter(status)}
            >
              <strong>{stats.funnel[status]}</strong>
              <span>{STATUS_LABELS[status]}</span>
            </button>
          ))}
          <div className="admin-funnel-meta muted">
            <span>{stats.newThisWeek} this week</span>
            <span>{stats.conversionRate}% converted</span>
          </div>
        </div>
      ) : null}

      <div className="admin-leads-toolbar">
        <div className="admin-leads-search">
          <input
            type="search"
            placeholder="Search name, email, or company…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSearch(searchDraft.trim());
            }}
          />
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSearch(searchDraft.trim())}>
            Search
          </button>
          {search ? (
            <button type="button" className="btn btn-ghost-sidebar btn-sm" onClick={() => { setSearch(""); setSearchDraft(""); }}>
              Clear
            </button>
          ) : null}
        </div>
        <span className="muted">{filteredLabel} · {leads.length} shown</span>
      </div>

      {message && <div className="admin-alert admin-alert-success">{message}</div>}
      {error && <div className="admin-alert admin-alert-error">{error}</div>}

      <div className="admin-leads-layout">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Company</th>
                <th>Status</th>
                <th>Age</th>
                <th>Consent</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className={lead.id === selectedId ? "selected" : ""}
                  onClick={() => setSelectedId(lead.id)}
                >
                  <td>
                    <strong>{lead.fullName}</strong>
                    <div className="muted">{lead.email}</div>
                  </td>
                  <td>{lead.company}</td>
                  <td>
                    <span className={`badge badge-status-${lead.status}`}>{STATUS_LABELS[lead.status]}</span>
                  </td>
                  <td className="muted">{leadAge(lead.createdAt)}</td>
                  <td>
                    <span className={`badge ${lead.consentPrivacy ? "badge-status-active" : "badge-status-inactive"}`} title="Privacy consent">
                      P
                    </span>{" "}
                    <span className={`badge ${lead.consentContact ? "badge-status-active" : "badge-status-inactive"}`} title="Contact consent">
                      C
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length === 0 && !loading ? <p className="muted admin-leads-empty">No leads match this filter.</p> : null}
        </div>

        {selected ? (
          <aside className="card admin-leads-detail">
            <header className="admin-leads-detail-head">
              <div>
                <h3>{selected.fullName}</h3>
                <p className="muted">{selected.email}</p>
              </div>
              <span className={`badge badge-status-${selected.status}`}>{STATUS_LABELS[selected.status]}</span>
            </header>

            <dl className="admin-leads-meta">
              <div>
                <dt>Company</dt>
                <dd>{selected.company}</dd>
              </div>
              {selected.teamSize ? (
                <div>
                  <dt>Team size</dt>
                  <dd>{selected.teamSize}</dd>
                </div>
              ) : null}
              <div>
                <dt>Submitted</dt>
                <dd>{new Date(selected.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{new Date(selected.updatedAt).toLocaleString()}</dd>
              </div>
              {selected.convertedAt ? (
                <div>
                  <dt>Converted</dt>
                  <dd>{new Date(selected.convertedAt).toLocaleString()}</dd>
                </div>
              ) : null}
              {selected.tenantSlug ? (
                <div>
                  <dt>Tenant</dt>
                  <dd>
                    <strong>{selected.tenantName ?? selected.tenantSlug}</strong>
                    <span className="muted"> ({selected.tenantSlug})</span>
                  </dd>
                </div>
              ) : null}
            </dl>

            {selected.message ? (
              <blockquote className="admin-leads-message">“{selected.message}”</blockquote>
            ) : null}

            <label>
              Pipeline stage
              <select
                value={selected.status}
                onChange={(e) => void changeStatus(selected.id, e.target.value as MarketingLead["status"])}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>

            <form onSubmit={saveLead}>
              <label>
                Internal notes
                <textarea rows={5} value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} placeholder="Qualification notes, follow-up plan, pricing discussed…" />
              </label>
              <div className="editor-actions">
                <button type="submit" className="btn btn-secondary btn-sm">
                  Save notes
                </button>
                {selected.status !== "converted" && !selected.tenantId && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={converting}
                    onClick={() => setShowConvertConfirm(true)}
                  >
                    Convert to tenant
                  </button>
                )}
              </div>
            </form>

            {showConvertConfirm && (
              <div className="admin-leads-confirm card">
                <h4>Provision tenant?</h4>
                <p className="muted">
                  Creates tenant, panel account, and PMail+ user for <strong>{selected.company}</strong> ({selected.email}).
                </p>
                <div className="editor-actions">
                  <button type="button" className="btn btn-primary btn-sm" disabled={converting} onClick={() => void convertLead(selected.id)}>
                    {converting ? "Provisioning…" : "Confirm provision"}
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowConvertConfirm(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </aside>
        ) : (
          <div className="card admin-leads-detail admin-leads-detail-empty">
            <p className="muted">Select a lead to review details and take action.</p>
          </div>
        )}
      </div>
    </div>
  );
}