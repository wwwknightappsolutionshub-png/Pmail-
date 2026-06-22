import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../api/client";
import type { Testimonial } from "../../types/site";
import "./AdminDashboard.css";

type QueueTab = "pending" | "published" | "all";

export function AdminTestimonialsPanel({
  onError,
  onMessage,
}: {
  onError: (msg: string) => void;
  onMessage: (msg: string) => void;
}) {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<QueueTab>("pending");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    authorName: "",
    authorRole: "",
    company: "",
    body: "",
    rating: 5,
    sortOrder: 0,
    isPublished: true,
    isFeatured: true,
  });
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.adminTestimonials();
      setItems(res.testimonials);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Failed to load testimonials");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const pending = useMemo(() => items.filter((t) => !t.isPublished), [items]);
  const published = useMemo(() => items.filter((t) => t.isPublished), [items]);

  const visible = tab === "pending" ? pending : tab === "published" ? published : items;

  function startEdit(item: Testimonial) {
    setCreating(false);
    setEditingId(item.id);
    setDraft({
      authorName: item.authorName,
      authorRole: item.authorRole ?? "",
      company: item.company ?? "",
      body: item.body,
      rating: item.rating,
      sortOrder: item.sortOrder,
      isPublished: item.isPublished,
      isFeatured: item.isFeatured,
    });
  }

  function startCreate() {
    setEditingId(null);
    setCreating(true);
    setDraft({
      authorName: "",
      authorRole: "",
      company: "",
      body: "",
      rating: 5,
      sortOrder: items.length,
      isPublished: true,
      isFeatured: true,
    });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = {
        authorName: draft.authorName,
        authorRole: draft.authorRole || null,
        company: draft.company || null,
        body: draft.body,
        rating: draft.rating,
        sortOrder: draft.sortOrder,
        isPublished: draft.isPublished,
        isFeatured: draft.isFeatured,
      };
      if (creating) {
        const res = await api.createAdminTestimonial(body);
        setItems((prev) => [...prev, res.testimonial]);
        onMessage("Testimonial created");
        setCreating(false);
      } else if (editingId) {
        const res = await api.updateAdminTestimonial(editingId, body);
        setItems((prev) => prev.map((t) => (t.id === res.testimonial.id ? res.testimonial : t)));
        onMessage("Testimonial saved");
        setEditingId(null);
      }
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function approve(id: string) {
    setBusy(true);
    try {
      const res = await api.approveAdminTestimonial(id);
      setItems((prev) => prev.map((t) => (t.id === id ? res.testimonial : t)));
      onMessage("Testimonial approved — now visible on the site");
      setTab("published");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Approve failed");
    } finally {
      setBusy(false);
    }
  }

  async function reject(id: string) {
    if (!window.confirm("Reject this review? It will stay hidden from the public site.")) return;
    setBusy(true);
    try {
      const res = await api.rejectAdminTestimonial(id);
      setItems((prev) => prev.map((t) => (t.id === id ? res.testimonial : t)));
      onMessage("Testimonial rejected");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Reject failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this testimonial permanently?")) return;
    setBusy(true);
    try {
      await api.deleteAdminTestimonial(id);
      setItems((prev) => prev.filter((t) => t.id !== id));
      if (editingId === id) setEditingId(null);
      onMessage("Testimonial deleted");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Loading testimonials…</p>;

  return (
    <div className="admin-testimonials-panel">
      <div className="admin-addon-toolbar">
        <div className="admin-addon-summary">
          <span>
            <strong>{pending.length}</strong> pending approval
          </span>
          <span>
            <strong>{published.length}</strong> live on site
          </span>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={startCreate}>
          Add testimonial
        </button>
      </div>

      <div className="admin-subtabs admin-testimonial-tabs">
        {(["pending", "published", "all"] as const).map((key) => (
          <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
            {key === "pending" ? `Pending (${pending.length})` : key === "published" ? `Published (${published.length})` : `All (${items.length})`}
          </button>
        ))}
      </div>

      {(creating || editingId) ? (
        <form className="card editor-card form-grid admin-testimonial-form" onSubmit={save}>
          <h3>{creating ? "New testimonial" : "Edit testimonial"}</h3>
          <label>
            Name
            <input value={draft.authorName} onChange={(e) => setDraft((d) => ({ ...d, authorName: e.target.value }))} required />
          </label>
          <label>
            Role
            <input value={draft.authorRole} onChange={(e) => setDraft((d) => ({ ...d, authorRole: e.target.value }))} />
          </label>
          <label>
            Company
            <input value={draft.company} onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))} />
          </label>
          <label className="register-field-full">
            Review
            <textarea rows={4} value={draft.body} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} required />
          </label>
          <label>
            Star rating
            <select value={draft.rating} onChange={(e) => setDraft((d) => ({ ...d, rating: Number(e.target.value) }))}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} stars
                </option>
              ))}
            </select>
          </label>
          <label>
            Sort order
            <input type="number" value={draft.sortOrder} onChange={(e) => setDraft((d) => ({ ...d, sortOrder: Number(e.target.value) }))} />
          </label>
          <label className="admin-toggle">
            <input type="checkbox" checked={draft.isPublished} onChange={(e) => setDraft((d) => ({ ...d, isPublished: e.target.checked }))} />
            Published on site
          </label>
          <label className="admin-toggle">
            <input type="checkbox" checked={draft.isFeatured} onChange={(e) => setDraft((d) => ({ ...d, isFeatured: e.target.checked }))} />
            Featured in carousel
          </label>
          <div className="editor-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Save
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => { setCreating(false); setEditingId(null); }}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="admin-testimonials-grid">
        {visible.map((item) => (
          <article key={item.id} className={`card admin-testimonial-card${!item.isPublished ? " admin-testimonial-card--pending" : ""}`}>
            <div className="admin-testimonial-stars" aria-label={`${item.rating} out of 5 stars`}>
              {"★".repeat(item.rating)}
              {"☆".repeat(5 - item.rating)}
            </div>
            <p className="admin-testimonial-body">"{item.body}"</p>
            <p className="admin-testimonial-meta">
              <strong>{item.authorName}</strong>
              {item.authorRole ? ` · ${item.authorRole}` : ""}
              {item.company ? <span className="muted"> — {item.company}</span> : null}
            </p>
            <div className="admin-testimonial-badges">
              {item.isPublished ? (
                <span className="badge badge-status-active">Approved</span>
              ) : (
                <span className="badge badge-status-new">Pending approval</span>
              )}
              {item.isFeatured && item.isPublished ? <span className="badge badge-status-qualified">Carousel</span> : null}
              {item.source === "visitor" ? <span className="badge badge-status-contacted">Visitor</span> : null}
            </div>
            <div className="editor-actions admin-testimonial-card-actions">
              {!item.isPublished ? (
                <>
                  <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => void approve(item.id)}>
                    Approve
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => void reject(item.id)}>
                    Reject
                  </button>
                </>
              ) : null}
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(item)}>
                Edit
              </button>
              <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => void remove(item.id)}>
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {visible.length === 0 ? <p className="muted">No testimonials in this queue.</p> : null}
    </div>
  );
}
