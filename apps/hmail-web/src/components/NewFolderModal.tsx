import { FormEvent, useState } from "react";
import "./MailToolbar.css";

interface NewFolderModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export function NewFolderModal({ open, onClose, onCreate }: NewFolderModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Folder name is required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onCreate(trimmed);
      setName("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mail-modal-overlay" onClick={onClose}>
      <div className="mail-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="mail-modal-header">
          <h3>New folder</h3>
          <button type="button" className="mail-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <form onSubmit={handleSubmit} className="mail-modal-body">
          <label>
            Folder name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Projects"
              autoFocus
            />
          </label>
          {error ? <div className="mail-modal-error">{error}</div> : null}
          <footer className="mail-modal-footer">
            <button type="button" className="mail-toolbar-btn mail-toolbar-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="mail-toolbar-btn" disabled={saving}>
              {saving ? "Creating…" : "Create folder"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
