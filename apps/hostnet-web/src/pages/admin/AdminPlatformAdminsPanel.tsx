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
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

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

  async function remove(id: string, adminEmail: string) {
    if (!window.confirm(`Delete admin ${adminEmail}?`)) return;
    try {
      await api.deletePlatformAdmin(id);
      setAdmins((prev) => prev.filter((a) => a.id !== id));
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
            {admins.map((a) => (
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
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(a.id, a.email)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
