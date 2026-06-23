import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, type JobSiteLinkRow } from "../api/client";
import "./CareerJobSitesPanel.css";

export function CareerJobSitesPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [links, setLinks] = useState<JobSiteLinkRow[]>([]);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUrl, setEditUrl] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.listJobSiteLinks();
      setLinks(res.links);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load job sites");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submitNew = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api.createJobSiteLink({ label, url });
      setLabel("");
      setUrl("");
      setNotice("Job site saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save job site");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (link: JobSiteLinkRow) => {
    setEditingId(link.id);
    setEditLabel(link.label);
    setEditUrl(link.url);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    setError("");
    try {
      await api.updateJobSiteLink(editingId, { label: editLabel, url: editUrl });
      setEditingId(null);
      setNotice("Job site updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update job site");
    } finally {
      setSaving(false);
    }
  };

  const removeLink = async (id: string) => {
    setError("");
    try {
      await api.deleteJobSiteLink(id);
      setNotice("Job site removed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete job site");
    }
  };

  const openLink = (linkUrl: string) => {
    window.open(linkUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="career-job-sites">
      <div className="career-workspace-title-row">
        <div>
          <h1>Job sites</h1>
          <p>Save links to LinkedIn, Indeed, and other boards you use while job hunting.</p>
        </div>
      </div>

      {error ? <p className="career-workspace-error">{error}</p> : null}
      {notice ? <p className="career-workspace-notice">{notice}</p> : null}

      <form className="career-job-sites-form" onSubmit={(event) => void submitNew(event)}>
        <label>
          Label
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="LinkedIn" required />
        </label>
        <label>
          URL
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.linkedin.com/jobs/"
            required
          />
        </label>
        <button type="submit" className="career-workspace-btn" disabled={saving}>
          {saving ? "Saving…" : "Add link"}
        </button>
      </form>

      {loading ? (
        <p>Loading job sites…</p>
      ) : links.length === 0 ? (
        <div className="career-workspace-empty">
          <h2>No job sites yet</h2>
          <p>Add your favourite job boards so you can open them quickly from your career workspace.</p>
        </div>
      ) : (
        <ul className="career-job-sites-list">
          {links.map((link) => (
            <li key={link.id}>
              {editingId === link.id ? (
                <div className="career-job-sites-edit">
                  <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                  <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
                  <button type="button" className="career-workspace-btn" disabled={saving} onClick={() => void saveEdit()}>
                    Save
                  </button>
                  <button type="button" className="career-workspace-btn subtle" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="career-job-sites-row">
                  <div>
                    <strong>{link.label}</strong>
                    <span className="career-job-sites-url">{link.url}</span>
                  </div>
                  <div className="career-job-sites-actions">
                    <button type="button" className="career-workspace-btn" onClick={() => openLink(link.url)}>
                      Open
                    </button>
                    <button type="button" className="career-workspace-btn subtle" onClick={() => startEdit(link)}>
                      Edit
                    </button>
                    <button type="button" className="career-workspace-btn subtle" onClick={() => void removeLink(link.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
