import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../../api/client";
import type { PlatformAdminRecord } from "../../types/site";

export function AdminPlatformAdminsPanel({
  onError,
  onMessage,
}: {
  onError: (msg: string) => void;
  onMessage: (msg: string) => void;
}) {
  const [admins, setAdmins] = useState<PlatformAdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"super_admin" | "admin">("admin");
  const [editActive, setEditActive] = useState(true);
  const [editPassword, setEditPassword] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    api
      .adminPlatformAdmins()
      .then((res) => setAdmins(res.platformAdmins))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
        else onError(err instanceof ApiError ? err.message : "Load failed");
      })
      .finally(() => setLoading(false));
  }, [onError]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.createPlatformAdmin({ email, name, password, role: "admin" });
      setAdmins((prev) => [...prev, res.admin].sort((a, b) => a.email.localeCompare(b.email)));
      setShowNew(false);
      setEmail("");
      setName("");
      setPassword("");
      onMessage("Platform admin created");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(admin: PlatformAdminRecord) {
    setEditingId(admin.id);
    setEditName(admin.name);
    setEditRole(admin.role);
    setEditActive(admin.isActive);
    setEditPassword("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditPassword("");
  }

  async function saveEdit(id: string) {
    setEditSaving(true);
    try {
      const body: Parameters<typeof api.updatePlatformAdmin>[1] = {
        name: editName,
        role: editRole,
        isActive: editActive,
      };
      if (editPassword.trim()) body.password = editPassword;
      const res = await api.updatePlatformAdmin(id, body);
      setAdmins((prev) => prev.map((a) => (a.id === id ? res.admin : a)));
      cancelEdit();
      onMessage(editPassword.trim() ? "Admin updated (password reset)" : "Admin updated");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setEditSaving(false);
    }
  }

  async function remove(id: string, adminEmail: string) {
    if (!window.confirm(`Delete admin ${adminEmail}?`)) return;
    try {
      await api.deletePlatformAdmin(id);
      setAdmins((prev) => prev.filter((a) => a.id !== id));
      if (editingId === id) cancelEdit();
      onMessage("Admin deleted");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  if (loading) return <p className="muted">Loading admins…</p>;
  if (forbidden) {
    return <p className="muted">Super admin access is required to manage platform operators.</p>;
  }

  return (
    <div>
      <div className="admin-page-header-actions" style={{ marginBottom: "1rem", justifyContent: "flex-end", display: "flex" }}>
        <button type="button" className="btn btn-secondary" onClick={() => setShowNew((v) => !v)}>
          {showNew ? "Cancel" : "Add administrator"}
        </button>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>Multiple operators with role-based access. Super admins can manage other admins.</p>

      {showNew && (
        <form className="card editor-card form-grid" onSubmit={create}>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Password (min 12 chars in production)
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            Create admin
          </button>
        </form>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {admins.map((a) =>
              editingId === a.id ? (
                <tr key={a.id}>
                  <td colSpan={5}>
                    <div className="form-grid" style={{ maxWidth: 520 }}>
                      <label>
                        Name
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} required />
                      </label>
                      <label>
                        Role
                        <select value={editRole} onChange={(e) => setEditRole(e.target.value as "super_admin" | "admin")}>
                          <option value="admin">admin</option>
                          <option value="super_admin">super_admin</option>
                        </select>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                        Active
                      </label>
                      <label>
                        New password (leave blank to keep current)
                        <input
                          type="password"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          minLength={8}
                          autoComplete="new-password"
                        />
                      </label>
                      <div className="editor-actions">
                        <button type="button" className="btn btn-primary" onClick={() => saveEdit(a.id)} disabled={editSaving}>
                          Save
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.email}</td>
                  <td>
                    <span className={`badge ${a.role === "super_admin" ? "badge-role" : ""}`}>{a.role}</span>
                  </td>
                  <td>
                    {a.isActive ? (
                      <span className="badge badge-status-active">Active</span>
                    ) : (
                      <span className="badge badge-status-inactive">Inactive</span>
                    )}
                  </td>
                  <td>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(a)}>
                      Edit
                    </button>{" "}
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(a.id, a.email)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
