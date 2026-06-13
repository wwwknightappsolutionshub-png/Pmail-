import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import type { AddonMarketing, HostingAccountAdmin, HostingPlan, PlatformAdmin, SiteSection, TenantAdmin } from "../../types/site";
import { AdminDashboardHome } from "./AdminDashboardHome";
import { AdminPlatformAdminsPanel } from "./AdminPlatformAdminsPanel";
import { AdminTenantOpsPanel } from "./AdminTenantOpsPanel";
import { AdminVpsPanel } from "./AdminVpsPanel";
import "./AdminDashboard.css";

type Tab = "dashboard" | "sections" | "hosting" | "addons" | "tenants" | "accounts" | "vps" | "admins";

export function AdminDashboardPage() {
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [sections, setSections] = useState<SiteSection[]>([]);
  const [plans, setPlans] = useState<HostingPlan[]>([]);
  const [addons, setAddons] = useState<AddonMarketing[]>([]);
  const [tenants, setTenants] = useState<TenantAdmin[]>([]);
  const [accounts, setAccounts] = useState<HostingAccountAdmin[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tenantOpsId, setTenantOpsId] = useState<string | null>(null);

  useEffect(() => {
    api
      .adminMe()
      .then((res) => {
        setAdmin(res.admin);
        return Promise.all([
          api.adminSections(),
          api.adminHostingPlans(),
          api.adminAddonMarketing(),
          api.adminTenants(),
          api.adminHostingAccounts(),
        ]);
      })
      .then(([sectionsRes, plansRes, addonsRes, tenantsRes, accountsRes]) => {
        setSections(sectionsRes.sections);
        setPlans(plansRes.hostingPlans);
        setAddons(addonsRes.addonMarketing);
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

  if (loading) return <div className="loading-state container">Loading admin…</div>;
  if (!admin) return <Navigate to="/admin/login" replace />;

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <div>
          <strong>HostNet Platform Admin</strong>
          <span className="muted" style={{ marginLeft: "0.75rem" }}>
            {admin.name} ({admin.email}) · {admin.role}
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link to="/" className="btn btn-secondary">
            View site
          </Link>
          <button type="button" className="btn btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <button type="button" className={tab === "dashboard" ? "active" : ""} onClick={() => setTab("dashboard")}>
            Dashboard
          </button>
          <button type="button" className={tab === "sections" ? "active" : ""} onClick={() => setTab("sections")}>
            Landing sections
          </button>
          <button type="button" className={tab === "hosting" ? "active" : ""} onClick={() => setTab("hosting")}>
            Hosting plans
          </button>
          <button type="button" className={tab === "addons" ? "active" : ""} onClick={() => setTab("addons")}>
            hmail add-ons
          </button>
          <button type="button" className={tab === "tenants" ? "active" : ""} onClick={() => setTab("tenants")}>
            Tenants
          </button>
          <button type="button" className={tab === "accounts" ? "active" : ""} onClick={() => setTab("accounts")}>
            Panel accounts
          </button>
          <button type="button" className={tab === "vps" ? "active" : ""} onClick={() => setTab("vps")}>
            VPS
          </button>
          {admin.role === "super_admin" && (
            <button type="button" className={tab === "admins" ? "active" : ""} onClick={() => setTab("admins")}>
              Platform admins
            </button>
          )}
        </aside>

        <main className="admin-content">
          {message && <p className="badge" style={{ marginBottom: "1rem" }}>{message}</p>}
          {error && <div className="error-banner" style={{ marginBottom: "1rem" }}>{error}</div>}

          {tab === "dashboard" && <AdminDashboardHome />}

          {tab === "sections" && (
            <SectionsPanel
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
              onError={(err) => {
                setError(err);
                setMessage(null);
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
            <AddonsPanel
              addons={addons}
              onSaved={(item) => {
                setAddons((prev) => prev.map((a) => (a.id === item.id ? item : a)));
                setMessage("Add-on marketing saved");
                setError(null);
              }}
              onDeleted={(id) => {
                setAddons((prev) => prev.filter((a) => a.id !== id));
                setMessage("Add-on marketing deleted");
                setError(null);
              }}
              onError={(err) => {
                setError(err);
                setMessage(null);
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
    </div>
  );
}

function SectionsPanel({
  sections,
  onSaved,
  onDeleted,
  onError,
}: {
  sections: SiteSection[];
  onSaved: (section: SiteSection) => void;
  onDeleted: (id: string) => void;
  onError: (msg: string) => void;
}) {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Landing page sections</h2>
      {sections.map((section) => (
        <SectionEditor key={section.id} section={section} onSaved={onSaved} onDeleted={onDeleted} onError={onError} />
      ))}
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
  const [ctaLabel, setCtaLabel] = useState(section.ctaLabel ?? "");
  const [ctaUrl, setCtaUrl] = useState(section.ctaUrl ?? "");
  const [isPublished, setIsPublished] = useState(section.isPublished);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateSection(section.id, {
        title,
        subtitle: subtitle || null,
        body: body || null,
        ctaLabel: ctaLabel || null,
        ctaUrl: ctaUrl || null,
        isPublished,
      });
      onSaved(res.section);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete section "${section.sectionKey}"?`)) return;
    try {
      await api.deleteSection(section.id);
      onDeleted(section.id);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  return (
    <form className="card editor-card form-grid" onSubmit={save}>
      <strong>
        {section.sectionKey} {isPublished ? "" : "(hidden)"}
      </strong>
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label>
        Subtitle
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
      </label>
      <label>
        Body
        <textarea value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
      <label>
        CTA label
        <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
      </label>
      <label>
        CTA URL
        <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
        Published
      </label>
      <div className="editor-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save section"}
        </button>
        <button type="button" className="btn btn-danger" onClick={remove}>
          Delete
        </button>
      </div>
    </form>
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
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ marginTop: 0 }}>Hosting plans</h2>
        <button type="button" className="btn btn-secondary" onClick={() => setShowNew((v) => !v)}>
          {showNew ? "Cancel" : "Add plan"}
        </button>
      </div>

      {showNew && (
        <form className="card editor-card form-grid" onSubmit={createPlan}>
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

      {plans.map((plan) => (
        <PlanEditor key={plan.id} plan={plan} onSaved={onSaved} onDeleted={onDeleted} onError={onError} />
      ))}
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
    <form className="card editor-card form-grid" onSubmit={save}>
      <strong>
        {plan.slug} {isActive ? "" : "(inactive)"}
      </strong>
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

function AddonsPanel({
  addons,
  onSaved,
  onDeleted,
  onError,
}: {
  addons: AddonMarketing[];
  onSaved: (item: AddonMarketing) => void;
  onDeleted: (id: string) => void;
  onError: (msg: string) => void;
}) {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>hmail immigration add-on marketing</h2>
      <p className="muted">Edit landing copy, badges, and featured flags for paid immigration add-ons.</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Add-on</th>
              <th>Marketing</th>
              <th>Price</th>
              <th>Featured</th>
              <th>Published</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {addons.map((addon) => (
              <AddonRow key={addon.id} addon={addon} onSaved={onSaved} onDeleted={onDeleted} onError={onError} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddonRow({
  addon,
  onSaved,
  onDeleted,
  onError,
}: {
  addon: AddonMarketing;
  onSaved: (item: AddonMarketing) => void;
  onDeleted: (id: string) => void;
  onError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [marketingTitle, setMarketingTitle] = useState(addon.marketingTitle);
  const [badge, setBadge] = useState(addon.badge ?? "");
  const [displayPriceCents, setDisplayPriceCents] = useState(addon.displayPriceCents);
  const [landingFeatured, setLandingFeatured] = useState(addon.landingFeatured);
  const [isPublished, setIsPublished] = useState(addon.isPublished);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await api.updateAddonMarketing(addon.id, {
        marketingTitle,
        badge: badge || null,
        displayPriceCents,
        landingFeatured,
        isPublished,
      });
      onSaved(res.item);
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
          <div className="form-grid" style={{ maxWidth: 640 }}>
            <label>
              Marketing title
              <input value={marketingTitle} onChange={(e) => setMarketingTitle(e.target.value)} />
            </label>
            <label>
              Badge
              <input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="Free addon / Coming soon" />
            </label>
            <label>
              Display price (cents)
              <input
                type="number"
                value={displayPriceCents}
                onChange={(e) => setDisplayPriceCents(Number(e.target.value))}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" checked={landingFeatured} onChange={(e) => setLandingFeatured(e.target.checked)} />
              Featured on landing
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
              Published
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
        <strong>{addon.name}</strong>
        <div className="muted">{addon.slug}</div>
      </td>
      <td>{addon.marketingTitle}</td>
      <td>{addon.displayPriceCents === 0 ? "Free" : `$${(addon.displayPriceCents / 100).toFixed(2)}`}</td>
      <td>{addon.landingFeatured ? "Yes" : "No"}</td>
      <td>{addon.isPublished ? "Yes" : "No"}</td>
      <td>
        <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
          Edit
        </button>{" "}
        <button
          type="button"
          className="btn btn-danger"
          onClick={async () => {
            if (!window.confirm(`Delete marketing for "${addon.name}"?`)) return;
            try {
              await api.deleteAddonMarketing(addon.id);
              onDeleted(addon.id);
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ marginTop: 0 }}>Tenants</h2>
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
      <td>{tenant.isActive ? "Yes" : "No"}</td>
      <td>
        <button type="button" className="btn btn-primary" onClick={onManage}>
          Manage
        </button>{" "}
        <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
          Edit
        </button>{" "}
        <button
          type="button"
          className="btn btn-danger"
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ marginTop: 0 }}>Panel hosting accounts</h2>
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
        {account.isSuspended ? "Suspended" : "Active"}{" "}
        <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
          Edit
        </button>{" "}
        <button
          type="button"
          className="btn btn-danger"
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
