import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ProhostLogo } from "../../components/ProhostLogo";
import { api, ApiError } from "../../api/client";
import type { HostingAccountAdmin, HostingPlan, PlatformAdmin, SiteSection, TenantAdmin } from "../../types/site";
import { ADMIN_NAV, ADMIN_TAB_META, type AdminTab } from "./adminNav";
import { AdminAddonsPanel } from "./AdminAddonsPanel";
import { AdminSectionsPanel } from "./AdminSectionsPanel";
import { AdminDashboardHome } from "./AdminDashboardHome";
import { AdminSalesPipelinePage } from "./AdminSalesPipelinePage";
import { AdminEmailTemplatesPanel } from "./AdminEmailTemplatesPanel";
import { AdminTestimonialsPanel } from "./AdminTestimonialsPanel";
import { AdminMarketingPanel } from "./AdminMarketingPanel";
import { AdminPageHeader } from "./AdminPageHeader";
import { AdminPlatformAdminsPanel } from "./AdminPlatformAdminsPanel";
import { AdminTenantOpsPanel } from "./AdminTenantOpsPanel";
import { AdminBillingPanel } from "./AdminBillingPanel";
import { AdminCommandPalette, useCommandPaletteShortcut } from "./AdminCommandPalette";
import { AdminSystemStatusPanel } from "./AdminSystemStatusPanel";
import { AdminVpsPanel } from "./AdminVpsPanel";
import { useAdminPoll } from "./useAdminPoll";
import "./AdminDashboard.css";

