import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import { AdminImageUpload } from "../../components/admin/AdminImageUpload";
import { LandingSectionPreview, type LandingSectionDraft } from "../../components/admin/LandingSectionPreview";
import { editorHtmlToStorage, plainTextToEditorHtml, WysiwygHtmlEditor } from "../../components/admin/WysiwygHtmlEditor";
import {
  formatLandingSectionLabel,
  getLandingSectionMeta,
  sortSectionsLikeLandingPage,
} from "../../data/landingSectionCatalog";
import type { SiteSection } from "../../types/site";
import "./AdminDashboard.css";

type Props = {
  sections: SiteSection[];
  onSaved: (section: SiteSection) => void;
  onDeleted: (id: string) => void;
  onReordered: (sections: SiteSection[]) => void;
  onError: (msg: string) => void;
  onMessage: (msg: string) => void;
};

function bulletsToText(bullets: string[]) {
  return bullets.join("\n");
}

function textToBullets(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function sectionHint(key: string): string {
  switch (key) {
    case "hero":
      return "Hero metrics: Value|Label per line (e.g. 99.9%|Uptime SLA).";
    case "enterprise":
    case "solutions":
    case "platform":
      return "Cards: Title|description — one per line.";
    case "trust":
      return "Trust strip & security chips — one short line per item.";
    case "contact":
      return "Upload the image shown in the Custom pricing left column below.";
    default:
      return "One bullet per line. Optional Title|description for two-part bullets.";
  }
}

export function AdminSectionsPanel({ sections, onSaved, onDeleted, onReordered, onError, onMessage }: Props) {
  const [orderedSections, setOrderedSections] = useState<SiteSection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(sections[0]?.id ?? null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const selected = orderedSections.find((s) => s.id === selectedId) ?? null;

  useEffect(() => {
    setOrderedSections(sortSectionsLikeLandingPage(sections));
  }, [sections]);

  useEffect(() => {
    if (!selectedId && orderedSections[0]) setSelectedId(orderedSections[0].id);
  }, [orderedSections, selectedId]);

  const publishedCount = orderedSections.filter((s) => s.isPublished && getLandingSectionMeta(s.sectionKey)?.liveOnPage).length;
  const liveSectionCount = orderedSections.filter((s) => getLandingSectionMeta(s.sectionKey)?.liveOnPage).length;

  async function persistOrder(next: SiteSection[]) {
    setReordering(true);
    try {
      const liveSections = sortSectionsLikeLandingPage(
        next.filter((s) => getLandingSectionMeta(s.sectionKey)?.liveOnPage),
      );
      const order = liveSections.map((s, index) => ({ id: s.id, sortOrder: (index + 1) * 10 }));
      const res = await api.reorderSections(order);
      setOrderedSections(sortSectionsLikeLandingPage(res.sections));
      onReordered(sortSectionsLikeLandingPage(res.sections));
      onMessage("Section order saved");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Reorder failed");
    } finally {
      setReordering(false);
    }
  }

  function reorderDragged(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const from = orderedSections.findIndex((s) => s.id === dragId);
    const to = orderedSections.findIndex((s) => s.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...orderedSections];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOrderedSections(next);
    void persistOrder(next);
  }

  return (
    <div className="admin-editor-shell admin-sections-shell">
      <aside className="admin-editor-rail card">
        <div className="admin-sections-rail-head">
          <strong>Landing sections</strong>
          <span className="muted">
            {publishedCount}/{liveSectionCount} live{reordering ? " · saving…" : ""}
          </span>
        </div>
        <p className="admin-sections-drag-hint muted">Drag to reorder. Edits sync to the public site when saved.</p>
        <ul className="admin-sections-list">
          {orderedSections.map((section) => {
            const meta = getLandingSectionMeta(section.sectionKey);
            const onLivePage = meta?.liveOnPage ?? false;
            return (
              <li
                key={section.id}
                draggable={onLivePage}
                onDragStart={() => onLivePage && setDragId(section.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onLivePage && reorderDragged(section.id)}
                className={dragId === section.id ? "dragging" : ""}
              >
                <button
                  type="button"
                  className={`admin-sections-list-item${section.id === selectedId ? " active" : ""}`}
                  onClick={() => setSelectedId(section.id)}
                >
                  {onLivePage ? (
                    <span className="admin-sections-drag-handle" aria-hidden="true">
                      ⠿
                    </span>
                  ) : (
                    <span className="admin-sections-drag-handle muted" aria-hidden="true">
                      —
                    </span>
                  )}
                  <span className={`admin-sections-dot${section.isPublished && onLivePage ? " live" : ""}`} aria-hidden="true" />
                  <span className="admin-sections-list-text">
                    <strong>{formatLandingSectionLabel(section.sectionKey)}</strong>
                    <span className="muted">{section.sectionKey}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="admin-sections-rail-foot muted">
          <Link to="/" target="_blank" rel="noreferrer">
            Open live site ↗
          </Link>
        </p>
      </aside>

      <div className="admin-editor-main">
        {selected ? (
          <SectionEditor
            key={selected.id}
            section={selected}
            onSaved={(s) => {
              onSaved(s);
              onMessage(`Section “${formatLandingSectionLabel(s.sectionKey)}” saved`);
            }}
            onDeleted={(id) => {
              onDeleted(id);
              setSelectedId(sections.find((s) => s.id !== id)?.id ?? null);
            }}
            onError={onError}
          />
        ) : (
          <div className="card admin-sections-empty">
            <p className="muted">Select a section to edit.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionEditor({
  section,
  onSaved,
  onDeleted,
  onError,
}: {
  section: SiteSection;
  onSaved: (section: SiteSection) => void;
  onDeleted: (id: string) => void;
  onError: (msg: string) => void;
}) {
  const [title, setTitle] = useState(section.title);
  const [subtitle, setSubtitle] = useState(section.subtitle ?? "");
  const [body, setBody] = useState(section.body ?? "");
  const [bodyHtml, setBodyHtml] = useState(() => plainTextToEditorHtml(section.body ?? ""));
  const [bulletsText, setBulletsText] = useState(bulletsToText(section.bulletPoints));
  const [imageUrl, setImageUrl] = useState(section.imageUrl ?? "");
  const [ctaLabel, setCtaLabel] = useState(section.ctaLabel ?? "");
  const [ctaUrl, setCtaUrl] = useState(section.ctaUrl ?? "");
  const [sortOrder, setSortOrder] = useState(section.sortOrder);
  const [isPublished, setIsPublished] = useState(section.isPublished);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setTitle(section.title);
    setSubtitle(section.subtitle ?? "");
    setBody(section.body ?? "");
    setBodyHtml(plainTextToEditorHtml(section.body ?? ""));
    setBulletsText(bulletsToText(section.bulletPoints));
    setImageUrl(section.imageUrl ?? "");
    setCtaLabel(section.ctaLabel ?? "");
    setCtaUrl(section.ctaUrl ?? "");
    setSortOrder(section.sortOrder);
    setIsPublished(section.isPublished);
    setDirty(false);
  }, [section.id, section.updatedAt]);

  const previewDraft: LandingSectionDraft = useMemo(
    () => ({
      sectionKey: section.sectionKey,
      title,
      subtitle,
      body,
      bulletPoints: textToBullets(bulletsText),
      ctaLabel,
      ctaUrl,
      imageUrl,
      isPublished,
    }),
    [section.sectionKey, title, subtitle, body, bulletsText, ctaLabel, ctaUrl, imageUrl, isPublished],
  );

  const meta = getLandingSectionMeta(section.sectionKey);
  const isContactSection = section.sectionKey === "contact";

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateSection(section.id, {
        title,
        subtitle: subtitle || null,
        body: body || null,
        bulletPoints: textToBullets(bulletsText),
        imageUrl: imageUrl || null,
        ctaLabel: ctaLabel || null,
        ctaUrl: ctaUrl || null,
        sortOrder,
        isPublished,
      });
      onSaved(res.section);
      setDirty(false);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete section "${section.sectionKey}"? This cannot be undone.`)) return;
    try {
      await api.deleteSection(section.id);
      onDeleted(section.id);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  function markDirty() {
    setDirty(true);
  }

  return (
    <form className="admin-section-editor card" onSubmit={save}>
      <header className="admin-sections-editor-head">
        <div>
          <h2>{formatLandingSectionLabel(section.sectionKey)}</h2>
          <p className="muted">
            <code>{section.sectionKey}</code>
            {meta?.anchor ? <> · <code>#{meta.anchor}</code></> : null}
          </p>
        </div>
        <div className="admin-sections-editor-meta">
          <label className="admin-toggle">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => {
                setIsPublished(e.target.checked);
                markDirty();
              }}
            />
            <span>{isPublished ? "Published" : "Draft"}</span>
          </label>
          {dirty ? <span className="badge badge-status-contacted">Unsaved</span> : null}
        </div>
      </header>

      <div className="admin-section-editor-grid">
        <div className="admin-section-editor-fields">
          <label>
            Headline
            <input value={title} onChange={(e) => { setTitle(e.target.value); markDirty(); }} required />
          </label>
          <label>
            Subheadline / eyebrow
            <input value={subtitle} onChange={(e) => { setSubtitle(e.target.value); markDirty(); }} />
          </label>
          <label className="admin-sections-field-wide admin-sections-wysiwyg-field">
            Body copy
            <WysiwygHtmlEditor
              value={bodyHtml}
              onChange={(html) => {
                setBodyHtml(html);
                setBody(editorHtmlToStorage(html));
                markDirty();
              }}
              variant="landing"
              layout="compact"
            />
            <span className="muted admin-field-hint">Visual editor — bold, links, lists, and CTA buttons. Saved content syncs to the public landing page.</span>
          </label>
          <label className="admin-sections-field-wide">
            Bullet points
            <textarea
              rows={6}
              value={bulletsText}
              onChange={(e) => { setBulletsText(e.target.value); markDirty(); }}
              placeholder="One per line"
            />
            <span className="muted admin-field-hint">{sectionHint(section.sectionKey)}</span>
          </label>
          <label>
            CTA label
            <input value={ctaLabel} onChange={(e) => { setCtaLabel(e.target.value); markDirty(); }} />
          </label>
          <label>
            CTA URL
            <input value={ctaUrl} onChange={(e) => { setCtaUrl(e.target.value); markDirty(); }} placeholder="#register" />
          </label>
          <label>
            Sort order
            <input type="number" value={sortOrder} onChange={(e) => { setSortOrder(Number(e.target.value)); markDirty(); }} />
          </label>

          {isContactSection ? (
            <div className="admin-sections-field-wide">
              <AdminImageUpload
                label="Custom pricing — left column image"
                hint="Upload from your device or paste a URL. Shown beside the registration form on the landing page."
                value={imageUrl}
                onChange={(url) => {
                  setImageUrl(url);
                  markDirty();
                }}
                onError={onError}
              />
            </div>
          ) : (
            <label className="admin-sections-field-wide">
              Section image URL
              <input value={imageUrl} onChange={(e) => { setImageUrl(e.target.value); markDirty(); }} placeholder="https://…" />
            </label>
          )}
        </div>

        <aside className="admin-section-editor-preview">
          <div className="admin-sections-preview-head">
            <strong>Live preview</strong>
            <span className="muted">Updates as you type</span>
          </div>
          <LandingSectionPreview draft={previewDraft} />
        </aside>
      </div>

      <div className="editor-actions admin-sections-actions">
        <button type="submit" className="btn btn-primary" disabled={saving || !dirty}>
          {saving ? "Saving…" : "Save & sync to site"}
        </button>
        <button type="button" className="btn btn-danger" onClick={() => void remove()}>
          Delete section
        </button>
      </div>
    </form>
  );
}
