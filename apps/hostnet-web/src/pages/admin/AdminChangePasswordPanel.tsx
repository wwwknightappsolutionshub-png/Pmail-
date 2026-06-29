import { FormEvent, useState } from "react";
import { api, ApiError } from "../../api/client";

export function AdminChangePasswordPanel({
  open,
  onClose,
  onSuccess,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      onError("New passwords do not match");
      return;
    }
    setSaving(true);
    try {
      await api.adminChangePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onSuccess("Password updated");
      onClose();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Password change failed");
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    onClose();
  }

  return (
    <div className="admin-command-overlay" onClick={handleClose} role="presentation">
      <div
        className="admin-command-dialog"
        style={{ maxWidth: 420 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Change password"
      >
        <h3 style={{ marginTop: 0 }}>Change password</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Enter your current password and choose a new one. Use at least 12 characters in production.
        </p>
        <form className="form-grid" onSubmit={submit}>
          <label>
            Current password
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <label>
            New password
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <div className="editor-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Update password"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
