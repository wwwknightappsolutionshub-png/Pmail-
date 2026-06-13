import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../../api/client";
import type { TenantAdmin, VpsInstance } from "../../types/site";

export function AdminVpsPanel({
  tenants,
  onError,
  onMessage,
}: {
  tenants: TenantAdmin[];
  onError: (msg: string) => void;
  onMessage: (msg: string) => void;
}) {
  const [instances, setInstances] = useState<VpsInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [label, setLabel] = useState("");
  const [hostname, setHostname] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [saving, setSaving] = useState(false);

  function reload() {
    return api.adminVps().then((res) => setInstances(res.vpsInstances));
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.createVps({
        label,
        hostname,
        tenantId: tenantId || null,
        status: "provisioning",
      });
      setInstances((prev) => [res.vps, ...prev]);
      setShowNew(false);
      setLabel("");
      setHostname("");
      onMessage("VPS created");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete VPS "${name}"? This cannot be undone.`)) return;
    try {
      await api.deleteVps(id);
      setInstances((prev) => prev.filter((v) => v.id !== id));
      onMessage("VPS deleted");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  if (loading) return <p className="muted">Loading VPS…</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ marginTop: 0 }}>VPS instances</h2>
        <button type="button" className="btn btn-secondary" onClick={() => setShowNew((v) => !v)}>
          {showNew ? "Cancel" : "Add VPS"}
        </button>
      </div>

      {showNew && (
        <form className="card editor-card form-grid" onSubmit={create}>
          <label>
            Label
            <input value={label} onChange={(e) => setLabel(e.target.value)} required />
          </label>
          <label>
            Hostname
            <input value={hostname} onChange={(e) => setHostname(e.target.value)} required />
          </label>
          <label>
            Tenant (optional)
            <select value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
              <option value="">Unassigned</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            Create VPS
          </button>
        </form>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Hostname</th>
              <th>IP</th>
              <th>Status</th>
              <th>Tenant</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {instances.map((v) => (
              <VpsRow key={v.id} vps={v} onUpdated={(updated) => setInstances((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))} onDelete={() => remove(v.id, v.label)} onError={onError} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VpsRow({
  vps,
  onUpdated,
  onDelete,
  onError,
}: {
  vps: VpsInstance;
  onUpdated: (v: VpsInstance) => void;
  onDelete: () => void;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(vps.status);
  const [ipAddress, setIpAddress] = useState(vps.ipAddress ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await api.updateVps(vps.id, { status, ipAddress: ipAddress || null });
      onUpdated(res.vps);
      setEditing(false);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <tr>
        <td colSpan={6}>
          <div className="form-grid" style={{ maxWidth: 480 }}>
            <label>
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value as VpsInstance["status"])}>
                <option value="provisioning">provisioning</option>
                <option value="running">running</option>
                <option value="stopped">stopped</option>
                <option value="suspended">suspended</option>
              </select>
            </label>
            <label>
              IP address
              <input value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} />
            </label>
            <div className="editor-actions">
              <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
                Save
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{vps.label}</td>
      <td className="muted">{vps.hostname}</td>
      <td>{vps.ipAddress ?? "—"}</td>
      <td>{vps.status}</td>
      <td>{vps.tenant?.name ?? "—"}</td>
      <td>
        <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
          Edit
        </button>{" "}
        <button type="button" className="btn btn-danger" onClick={onDelete}>
          Delete
        </button>
      </td>
    </tr>
  );
}
