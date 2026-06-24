import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../api/client";
import "./AdminDashboard.css";

export type PmailProspectRow = {
  id: string;
  tenantSlug: string | null;
  fullName: string;
  email: string;
  company: string | null;
  referrerEmail: string | null;
  status: "interested" | "contacted" | "invited" | "converted" | "closed";
  notes: string | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_LABELS: Record<PmailProspectRow["status"], string> = {
  interested: "Interested",
  contacted: "Contacted",
  invited: "Invited",
  converted: "Converted",
  closed: "Closed",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export function AdminPmailProspectsPanel({
  pollKey,
  onError,
}: {
  pollKey?: string;
  onError: (msg: string) => void;
}) {
  const [prospects, setProspects] = useState<PmailProspectRow[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    funnel: Record<PmailProspectRow["status"], number>;
    newThisWeek: number;
    unconverted: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PmailProspectRow["status"] | "all">("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        api.adminPmailProspects({
          status: statusFilter === "all" ? undefined : statusFilter,
          q: query.trim() || undefined,
        }),
        api.adminPmailProspectStats(),
      ]);
      setProspects(listRes.prospects);
      setStats(statsRes.stats);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Failed to load PMail+ prospects");
    } finally {
      setLoading(false);
    }
  }, [onError, query, statusFilter]);

  useEffect(() => {
    void load();
  }, [load, pollKey]);

  const filteredCount = useMemo(() => prospects.length, [prospects]);

  return (
    <div className="admin-leads-panel">
      <header className="admin-leads-toolbar">
        <div>
          <h3>PMail+ Prospects</h3>
          <p className="muted">Workspace access requests captured before mailbox sign-in.</p>
        </div>
        {stats ? (
          <div className="admin-leads-funnel">
            <span>{stats.total} total</span>
            <span>{stats.newThisWeek} this week</span>
            <span>{stats.unconverted} open</span>
          </div>
        ) : null}
      </header>

      <div className="admin-leads-toolbar">
        <div className="admin-leads-search">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, company…"
            aria-label="Search prospects"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PmailProspectRow["status"] | "all")}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {(Object.keys(STATUS_LABELS) as PmailProspectRow["status"][]).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <button type="button" className="btn-secondary" onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Company</th>
              <th>Referrer</th>
              <th>Status</th>
              <th>Requested</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((prospect) => (
              <tr key={prospect.id}>
                <td>{prospect.fullName}</td>
                <td>{prospect.email}</td>
                <td>{prospect.company || "—"}</td>
                <td>{prospect.referrerEmail || "—"}</td>
                <td>
                  <span className={`admin-status-pill admin-status-pill--${prospect.status}`}>
                    {STATUS_LABELS[prospect.status]}
                  </span>
                </td>
                <td>{formatDate(prospect.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filteredCount === 0 ? (
          <p className="muted admin-leads-empty">No prospects match this filter.</p>
        ) : null}
      </div>
    </div>
  );
}
