import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../api/client";
import "./AdminDashboard.css";

export type PmailReferralLead = {
  id: string;
  recipientEmail: string;
  referredBy: string;
  referredByEmail: string;
  referredByUserId: string;
  referredOn: string;
  emailStatus: "pending" | "delivered" | "read" | "bounced";
  sentAt: string | null;
  readAt: string | null;
  bouncedAt: string | null;
  convertedAt: string | null;
  convertedUserId: string | null;
  marketingLeadId: string | null;
  tenant: { id: string; slug: string; name: string };
};

const STATUS_LABELS: Record<PmailReferralLead["emailStatus"], string> = {
  pending: "Pending",
  delivered: "Delivered",
  read: "Read",
  bounced: "Bounced",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export function AdminReferralLeadsPanel({
  pollKey,
  onError,
}: {
  pollKey?: string;
  onError: (msg: string) => void;
}) {
  const [leads, setLeads] = useState<PmailReferralLead[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    delivered: number;
    read: number;
    bounced: number;
    pending: number;
    converted: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PmailReferralLead["emailStatus"] | "all">("all");
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, statsRes] = await Promise.all([
        api.adminReferralLeads({
          emailStatus: statusFilter === "all" ? undefined : statusFilter,
          q: search || undefined,
        }),
        api.adminReferralLeadStats(),
      ]);
      setLeads(leadsRes.leads);
      setStats(statsRes.stats);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Failed to load PMail+ referral leads");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, onError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (pollKey) void load();
  }, [pollKey, load]);

  const filteredCount = useMemo(() => leads.length, [leads]);

  return (
    <div className="admin-leads-panel">
      <header className="admin-module-head">
        <div>
          <h2>PMail+ Referral leads</h2>
          <p className="muted">
            Recipients extracted when workspace users send Refer a friend invitations. Track delivery and opens from the
            Super Admin CRM.
          </p>
        </div>
      </header>

      {stats ? (
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <span>Total leads</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="admin-stat-card">
            <span>Delivered</span>
            <strong>{stats.delivered}</strong>
          </div>
          <div className="admin-stat-card">
            <span>Read</span>
            <strong>{stats.read}</strong>
          </div>
          <div className="admin-stat-card">
            <span>Bounced</span>
            <strong>{stats.bounced}</strong>
          </div>
          <div className="admin-stat-card">
            <span>Converted</span>
            <strong>{stats.converted}</strong>
          </div>
        </div>
      ) : null}

      <div className="admin-leads-toolbar">
        <input
          className="admin-search"
          type="search"
          placeholder="Search recipient or referrer…"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") setSearch(searchDraft.trim());
          }}
        />
        <button type="button" className="btn btn-secondary" onClick={() => setSearch(searchDraft.trim())}>
          Search
        </button>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="delivered">Delivered</option>
          <option value="read">Read</option>
          <option value="bounced">Bounced</option>
        </select>
      </div>

      {loading ? <p className="muted">Loading referral leads…</p> : null}
      {!loading && filteredCount === 0 ? <p className="muted">No PMail+ referral leads yet.</p> : null}

      {!loading && filteredCount > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Recipient email</th>
                <th>Referred by</th>
                <th>Referred on</th>
                <th>Email status</th>
                <th>Converted</th>
                <th>Sent</th>
                <th>Read</th>
                <th>Tenant</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>{lead.recipientEmail}</td>
                  <td>
                    <strong>{lead.referredBy}</strong>
                    <div className="muted">{lead.referredByEmail}</div>
                  </td>
                  <td>{formatDate(lead.referredOn)}</td>
                  <td>
                    <span className={`admin-status-pill admin-status-pill--${lead.emailStatus}`}>
                      {STATUS_LABELS[lead.emailStatus]}
                    </span>
                  </td>
                  <td>{formatDate(lead.convertedAt)}</td>
                  <td>{formatDate(lead.sentAt)}</td>
                  <td>{formatDate(lead.readAt)}</td>
                  <td>{lead.tenant.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