export function AdminDashboardPage() {
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [sections, setSections] = useState<SiteSection[]>([]);
  const [plans, setPlans] = useState<HostingPlan[]>([]);
  const [tenants, setTenants] = useState<TenantAdmin[]>([]);
  const [accounts, setAccounts] = useState<HostingAccountAdmin[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tenantOpsId, setTenantOpsId] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const { snapshot: poll } = useAdminPoll(Boolean(admin));

  useCommandPaletteShortcut(() => setCommandOpen(true));

  useEffect(() => {
    api
      .adminMe()
      .then((res) => {
        setAdmin(res.admin);
        return Promise.all([
          api.adminSections(),
          api.adminHostingPlans(),
          api.adminTenants(),
          api.adminHostingAccounts(),
        ]);
      })
      .then(([sectionsRes, plansRes, tenantsRes, accountsRes]) => {
        setSections(sectionsRes.sections);
        setPlans(plansRes.hostingPlans);
        setTenants(tenantsRes.tenants);
        setAccounts(accountsRes.hostingAccounts);
      })
      .catch(() => setAdmin(null))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    await api.adminLogout();
    setAdmin(null);
  }

  if (loading) return <div className="admin-shell loading-state">Loading console…</div>;
  if (!admin) return <Navigate to="/admin/login" replace />;

  const tabMeta = ADMIN_TAB_META[tab];
  const initials = admin.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const salesPipelinePending = poll?.salesPipeline?.pendingCount ?? poll?.leads.newCount ?? 0;
  const healthStatus = poll?.health.status ?? "ready";

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <ProhostLogo size="sm" showWordmark={false} />
          <div className="admin-sidebar-brand-text">
            <strong>Prohost Cloud</strong>
            <span>Admin Console</span>
          </div>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Admin navigation">
          {ADMIN_NAV.map((group) => (
            <div key={group.label} className="admin-nav-group">
              <span className="admin-nav-group-label">{group.label}</span>
              {group.items
                .filter((item) => !item.superAdminOnly || admin.role === "super_admin")
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`admin-nav-item${tab === item.id ? " active" : ""}`}
                    onClick={() => setTab(item.id)}
                  >
                    {item.icon}
                    {item.label}
                    {item.id === "sales-pipeline" && salesPipelinePending > 0 ? (
                      <span className="admin-nav-badge" aria-label={`${salesPipelinePending} pending in pipeline`}>
                        {salesPipelinePending}
                      </span>
                    ) : null}
                  </button>
                ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-user-avatar" aria-hidden="true">
              {initials}
            </div>
            <div className="admin-user-meta">
              <strong>{admin.name}</strong>
              <span>{admin.email}</span>
            </div>
          </div>
          <div className="admin-sidebar-actions">
            <Link to="/" className="btn btn-ghost-sidebar">
              View public site
            </Link>
            <button type="button" className="btn btn-ghost-sidebar" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-breadcrumb">
            <span>Admin</span>
            <span aria-hidden="true">/</span>
            <strong>{tabMeta.title}</strong>
          </div>
          <div className="admin-topbar-actions">
            <button type="button" className="btn btn-secondary btn-sm admin-command-trigger" onClick={() => setCommandOpen(true)}>
              Search <kbd>⌘K</kbd>
            </button>
            <span className={`admin-health-pill compact ${healthStatus}`} title="Live health (30s poll)">
              <span className="admin-health-dot" />
              {healthStatus}
            </span>
            <span className="admin-env-badge">Development</span>
          </div>
        </header>

        <main className={`admin-content${tab === "sections" || tab === "email-templates" ? " admin-content--editor-workspace" : ""}`}>
          {tab !== "dashboard" && <AdminPageHeader title={tabMeta.title} description={tabMeta.description} />}

          {message && <div className="admin-alert admin-alert-success">{message}</div>}
          {error && <div className="admin-alert admin-alert-error">{error}</div>}

          {tab === "dashboard" && <AdminDashboardHome onNavigate={setTab} poll={poll} />}

          {tab === "sections" && (
            <AdminSectionsPanel
              sections={sections}
              onSaved={(section) => {
                setSections((prev) => prev.map((s) => (s.id === section.id ? section : s)));
                setMessage("Section saved");
                setError(null);
              }}
              onDeleted={(id) => {
                setSections((prev) => prev.filter((s) => s.id !== id));
                setMessage("Section deleted");
                setError(null);
              }}
              onReordered={(next) => {
                setSections(next);
              }}
              onError={(err) => {
                setError(err);
                setMessage(null);
              }}
              onMessage={(msg) => {
                setMessage(msg);
                setError(null);
              }}
            />
          )}

          {tab === "testimonials" && (
            <AdminTestimonialsPanel
              onError={(err) => {
                setError(err);
                setMessage(null);
              }}
              onMessage={(msg) => {
                setMessage(msg);
                setError(null);
              }}
            />
          )}

          {tab === "hosting" && (
            <HostingPanel
              plans={plans}
              onSaved={(plan) => {
                setPlans((prev) => prev.map((p) => (p.id === plan.id ? plan : p)));
                setMessage("Hosting plan saved");
                setError(null);
              }}
              onCreated={(plan) => {
                setPlans((prev) => [...prev, plan]);
                setMessage("Hosting plan created");
                setError(null);
              }}
              onDeleted={(id) => {
                setPlans((prev) => prev.filter((p) => p.id !== id));
                setMessage("Hosting plan deleted");
                setError(null);
              }}
              onError={(err) => {
                setError(err);
                setMessage(null);
              }}
            />
          )}

          {tab === "addons" && (
            <AdminAddonsPanel
              onError={(err) => {
                setError(err);
                setMessage(null);
              }}
              onMessage={(msg) => {
                setMessage(msg);
                setError(null);
              }}
            />
          )}

          {tab === "tenants" && (
            <TenantsPanel
              tenants={tenants}
              tenantOpsId={tenantOpsId}
              onOpenOps={setTenantOpsId}
              onCloseOps={() => setTenantOpsId(null)}
              onSaved={(tenant) => {
                setTenants((prev) => prev.map((t) => (t.id === tenant.id ? tenant : t)));
                setMessage("Tenant saved");
                setError(null);
              }}
              onCreated={(tenant) => {
                setTenants((prev) => [...prev, tenant]);
                setMessage("Tenant created");
                setError(null);
              }}
              onDeleted={(id) => {
                setTenants((prev) => prev.filter((t) => t.id !== id));
                if (tenantOpsId === id) setTenantOpsId(null);
                setMessage("Tenant deleted");
                setError(null);
              }}
              onError={(err) => {
                setError(err);
                setMessage(null);
              }}
              onMessage={(msg) => {
                setMessage(msg);
                setError(null);
              }}
            />
          )}

          {tab === "accounts" && (
            <AccountsPanel
              accounts={accounts}
              tenants={tenants}
              plans={plans}
              onSaved={(account) => {
                setAccounts((prev) => prev.map((a) => (a.id === account.id ? account : a)));
                setMessage("Hosting account saved");
                setError(null);
              }}
              onCreated={(account) => {
                setAccounts((prev) => [...prev, account]);
                setMessage("Hosting account created");
                setError(null);
              }}
              onDeleted={(id) => {
                setAccounts((prev) => prev.filter((a) => a.id !== id));
                setMessage("Hosting account deleted");
                setError(null);
              }}
              onError={(err) => {
                setError(err);
                setMessage(null);
              }}
            />
          )}

          {tab === "sales-pipeline" && (
            <AdminSalesPipelinePage
              pollKey={poll?.polledAt}
              isSuperAdmin={admin?.role === "super_admin"}
              onError={(err) => {
                setError(err);
                setMessage(null);
              }}
              onMessage={(msg) => {
                setMessage(msg);
                setError(null);
              }}
            />
          )}

          {tab === "email-templates" && (
            <AdminEmailTemplatesPanel
              onError={(err) => {
                setError(err);
                setMessage(null);
              }}
              onMessage={(msg) => {
                setMessage(msg);
                setError(null);
              }}
            />
          )}

          {tab === "marketing" && (
            <AdminMarketingPanel
              onError={(err) => {
                setError(err);
                setMessage(null);
              }}
              onMessage={(msg) => {
                setMessage(msg);
                setError(null);
              }}
            />
          )}

          {tab === "billing" && <AdminBillingPanel />}

          {tab === "system" && <AdminSystemStatusPanel poll={poll} isSuperAdmin={admin?.role === "super_admin"} />}

          {tab === "vps" && (
            <AdminVpsPanel
              tenants={tenants}
              onError={(err) => {
                setError(err);
                setMessage(null);
              }}
              onMessage={(msg) => {
                setMessage(msg);
                setError(null);
              }}
            />
          )}

          {tab === "admins" && admin.role === "super_admin" && (
            <AdminPlatformAdminsPanel
              onError={(err) => {
                setError(err);
                setMessage(null);
              }}
              onMessage={(msg) => {
                setMessage(msg);
                setError(null);
              }}
            />
          )}
        </main>
      </div>

      <AdminCommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onNavigate={setTab}
        tenants={tenants}
      />
    </div>
  );
}

function HostingPanel({
  plans,
  onSaved,
  onCreated,
  onDeleted,
  onError,
}: {
  plans: HostingPlan[];
  onSaved: (plan: HostingPlan) => void;
  onCreated: (plan: HostingPlan) => void;
  onDeleted: (id: string) => void;
  onError: (msg: string) => void;
}) {
  const [showNew, setShowNew] = useState(false);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [priceCents, setPriceCents] = useState(999);
  const [saving, setSaving] = useState(false);

  async function createPlan(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.createHostingPlan({ slug, name, priceCents, features: [] });
      onCreated(res.plan);
      setShowNew(false);
      setSlug("");
      setName("");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-hosting-panel">
      <div className="admin-page-header-actions admin-hosting-toolbar">
        <button type="button" className="btn btn-secondary" onClick={() => setShowNew((v) => !v)}>
          {showNew ? "Cancel" : "Add plan"}
        </button>
      </div>

      {showNew && (
        <form className="card editor-card form-grid admin-hosting-create" onSubmit={createPlan}>
          <h3>New hosting plan</h3>
          <label>
            Slug
            <input value={slug} onChange={(e) => setSlug(e.target.value)} required />
          </label>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Price (cents)
            <input type="number" value={priceCents} onChange={(e) => setPriceCents(Number(e.target.value))} />
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            Create plan
          </button>
        </form>
      )}

      <div className="admin-hosting-grid">
        {plans.map((plan) => (
          <PlanEditor key={plan.id} plan={plan} onSaved={onSaved} onDeleted={onDeleted} onError={onError} />
        ))}
      </div>

      {plans.length === 0 && !showNew ? <p className="muted">No hosting plans yet. Add your first plan above.</p> : null}
    </div>
  );
}

function PlanEditor({
  plan,
  onSaved,
  onDeleted,
  onError,
}: {
  plan: HostingPlan;
  onSaved: (plan: HostingPlan) => void;
  onDeleted: (id: string) => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState(plan.name);
  const [tagline, setTagline] = useState(plan.tagline ?? "");
  const [priceCents, setPriceCents] = useState(plan.priceCents);
  const [isFeatured, setIsFeatured] = useState(plan.isFeatured);
  const [isActive, setIsActive] = useState(plan.isActive);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateHostingPlan(plan.id, {
        name,
        tagline: tagline || null,
        priceCents,
        isFeatured,
        isActive,
      });
      onSaved(res.plan);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete hosting plan "${plan.slug}"?`)) return;
    try {
      await api.deleteHostingPlan(plan.id);
      onDeleted(plan.id);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  return (
    <form className="card editor-card admin-hosting-card form-grid" onSubmit={save}>
      <div className="admin-hosting-card-head">
        <strong>{plan.slug}</strong>
        {isActive ? (
          <span className="badge badge-status-active">Active</span>
        ) : (
          <span className="badge badge-status-inactive">Inactive</span>
        )}
        {isFeatured ? <span className="badge badge-status-qualified">Featured</span> : null}
      </div>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        Tagline
        <input value={tagline} onChange={(e) => setTagline(e.target.value)} />
      </label>
      <label>
        Price (cents)
        <input type="number" value={priceCents} onChange={(e) => setPriceCents(Number(e.target.value))} />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
        Featured
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active
      </label>
      <div className="editor-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          Save plan
        </button>
        <button type="button" className="btn btn-danger" onClick={remove}>
          Delete
        </button>
      </div>
    </form>
  );
}

function TenantsPanel({
  tenants,
  tenantOpsId,
  onOpenOps,
  onCloseOps,
  onSaved,
  onCreated,
  onDeleted,
  onError,
  onMessage,
}: {
  tenants: TenantAdmin[];
  tenantOpsId: string | null;
  onOpenOps: (id: string) => void;
  onCloseOps: () => void;
  onSaved: (tenant: TenantAdmin) => void;
  onCreated: (tenant: TenantAdmin) => void;
  onDeleted: (id: string) => void;
  onError: (msg: string) => void;
  onMessage: (msg: string) => void;
}) {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.createTenant({ slug, name });
      onCreated(res.tenant);
      setShowNew(false);
      setSlug("");
      setName("");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="admin-page-header-actions" style={{ marginBottom: "1rem", justifyContent: "flex-end", display: "flex" }}>
        <button type="button" className="btn btn-secondary" onClick={() => setShowNew((v) => !v)}>
          {showNew ? "Cancel" : "Add tenant"}
        </button>
      </div>
      {showNew && (
        <form className="card editor-card form-grid" onSubmit={create}>
          <label>
            Slug
            <input value={slug} onChange={(e) => setSlug(e.target.value)} required />
          </label>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            Create tenant
          </button>
        </form>
      )}
      {tenantOpsId && (
        <AdminTenantOpsPanel
          tenant={tenants.find((t) => t.id === tenantOpsId)!}
          onClose={onCloseOps}
          onError={onError}
          onMessage={onMessage}
        />
      )}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Accounts</th>
              <th>Users</th>
              <th>Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <TenantRow
                key={t.id}
                tenant={t}
                onSaved={onSaved}
                onDeleted={onDeleted}
                onManage={() => onOpenOps(t.id)}
                onError={onError}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TenantRow({
  tenant,
  onSaved,
  onDeleted,
  onManage,
  onError,
}: {
  tenant: TenantAdmin;
  onSaved: (tenant: TenantAdmin) => void;
  onDeleted: (id: string) => void;
  onManage: () => void;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tenant.name);
  const [isActive, setIsActive] = useState(tenant.isActive);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await api.updateTenant(tenant.id, { name, isActive });
      onSaved(res.tenant);
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
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active
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
      <td>{tenant.name}</td>
      <td className="muted">{tenant.slug}</td>
      <td>{tenant.hostingAccountCount}</td>
      <td>{tenant.userCount}</td>
      <td>{tenant.isActive ? <span className="badge badge-status-active">Active</span> : <span className="badge badge-status-inactive">Inactive</span>}</td>
      <td>
        <button type="button" className="btn btn-primary btn-sm" onClick={onManage}>
          Manage
        </button>{" "}
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
          Edit
        </button>{" "}
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={async () => {
            if (!window.confirm(`Delete tenant "${tenant.name}" and all related data?`)) return;
            try {
              await api.deleteTenant(tenant.id);
              onDeleted(tenant.id);
            } catch (err) {
              onError(err instanceof ApiError ? err.message : "Delete failed");
            }
          }}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

function AccountsPanel({
  accounts,
  tenants,
  plans,
  onSaved,
  onCreated,
  onDeleted,
  onError,
}: {
  accounts: HostingAccountAdmin[];
  tenants: TenantAdmin[];
  plans: HostingPlan[];
  onSaved: (account: HostingAccountAdmin) => void;
  onCreated: (account: HostingAccountAdmin) => void;
  onDeleted: (id: string) => void;
  onError: (msg: string) => void;
}) {
  const [showNew, setShowNew] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [username, setUsername] = useState("");
  const [domain, setDomain] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.createHostingAccount({ tenantId, username, domain, password });
      onCreated(res.account);
      setShowNew(false);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="admin-page-header-actions" style={{ marginBottom: "1rem", justifyContent: "flex-end", display: "flex" }}>
        <button type="button" className="btn btn-secondary" onClick={() => setShowNew((v) => !v)}>
          {showNew ? "Cancel" : "Add account"}
        </button>
      </div>
      {showNew && (
        <form className="card editor-card form-grid" onSubmit={create}>
          <label>
            Tenant
            <select value={tenantId} onChange={(e) => setTenantId(e.target.value)} required>
              <option value="">Select tenant</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>
          <label>
            Domain
            <input value={domain} onChange={(e) => setDomain(e.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            Create account
          </button>
        </form>
      )}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Login</th>
              <th>Tenant</th>
              <th>Plan</th>
              <th>Disk</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <AccountRow key={a.id} account={a} plans={plans} onSaved={onSaved} onDeleted={onDeleted} onError={onError} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AccountRow({
  account,
  plans,
  onSaved,
  onDeleted,
  onError,
}: {
  account: HostingAccountAdmin;
  plans: HostingPlan[];
  onSaved: (account: HostingAccountAdmin) => void;
  onDeleted: (id: string) => void;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [planId, setPlanId] = useState(account.planId ?? "");
  const [isSuspended, setIsSuspended] = useState(account.isSuspended);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await api.updateHostingAccount(account.id, {
        planId: planId || null,
        isSuspended,
      });
      onSaved(res.account);
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
        <td colSpan={5}>
          <div className="form-grid" style={{ maxWidth: 480 }}>
            <label>
              Plan
              <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
                <option value="">No plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" checked={isSuspended} onChange={(e) => setIsSuspended(e.target.checked)} />
              Suspended
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
      <td>
        <strong>{account.loginId}</strong>
      </td>
      <td>{account.tenant.name}</td>
      <td>{account.plan?.name ?? "—"}</td>
      <td className="muted">
        {account.diskUsedMb}/{account.diskQuotaMb} MB
      </td>
      <td>
        {account.isSuspended ? (
          <span className="badge badge-status-suspended">Suspended</span>
        ) : (
          <span className="badge badge-status-active">Active</span>
        )}{" "}
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
          Edit
        </button>{" "}
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={async () => {
            if (!window.confirm(`Delete hosting account ${account.loginId}?`)) return;
            try {
              await api.deleteHostingAccount(account.id);
              onDeleted(account.id);
            } catch (err) {
              onError(err instanceof ApiError ? err.message : "Delete failed");
            }
          }}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}
