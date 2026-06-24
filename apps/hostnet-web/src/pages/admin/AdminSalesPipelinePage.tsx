import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../api/client";
import type {
  FormFieldDefinition,
  InquirySubmission,
  MembershipApplication,
  PublicFormDefinition,
  SalesPipelineOverview,
} from "../../types/site";
import { AdminLeadsPanel } from "./AdminLeadsPanel";
import { AdminReferralLeadsPanel } from "./AdminReferralLeadsPanel";
import { AdminPmailProspectsPanel } from "./AdminPmailProspectsPanel";
import { FormFieldsEditor } from "./FormFieldsEditor";
import { AdminTrendCharts } from "./AdminTrendCharts";
import "./AdminDashboard.css";

type SalesSubTab = "overview" | "leads" | "referral-leads" | "pmail-prospects" | "membership" | "inquiries" | "forms";

const BUILTIN_FORM_KEYS = new Set(["membership", "inquiry"]);

type SalesTrends = {
  days: number;
  series: Array<{ date: string; membership: number; inquiries: number; leads: number }>;
  hostingScaleMix: Record<string, number>;
};

const MEMBERSHIP_STATUSES: MembershipApplication["status"][] = [
  "new",
  "demo_sent",
  "provisioned",
  "pushed_to_leads",
  "closed",
];

const MEMBERSHIP_STATUS_LABELS: Record<MembershipApplication["status"], string> = {
  new: "New",
  demo_sent: "Demo sent",
  provisioned: "Provisioned",
  pushed_to_leads: "Pushed to leads",
  closed: "Closed",
};

const INQUIRY_STATUSES: InquirySubmission["status"][] = ["new", "in_progress", "resolved", "pushed_to_leads"];

const INQUIRY_STATUS_LABELS: Record<InquirySubmission["status"], string> = {
  new: "New",
  in_progress: "In progress",
  resolved: "Resolved",
  pushed_to_leads: "Pushed to leads",
};

