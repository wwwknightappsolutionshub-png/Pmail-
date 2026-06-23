import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type JobApplicationRow } from "../api/client";
import { useCareerWorkspace } from "../context/CareerWorkspaceContext";

const STATUS_LABELS: Record<string, string> = {
  applied: "Applied",
  acknowledged: "Acknowledged",
  interview: "Interview",
  rejected: "Rejected",
  offer: "Offer",
  withdrawn: "Withdrawn",
};

const STATUS_OPTIONS = Object.keys(STATUS_LABELS);

export function CareerHistoryPanel() {
  const navigate = useNavigate();
  const { canWrite } = useCareerWorkspace();

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [applications, setApplications] = useState<JobApplicationRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCompany, setManualCompany] = useState("");
  const [manualRole, setManualRole] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [statusSavingId, setStatusSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const listRes = await api.listJobApplications(statusFilter || undefined);
      setApplications(listRes.applications);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load applications");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const runSync = async () => {
    if (!canWrite) {
      setError("Subscribe to Job Hunter to sync mail.");
      return;
    }
    setSyncing(true);
    setNotice("");
    setError("");
    try {
      await api.syncJobApplications();
      setNotice("Mail sync complete. Application history refreshed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const submitManual = async (event: FormEvent) => {
    event.preventDefault();
    if (!canWrite) {
      setError("Subscribe to Job Hunter to add applications.");
      return;
    }
    setManualSaving(true);
    setError("");
    try {
      await api.createJobApplication({
        company: manualCompany,
        roleTitle: manualRole,
      });
      setManualCompany("");
      setManualRole("");
      setManualOpen(false);
      setNotice("Application added.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save application");
    } finally {
      setManualSaving(false);
    }
  };

  const updateStatus = async (application: JobApplicationRow, status: string) => {
    if (!canWrite || status === application.status) return;
    setStatusSavingId(application.id);
    setError("");
    try {
      await api.updateJobApplication(application.id, { status });
      setNotice(`Updated ${application.company} to ${STATUS_LABELS[status] ?? status}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setStatusSavingId(null);
    }
  };

  const openMail = (application: JobApplicationRow) => {
    if (!application.imapFolder || !application.messageUid) return;
    navigate(`/?mailFolder=${encodeURIComponent(application.imapFolder)}&uid=${application.messageUid}`);
  };

  return (
    <>
      <div className="career-workspace-title-row">
        <div>
          <h1>Application history</h1>
          <p>Tracked from career-related sent and inbox mail, plus anything you add manually.</p>
        </div>
        <div className="career-workspace-title-actions">
          <button
            type="button"
            className="career-workspace-btn subtle"
            disabled={syncing || !canWrite}
            onClick={() => void runSync()}
          >
            {syncing ? "Syncing…" : "Sync mail"}
          </button>
          <button
            type="button"
            className="career-workspace-btn"
            disabled={!canWrite}
            onClick={() => setManualOpen((open) => !open)}
          >
            {manualOpen ? "Cancel" : "Add application"}
          </button>
        </div>
      </div>

      {error ? <p className="career-workspace-error">{error}</p> : null}
      {notice ? <p className="career-workspace-notice">{notice}</p> : null}

      {manualOpen ? (
        <form className="career-workspace-manual" onSubmit={(event) => void submitManual(event)}>
          <label>
            Company
            <input value={manualCompany} onChange={(e) => setManualCompany(e.target.value)} required disabled={!canWrite} />
          </label>
          <label>
            Role
            <input value={manualRole} onChange={(e) => setManualRole(e.target.value)} required disabled={!canWrite} />
          </label>
          <button type="submit" className="career-workspace-btn" disabled={manualSaving || !canWrite}>
            {manualSaving ? "Saving…" : "Save"}
          </button>
        </form>
      ) : null}

      <div className="career-workspace-filters">
        <label>
          Status
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p>Loading applications…</p>
      ) : applications.length === 0 ? (
        <div className="career-workspace-empty">
          <h2>No applications yet</h2>
          <p>
            When you apply to roles from this mailbox or receive recruiter replies, entries appear here after the next
            mail sync. You can also add an application manually.
          </p>
          <div className="career-workspace-empty-actions">
            <Link className="career-workspace-btn" to="/career/settings">
              Configure Job Hunter
            </Link>
            <Link className="career-workspace-btn subtle" to="/career/build">
              Build a CV
            </Link>
          </div>
        </div>
      ) : (
        <div className="career-workspace-table-wrap">
          <table className="career-workspace-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Role</th>
                <th>Date applied</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id}>
                  <td>{application.company}</td>
                  <td>{application.roleTitle}</td>
                  <td>{new Date(application.appliedAt).toLocaleDateString()}</td>
                  <td>
                    <select
                      className="career-status-select"
                      value={application.status}
                      disabled={!canWrite || statusSavingId === application.id}
                      onChange={(e) => void updateStatus(application, e.target.value)}
                      aria-label={`Status for ${application.company}`}
                    >
                      {STATUS_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {STATUS_LABELS[value]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="career-workspace-row-actions">
                    {application.hasMailLink ? (
                      <button type="button" className="career-workspace-link-btn" onClick={() => openMail(application)}>
                        Open mail
                      </button>
                    ) : (
                      <span className="career-workspace-muted">Manual</span>
                    )}
                    <Link
                      className="career-workspace-link-btn"
                      to={`/career/interview-prep?applicationId=${encodeURIComponent(application.id)}`}
                    >
                      Prep
                    </Link>
                    <Link
                      className="career-workspace-link-btn"
                      to={`/career/apply-assist?company=${encodeURIComponent(application.company)}&role=${encodeURIComponent(application.roleTitle)}`}
                    >
                      Apply
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
