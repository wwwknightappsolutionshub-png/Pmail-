import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "../../api/client";
import type { TenantAdmin, TenantOpsPayload } from "../../types/site";

export function AdminTenantOpsPanel({
  tenant,
  onClose,
  onError,
  onMessage,
}: {
  tenant: TenantAdmin;
  onClose: () => void;
  onError: (msg: string) => void;
  onMessage: (msg: string) => void;
}) {
  const [ops, setOps] = useState<TenantOpsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<"branding" | "mail" | "users" | "addons">("branding");

  function reload() {
    return api.adminTenantOps(tenant.id).then((res) => setOps(res.ops));
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [tenant.id]);

  if (loading) return <div className="card editor-card"><p className="muted">Loading tenant ops…</p></div>;
  if (!ops) return <div className="card editor-card"><p className="error-banner">Failed to load tenant</p></div>;

  return (
    <div className="card editor-card tenant-ops-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h3 style={{ margin: 0 }}>{ops.tenant.name}</h3>
          <p className="muted" style={{ margin: "0.25rem 0 0" }}>
            {ops.tenant.slug} · {ops.tenant.counts.users} mail users · {ops.tenant.counts.hostingAccounts} hosting · {ops.tenant.counts.vpsInstances} VPS
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="admin-subtabs">
        {(["branding", "mail", "users", "addons"] as const).map((t) => (
          <button key={t} type="button" className={subTab === t ? "active" : ""} onClick={() => setSubTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {subTab === "branding" && (
        <BrandingForm
          tenantId={tenant.id}
          branding={ops.branding}
          onSaved={async () => {
            await reload();
            onMessage("Branding saved");
          }}
          onError={onError}
        />
      )}
      {subTab === "mail" && (
        <MailForm
          tenantId={tenant.id}
          mail={ops.mail}
          onSaved={async () => {
            await reload();
            onMessage("Mail config saved");
          }}
          onError={onError}
        />
      )}
      {subTab === "users" && (
        <UsersPanel tenantId={tenant.id} users={ops.users} onReload={reload} onError={onError} onMessage={onMessage} />
      )}
      {subTab === "addons" && (
        <AddonsPanel tenantId={tenant.id} addons={ops.addons} trials={ops.trials} onReload={reload} onError={onError} onMessage={onMessage} />
      )}
    </div>
  );
}

function BrandingForm({
  tenantId,
  branding,
  onSaved,
  onError,
}: {
  tenantId: string;
  branding: TenantOpsPayload["branding"];
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [productName, setProductName] = useState(branding?.productName ?? "hmail");
  const [primaryColor, setPrimaryColor] = useState(branding?.primaryColor ?? "#0d9488");
  const [loginTagline, setLoginTagline] = useState(branding?.loginTagline ?? "");
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateTenantBranding(tenantId, { productName, primaryColor, loginTagline });
      onSaved();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={save}>
      <label>
        Product name
        <input value={productName} onChange={(e) => setProductName(e.target.value)} />
      </label>
      <label>
        Primary color
        <input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
      </label>
      <label>
        Login tagline
        <input value={loginTagline} onChange={(e) => setLoginTagline(e.target.value)} />
      </label>
      <button type="submit" className="btn btn-primary" disabled={saving}>
        Save branding
      </button>
    </form>
  );
}

function MailForm({
  tenantId,
  mail,
  onSaved,
  onError,
}: {
  tenantId: string;
  mail: TenantOpsPayload["mail"];
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [imapHost, setImapHost] = useState(mail?.imapHost ?? "");
  const [smtpHost, setSmtpHost] = useState(mail?.smtpHost ?? "");
  const [smtpPort, setSmtpPort] = useState(mail?.smtpPort ?? 465);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateTenantMail(tenantId, { imapHost, smtpHost, smtpPort });
      onSaved();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={save}>
      <label>
        IMAP host
        <input value={imapHost} onChange={(e) => setImapHost(e.target.value)} />
      </label>
      <label>
        SMTP host
        <input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
      </label>
      <label>
        SMTP port
        <input type="number" value={smtpPort} onChange={(e) => setSmtpPort(Number(e.target.value))} />
      </label>
      <button type="submit" className="btn btn-primary" disabled={saving}>
        Save mail config
      </button>
    </form>
  );
}

function UsersPanel({
  tenantId,
  users,
  onReload,
  onError,
  onMessage,
}: {
  tenantId: string;
  users: TenantOpsPayload["users"];
  onReload: () => Promise<void>;
  onError: (msg: string) => void;
  onMessage: (msg: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createTenantMailUser(tenantId, { email, displayName: displayName || null });
      await onReload();
      setEmail("");
      setDisplayName("");
      onMessage("Mail user created");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(userId: string, userEmail: string) {
    if (!window.confirm(`Delete mail user ${userEmail}?`)) return;
    try {
      await api.deleteTenantMailUser(tenantId, userId);
      await onReload();
      onMessage("Mail user deleted");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  return (
    <div>
      <form className="form-grid" style={{ marginBottom: "1rem" }} onSubmit={create}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Display name
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          Add mail user
        </button>
      </form>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.displayName ?? "—"}</td>
                <td>{u.isActive ? "Yes" : "No"}</td>
                <td>
                  <button type="button" className="btn btn-danger" onClick={() => remove(u.id, u.email)}>
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

function AddonsPanel({
  tenantId,
  addons,
  trials,
  onReload,
  onError,
  onMessage,
}: {
  tenantId: string;
  addons: TenantOpsPayload["addons"];
  trials: TenantOpsPayload["trials"];
  onReload: () => Promise<void>;
  onError: (msg: string) => void;
  onMessage: (msg: string) => void;
}) {
  const [addonSlug, setAddonSlug] = useState(addons[0]?.slug ?? "");
  const [trialDays, setTrialDays] = useState(7);
  const [saving, setSaving] = useState(false);

  async function grant(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.grantTenantAddonTrial(tenantId, { addonSlug, trialDays });
      await onReload();
      onMessage("Trial granted");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Grant failed");
    } finally {
      setSaving(false);
    }
  }

  async function revoke(trialId: string) {
    if (!window.confirm("Revoke this trial?")) return;
    try {
      await api.revokeTenantAddonTrial(tenantId, trialId);
      await onReload();
      onMessage("Trial revoked");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Revoke failed");
    }
  }

  return (
    <div>
      <form className="form-grid" style={{ marginBottom: "1rem" }} onSubmit={grant}>
        <label>
          Add-on
          <select value={addonSlug} onChange={(e) => setAddonSlug(e.target.value)}>
            {addons.map((a) => (
              <option key={a.id} value={a.slug}>
                {a.name} ({a.accessStatus})
              </option>
            ))}
          </select>
        </label>
        <label>
          Trial days
          <input type="number" min={1} max={90} value={trialDays} onChange={(e) => setTrialDays(Number(e.target.value))} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          Grant trial
        </button>
      </form>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Add-on</th>
              <th>Status</th>
              <th>Ends</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {trials.map((t) => (
              <tr key={t.id}>
                <td>{t.addonName}</td>
                <td>{t.status}</td>
                <td className="muted">{new Date(t.endsAt).toLocaleDateString()}</td>
                <td>
                  <button type="button" className="btn btn-danger" onClick={() => revoke(t.id)}>
                    Revoke
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