const SUBTAB_LABELS: Record<SalesSubTab, string> = {
  overview: "Overview",
  leads: "Leads",
  "referral-leads": "PMail+ Referral leads",
  "pmail-prospects": "PMail+ Prospects",
  membership: "Membership",
  inquiries: "Inquiries",
  forms: "Forms",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function errMsg(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function AdminSalesPipelinePage({
  pollKey,
  isSuperAdmin = false,
  onError,
  onMessage,
}: {
  pollKey?: string;
  isSuperAdmin?: boolean;
  onError: (msg: string) => void;
  onMessage: (msg: string) => void;
}) {
  const [subTab, setSubTab] = useState<SalesSubTab>("overview");
  const visibleTabs = (Object.keys(SUBTAB_LABELS) as SalesSubTab[]).filter(
    (tab) => (tab !== "referral-leads" && tab !== "pmail-prospects") || isSuperAdmin,
  );

  return (
    <div className="admin-billing-module">
      <div className="admin-subtabs" role="tablist" aria-label="Sales pipeline sections">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={subTab === tab}
            className={subTab === tab ? "active" : ""}
            onClick={() => setSubTab(tab)}
          >
            {SUBTAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {subTab === "overview" && <SalesOverviewTab pollKey={pollKey} onError={onError} />}
      {subTab === "leads" && (
        <AdminLeadsPanel pollKey={pollKey} onError={onError} onMessage={onMessage} />
      )}
      {subTab === "referral-leads" && isSuperAdmin ? (
        <AdminReferralLeadsPanel pollKey={pollKey} onError={onError} />
      ) : null}
      {subTab === "pmail-prospects" && isSuperAdmin ? (
        <AdminPmailProspectsPanel pollKey={pollKey} onError={onError} />
      ) : null}
      {subTab === "membership" && (
        <MembershipTab onError={onError} onMessage={onMessage} />
      )}
      {subTab === "inquiries" && <InquiriesTab onError={onError} onMessage={onMessage} />}
      {subTab === "forms" && <FormsTab onError={onError} onMessage={onMessage} />}
    </div>
  );
}

function SalesOverviewTab({
  pollKey,
  onError,
}: {
  pollKey?: string;
  onError: (msg: string) => void;
}) {
  const [overview, setOverview] = useState<SalesPipelineOverview | null>(null);
  const [trends, setTrends] = useState<SalesTrends | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, trendsRes] = await Promise.all([
        api.adminSalesOverview(),
        api.adminSalesTrends(30),
      ]);
      setOverview(overviewRes.overview);
      setTrends(trendsRes.trends);
    } catch (err) {
      onError(errMsg(err, "Failed to load sales overview"));
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (pollKey) void load();
  }, [pollKey, load]);

  const trendChartSeries = useMemo(() => {
    if (!trends) return [];
    return [
      {
        label: "Leads",
        color: "#14b8a6",
        data: trends.series.map((p) => ({ date: p.date, count: p.leads })),
        valueKey: "count" as const,
      },
      {
        label: "Membership",
        color: "#0d9488",
        data: trends.series.map((p) => ({ date: p.date, count: p.membership })),
        valueKey: "count" as const,
      },
      {
        label: "Inquiries",
        color: "#6366f1",
        data: trends.series.map((p) => ({ date: p.date, count: p.inquiries })),
        valueKey: "count" as const,
      },
    ];
  }, [trends]);

  if (loading && !overview) return <p className="muted">Loading sales pipeline…</p>;
  if (!overview || !trends) return <p className="muted">No overview data available.</p>;

  return (
    <>
      <div className="admin-stat-grid">
        <div className="admin-stat-card highlight">
          <span className="admin-stat-label">Leads</span>
          <span className="admin-stat-value">{overview.leads.total}</span>
          <span className="admin-stat-sub">{overview.leads.newThisWeek} new this week</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Membership apps</span>
          <span className="admin-stat-value">{overview.membership.total}</span>
          <span className="admin-stat-sub">{overview.membership.demoSent} demo sent · awaiting provisioning</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Inquiries</span>
          <span className="admin-stat-value">{overview.inquiries.total}</span>
          <span className="admin-stat-sub">{overview.inquiries.open} open</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Lead conversion</span>
          <span className="admin-stat-value">{overview.leads.conversionRate}%</span>
          <span className="admin-stat-sub">{overview.leads.qualifiedUnconverted} qualified unconverted</span>
        </div>
      </div>

      <div className="admin-two-col">
        <div className="card">
          <h3>30-day activity trend</h3>
          {trendChartSeries[0]?.data.length ? (
            <AdminTrendCharts series={trendChartSeries} height={160} />
          ) : (
            <p className="muted">No trend data yet.</p>
          )}
        </div>

        <div className="card">
          <h3>Hosting scale mix</h3>
          {Object.keys(trends.hostingScaleMix).length === 0 ? (
            <p className="muted">No membership scale data yet.</p>
          ) : (
            <div className="admin-leads-pipeline-bars">
              {Object.entries(trends.hostingScaleMix).map(([scale, count]) => {
                const max = Math.max(...Object.values(trends.hostingScaleMix), 1);
                return (
                  <div key={scale} className="admin-pipeline-row">
                    <span className="admin-pipeline-label">{scale}</span>
                    <div className="admin-pipeline-track">
                      <div
                        className="admin-pipeline-fill"
                        style={{ width: `${Math.round((count / max) * 100)}%` }}
                      />
                    </div>
                    <strong>{count}</strong>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="admin-two-col">
        <RecentList
          title="Recent membership"
          items={overview.recent.membership.map((m) => ({
            id: m.id,
            primary: m.fullName,
            secondary: m.workEmail,
            status: m.status,
            date: m.createdAt,
          }))}
        />
        <RecentList
          title="Recent inquiries"
          items={overview.recent.inquiries.map((i) => ({
            id: i.id,
            primary: i.name,
            secondary: i.email,
            status: i.status,
            date: i.createdAt,
          }))}
        />
      </div>
    </>
  );
}

function RecentList({
  title,
  items,
}: {
  title: string;
  items: Array<{ id: string; primary: string; secondary: string; status: string; date: string }>;
}) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <ul className="admin-list">
        {items.length === 0 ? (
          <li className="muted">Nothing recent.</li>
        ) : (
          items.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.primary}</strong>
                <div className="muted">{item.secondary}</div>
              </div>
              <span className="badge">{item.status.replace(/_/g, " ")}</span>
              <span className="muted">{formatDate(item.date)}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function MembershipTab({
  onError,
  onMessage,
}: {
  onError: (msg: string) => void;
  onMessage: (msg: string) => void;
}) {
  const [applications, setApplications] = useState<MembershipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<MembershipApplication["status"] | "all">("all");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<MembershipApplication["status"]>("new");
  const [busy, setBusy] = useState(false);

  const selected = applications.find((a) => a.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminMembership({
        status: statusFilter === "all" ? undefined : statusFilter,
        q: search || undefined,
      });
      setApplications(res.applications);
      if (!selectedId && res.applications[0]) {
        setSelectedId(res.applications[0].id);
      } else if (selectedId && !res.applications.some((a) => a.id === selectedId)) {
        setSelectedId(res.applications[0]?.id ?? null);
      }
    } catch (err) {
      onError(errMsg(err, "Failed to load membership applications"));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, onError]);

  useEffect(() => {
    void load();
  }, [statusFilter, search]);

  useEffect(() => {
    if (selected) {
      setNotesDraft(selected.notes ?? "");
      setStatusDraft(selected.status);
    }
  }, [selected?.id]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      const res = await api.updateAdminMembership(selected.id, {
        status: statusDraft,
        notes: notesDraft || null,
      });
      setApplications((prev) => prev.map((a) => (a.id === res.application.id ? res.application : a)));
      onMessage("Membership application saved");
    } catch (err) {
      onError(errMsg(err, "Save failed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!selected || !window.confirm(`Delete application for ${selected.fullName}?`)) return;
    setBusy(true);
    try {
      await api.deleteAdminMembership(selected.id);
      setApplications((prev) => prev.filter((a) => a.id !== selected.id));
      setSelectedId(null);
      onMessage("Membership application deleted");
    } catch (err) {
      onError(errMsg(err, "Delete failed"));
    } finally {
      setBusy(false);
    }
  }

  async function pushToLeads() {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await api.pushMembershipToLeads(selected.id);
      setApplications((prev) => prev.map((a) => (a.id === res.application.id ? res.application : a)));
      onMessage(`Pushed to leads (lead ${res.leadId})`);
    } catch (err) {
      onError(errMsg(err, "Push to leads failed"));
    } finally {
      setBusy(false);
    }
  }

  if (loading && applications.length === 0) return <p className="muted">Loading membership applications…</p>;

  return (
    <>
      <div className="admin-leads-toolbar">
        <div className="admin-leads-search">
          <input
            type="search"
            placeholder="Search name or email…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSearch(searchDraft.trim());
            }}
          />
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSearch(searchDraft.trim())}>
            Search
          </button>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as MembershipApplication["status"] | "all")}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {MEMBERSHIP_STATUSES.map((s) => (
            <option key={s} value={s}>
              {MEMBERSHIP_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-leads-layout">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Team</th>
                <th>Scale</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr
                  key={app.id}
                  className={app.id === selectedId ? "selected" : ""}
                  onClick={() => setSelectedId(app.id)}
                >
                  <td>
                    <strong>{app.fullName}</strong>
                    <div className="muted">{app.workEmail}</div>
                  </td>
                  <td>{app.teamType}</td>
                  <td className="muted">{app.hostingScale}</td>
                  <td>
                    <span className="badge">{MEMBERSHIP_STATUS_LABELS[app.status]}</span>
                  </td>
                  <td className="muted">{formatDate(app.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {applications.length === 0 && !loading ? (
            <p className="muted admin-leads-empty">No membership applications match this filter.</p>
          ) : null}
        </div>

        {selected ? (
          <aside className="card admin-leads-detail">
            <header className="admin-leads-detail-head">
              <div>
                <h3>{selected.fullName}</h3>
                <p className="muted">{selected.workEmail}</p>
              </div>
              <span className="badge">{MEMBERSHIP_STATUS_LABELS[selected.status]}</span>
            </header>

            <dl className="admin-leads-meta">
              <div>
                <dt>Phone</dt>
                <dd>{selected.phone || "—"}</dd>
              </div>
              <div>
                <dt>Team type</dt>
                <dd>{selected.teamType}</dd>
              </div>
              <div>
                <dt>Deploy intent</dt>
                <dd>{selected.deployIntent}</dd>
              </div>
              <div>
                <dt>Hosting scale</dt>
                <dd>{selected.hostingScale}</dd>
              </div>
              <div>
                <dt>Email service</dt>
                <dd>{selected.emailService}</dd>
              </div>
              {selected.demoUsername ? (
                <div>
                  <dt>Demo</dt>
                  <dd>
                    {selected.demoUsername}@{selected.demoDomain}
                  </dd>
                </div>
              ) : null}
              {selected.marketingLeadId ? (
                <div>
                  <dt>Lead ID</dt>
                  <dd className="admin-status-mono">{selected.marketingLeadId}</dd>
                </div>
              ) : null}
            </dl>

            <form className="form-grid" onSubmit={save}>
              <label>
                Status
                <select
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value as MembershipApplication["status"])}
                >
                  {MEMBERSHIP_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {MEMBERSHIP_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Internal notes
                <textarea rows={4} value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} />
              </label>
              <div className="editor-actions">
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                  Save
                </button>
                {selected.status !== "pushed_to_leads" && !selected.marketingLeadId ? (
                  <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void pushToLeads()}>
                    Push to leads
                  </button>
                ) : null}
                <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => void remove()}>
                  Delete
                </button>
              </div>
            </form>
          </aside>
        ) : (
          <div className="card admin-leads-detail admin-leads-detail-empty">
            <p className="muted">Select an application to review details.</p>
          </div>
        )}
      </div>
    </>
  );
}

function InquiriesTab({
  onError,
  onMessage,
}: {
  onError: (msg: string) => void;
  onMessage: (msg: string) => void;
}) {
  const [inquiries, setInquiries] = useState<InquirySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<InquirySubmission["status"] | "all">("all");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<InquirySubmission["status"]>("new");
  const [busy, setBusy] = useState(false);

  const selected = inquiries.find((i) => i.id === selectedId) ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminInquiries({
        status: statusFilter === "all" ? undefined : statusFilter,
        q: search || undefined,
      });
      setInquiries(res.inquiries);
      if (!selectedId && res.inquiries[0]) {
        setSelectedId(res.inquiries[0].id);
      } else if (selectedId && !res.inquiries.some((i) => i.id === selectedId)) {
        setSelectedId(res.inquiries[0]?.id ?? null);
      }
    } catch (err) {
      onError(errMsg(err, "Failed to load inquiries"));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, onError]);

  useEffect(() => {
    void load();
  }, [statusFilter, search]);

  useEffect(() => {
    if (selected) {
      setNotesDraft(selected.notes ?? "");
      setStatusDraft(selected.status);
    }
  }, [selected?.id]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    try {
      const res = await api.updateAdminInquiry(selected.id, {
        status: statusDraft,
        notes: notesDraft || null,
      });
      setInquiries((prev) => prev.map((i) => (i.id === res.inquiry.id ? res.inquiry : i)));
      onMessage("Inquiry saved");
    } catch (err) {
      onError(errMsg(err, "Save failed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!selected || !window.confirm(`Delete inquiry from ${selected.name}?`)) return;
    setBusy(true);
    try {
      await api.deleteAdminInquiry(selected.id);
      setInquiries((prev) => prev.filter((i) => i.id !== selected.id));
      setSelectedId(null);
      onMessage("Inquiry deleted");
    } catch (err) {
      onError(errMsg(err, "Delete failed"));
    } finally {
      setBusy(false);
    }
  }

  async function pushToLeads() {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await api.pushInquiryToLeads(selected.id);
      setInquiries((prev) => prev.map((i) => (i.id === res.inquiry.id ? res.inquiry : i)));
      onMessage(`Pushed to leads (lead ${res.leadId})`);
    } catch (err) {
      onError(errMsg(err, "Push to leads failed"));
    } finally {
      setBusy(false);
    }
  }

  if (loading && inquiries.length === 0) return <p className="muted">Loading inquiries…</p>;

  return (
    <>
      <div className="admin-leads-toolbar">
        <div className="admin-leads-search">
          <input
            type="search"
            placeholder="Search name or email…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSearch(searchDraft.trim());
            }}
          />
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSearch(searchDraft.trim())}>
            Search
          </button>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InquirySubmission["status"] | "all")}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          {INQUIRY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {INQUIRY_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-leads-layout">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Contact</th>
                <th>Interest</th>
                <th>About</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inq) => (
                <tr
                  key={inq.id}
                  className={inq.id === selectedId ? "selected" : ""}
                  onClick={() => setSelectedId(inq.id)}
                >
                  <td>
                    <strong>{inq.name}</strong>
                    <div className="muted">{inq.email}</div>
                  </td>
                  <td>{inq.membershipInterest}</td>
                  <td className="muted">{inq.inquiringAbout}</td>
                  <td>
                    <span className="badge">{INQUIRY_STATUS_LABELS[inq.status]}</span>
                  </td>
                  <td className="muted">{formatDate(inq.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {inquiries.length === 0 && !loading ? (
            <p className="muted admin-leads-empty">No inquiries match this filter.</p>
          ) : null}
        </div>

        {selected ? (
          <aside className="card admin-leads-detail">
            <header className="admin-leads-detail-head">
              <div>
                <h3>{selected.name}</h3>
                <p className="muted">{selected.email}</p>
              </div>
              <span className="badge">{INQUIRY_STATUS_LABELS[selected.status]}</span>
            </header>

            <dl className="admin-leads-meta">
              <div>
                <dt>Phone</dt>
                <dd>{selected.phone || "—"}</dd>
              </div>
              <div>
                <dt>Membership interest</dt>
                <dd>{selected.membershipInterest}</dd>
              </div>
              <div>
                <dt>Inquiring about</dt>
                <dd>{selected.inquiringAbout}</dd>
              </div>
              {selected.marketingLeadId ? (
                <div>
                  <dt>Lead ID</dt>
                  <dd className="admin-status-mono">{selected.marketingLeadId}</dd>
                </div>
              ) : null}
            </dl>

            <form className="form-grid" onSubmit={save}>
              <label>
                Status
                <select
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value as InquirySubmission["status"])}
                >
                  {INQUIRY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {INQUIRY_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Internal notes
                <textarea rows={4} value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} />
              </label>
              <div className="editor-actions">
                <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                  Save
                </button>
                {selected.status !== "pushed_to_leads" && !selected.marketingLeadId ? (
                  <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void pushToLeads()}>
                    Push to leads
                  </button>
                ) : null}
                <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => void remove()}>
                  Delete
                </button>
              </div>
            </form>
          </aside>
        ) : (
          <div className="card admin-leads-detail admin-leads-detail-empty">
            <p className="muted">Select an inquiry to review details.</p>
          </div>
        )}
      </div>
    </>
  );
}

function FormsTab({
  onError,
  onMessage,
}: {
  onError: (msg: string) => void;
  onMessage: (msg: string) => void;
}) {
  const [forms, setForms] = useState<PublicFormDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [formKeyDraft, setFormKeyDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [isActiveDraft, setIsActiveDraft] = useState(true);
  const [fieldsDraft, setFieldsDraft] = useState<FormFieldDefinition[]>([]);
  const [busy, setBusy] = useState(false);

  const selected = forms.find((f) => f.id === selectedId) ?? null;
  const isBuiltin = selected ? BUILTIN_FORM_KEYS.has(selected.formKey) : false;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminFormDefinitions();
      setForms(res.forms);
      if (!creating && !selectedId && res.forms[0]) {
        setSelectedId(res.forms[0].id);
      } else if (!creating && selectedId && !res.forms.some((f) => f.id === selectedId)) {
        setSelectedId(res.forms[0]?.id ?? null);
      }
    } catch (err) {
      onError(errMsg(err, "Failed to load form definitions"));
    } finally {
      setLoading(false);
    }
  }, [creating, selectedId, onError]);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (creating) {
      setFormKeyDraft("");
      setTitleDraft("");
      setDescriptionDraft("");
      setIsActiveDraft(false);
      setFieldsDraft([]);
      return;
    }
    if (selected) {
      setTitleDraft(selected.title);
      setDescriptionDraft(selected.description ?? "");
      setIsActiveDraft(selected.isActive);
      setFieldsDraft(selected.fields);
    }
  }, [selected?.id, creating]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (creating) {
        const res = await api.createAdminFormDefinition({
          formKey: formKeyDraft.trim(),
          title: titleDraft.trim(),
          description: descriptionDraft || null,
          isActive: isActiveDraft,
          fields: fieldsDraft,
        });
        setForms((prev) => [...prev, res.form].sort((a, b) => a.formKey.localeCompare(b.formKey)));
        setCreating(false);
        setSelectedId(res.form.id);
        onMessage(`Form “${res.form.title}” created`);
      } else if (selected) {
        const res = await api.updateAdminFormDefinition(selected.id, {
          title: titleDraft,
          description: descriptionDraft || null,
          isActive: isActiveDraft,
          fields: fieldsDraft,
        });
        setForms((prev) => prev.map((f) => (f.id === res.form.id ? res.form : f)));
        onMessage(`Form “${res.form.title}” saved`);
      }
    } catch (err) {
      onError(errMsg(err, creating ? "Create failed" : "Save failed"));
    } finally {
      setBusy(false);
    }
  }

  async function removeForm() {
    if (!selected || isBuiltin) return;
    if (!window.confirm(`Delete form “${selected.title}”? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.deleteAdminFormDefinition(selected.id);
      setForms((prev) => prev.filter((f) => f.id !== selected.id));
      setSelectedId(null);
      onMessage(`Form “${selected.title}” deleted`);
    } catch (err) {
      onError(errMsg(err, "Delete failed"));
    } finally {
      setBusy(false);
    }
  }

  if (loading && forms.length === 0) return <p className="muted">Loading form definitions…</p>;

  return (
    <div className="admin-sections-layout">
      <div className="card admin-sections-rail">
        <div className="admin-sections-rail-head">
          <strong>Public forms</strong>
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
        <ul className="admin-sections-list">
          {forms.map((form) => (
            <li key={form.id}>
              <button
                type="button"
                className={`admin-sections-list-item${!creating && form.id === selectedId ? " active" : ""}`}
                onClick={() => {
                  setCreating(false);
                  setSelectedId(form.id);
                }}
              >
                <span className={`admin-sections-dot${form.isActive ? " live" : ""}`} />
                <span className="admin-sections-list-text">
                  <strong>{form.title}</strong>
                  <span className="muted">{form.formKey}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {forms.length === 0 ? <p className="muted admin-sections-rail-foot">No forms configured.</p> : null}
      </div>

      {creating || selected ? (
        <form className="card admin-sections-editor form-grid admin-sections-form" onSubmit={save}>
          <div className="admin-sections-editor-head">
            <div>
              <h2>{creating ? "New form" : selected?.formKey}</h2>
              {!creating && selected ? <p className="muted">Updated {formatDate(selected.updatedAt)}</p> : null}
            </div>
            <label className="admin-toggle">
              <input type="checkbox" checked={isActiveDraft} onChange={(e) => setIsActiveDraft(e.target.checked)} />
              Active on site
            </label>
          </div>

          {creating ? (
            <label>
              Form key
              <input
                value={formKeyDraft}
                onChange={(e) => setFormKeyDraft(e.target.value.replace(/\s+/g, "_").toLowerCase())}
                placeholder="partner_signup"
                pattern="[a-z0-9_-]+"
                required
              />
              <span className="muted admin-field-hint">Lowercase identifier used in API/public routing.</span>
            </label>
          ) : null}

          <label>
            Title
            <input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} required />
          </label>
          <label>
            Description
            <textarea rows={2} value={descriptionDraft} onChange={(e) => setDescriptionDraft(e.target.value)} />
          </label>
          <FormFieldsEditor fields={fieldsDraft} onChange={setFieldsDraft} />

          <div className="editor-actions admin-sections-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {creating ? "Create form" : "Save form definition"}
            </button>
            {creating ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setCreating(false);
                  setSelectedId(forms[0]?.id ?? null);
                }}
              >
                Cancel
              </button>
            ) : selected && !isBuiltin ? (
              <button type="button" className="btn btn-danger" disabled={busy} onClick={() => void removeForm()}>
                Delete form
              </button>
            ) : isBuiltin ? (
              <span className="muted admin-field-hint">Built-in form — cannot delete.</span>
            ) : null}
          </div>
        </form>
      ) : (
        <div className="card admin-sections-editor">
          <p className="muted">Select a form to edit or create a new one.</p>
        </div>
      )}
    </div>
  );
}
