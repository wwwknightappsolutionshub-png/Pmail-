import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../api/client";
import type { AdminAddon } from "../../types/site";
import "./AdminDashboard.css";

const VERTICAL_ORDER = [
  "legal",
  "real-estate",
  "accounting",
  "recruitment",
  "b2b-services",
  "healthcare",
  "platform",
] as const;

export function AdminAddonsPanel({
  onError,
  onMessage,
}: {
  onError: (msg: string) => void;
  onMessage: (msg: string) => void;
}) {
  const [addons, setAddons] = useState<AdminAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [openVertical, setOpenVertical] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newAddon, setNewAddon] = useState({
    slug: "",
    name: "",
    group: "industry_tools",
    vertical: "platform",
    addonKind: "platform",
    description: "",
    features: "",
    priceCents: 1500,
    tenantPriceCents: 1500,
    minTenantSeats: 5,
    isPaid: true,
  });

  function toggleVertical(vertical: string) {
    setOpenVertical((prev) => (prev === vertical ? null : vertical));
  }

  async function load() {
    setLoading(true);
    try {
      const res = await api.adminAddons();
      setAddons(res.addons);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Failed to load add-ons");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function syncCatalog() {
    setSyncing(true);
    try {
      const res = await api.syncAdminAddonCatalog();
      setAddons(res.addons);
      onMessage(`Catalog synced — ${res.addonCount} add-ons, ${res.marketingCount} marketing profiles`);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function createAddon() {
    setCreating(true);
    try {
      const res = await api.createAdminAddon({
        ...newAddon,
        features: newAddon.features
          .split("\n")
          .map((feature) => feature.trim())
          .filter(Boolean),
      });
      setAddons((prev) => [...prev, res.addon]);
      setOpenVertical(res.addon.vertical);
      setNewAddon({
        slug: "",
        name: "",
        group: "industry_tools",
        vertical: "platform",
        addonKind: "platform",
        description: "",
        features: "",
        priceCents: 1500,
        tenantPriceCents: 1500,
        minTenantSeats: 5,
        isPaid: true,
      });
      onMessage(`${res.addon.name} created`);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, AdminAddon[]>();
    for (const addon of addons) {
      const list = map.get(addon.vertical) ?? [];
      list.push(addon);
      map.set(addon.vertical, list);
    }
    return VERTICAL_ORDER.filter((v) => map.has(v)).map((vertical) => ({
      vertical,
      label: addons.find((a) => a.vertical === vertical)?.verticalLabel ?? vertical,
      items: map.get(vertical) ?? [],
    }));
  }, [addons]);

  const activeCount = addons.filter((a) => a.isActive && !a.comingSoon).length;
  const missingMarketing = addons.filter((a) => !a.hasMarketing).length;
  const subscribedTotal = addons.reduce((sum, a) => sum + a.subscriberCount, 0);

  if (loading) return <p className="muted">Loading PMail+ add-on catalog…</p>;

  return (
    <div>
      <div className="admin-addon-toolbar">
        <div className="admin-addon-summary">
          <span>
            <strong>{addons.length}</strong> catalog entries
          </span>
          <span>
            <strong>{activeCount}</strong> active (non–coming-soon)
          </span>
          <span>
            <strong>{subscribedTotal}</strong> subscribers/trials
          </span>
          {missingMarketing > 0 ? (
            <span className="badge badge-status-contacted">{missingMarketing} missing marketing</span>
          ) : null}
        </div>
        <button type="button" className="btn btn-secondary" disabled={syncing} onClick={() => void syncCatalog()}>
          {syncing ? "Syncing…" : "Sync from catalog"}
        </button>
      </div>

      <section className="admin-card" style={{ marginBottom: "1rem" }}>
        <h3>Create add-on</h3>
        <div className="form-grid admin-addon-edit-form">
          <label>
            Slug
            <input value={newAddon.slug} onChange={(e) => setNewAddon((current) => ({ ...current, slug: e.target.value }))} />
          </label>
          <label>
            Name
            <input value={newAddon.name} onChange={(e) => setNewAddon((current) => ({ ...current, name: e.target.value }))} />
          </label>
          <label>
            Vertical
            <select value={newAddon.vertical} onChange={(e) => setNewAddon((current) => ({ ...current, vertical: e.target.value }))}>
              {VERTICAL_ORDER.map((vertical) => (
                <option key={vertical} value={vertical}>
                  {vertical}
                </option>
              ))}
            </select>
          </label>
          <label>
            Kind
            <select value={newAddon.addonKind} onChange={(e) => setNewAddon((current) => ({ ...current, addonKind: e.target.value }))}>
              <option value="vertical">Vertical bundle</option>
              <option value="platform">Platform standalone</option>
              <option value="system">Included/system</option>
            </select>
          </label>
          <label>
            Group
            <input value={newAddon.group} onChange={(e) => setNewAddon((current) => ({ ...current, group: e.target.value }))} />
          </label>
          <label>
            User price (cents)
            <input type="number" min={0} value={newAddon.priceCents} onChange={(e) => setNewAddon((current) => ({ ...current, priceCents: Number(e.target.value) }))} />
          </label>
          <label>
            Tenant member price (cents)
            <input type="number" min={0} value={newAddon.tenantPriceCents} onChange={(e) => setNewAddon((current) => ({ ...current, tenantPriceCents: Number(e.target.value) }))} />
          </label>
          <label>
            Min tenant seats
            <input type="number" min={1} value={newAddon.minTenantSeats} onChange={(e) => setNewAddon((current) => ({ ...current, minTenantSeats: Number(e.target.value) }))} />
          </label>
          <label className="admin-addon-field-wide">
            Description
            <input value={newAddon.description} onChange={(e) => setNewAddon((current) => ({ ...current, description: e.target.value }))} />
          </label>
          <label className="admin-addon-field-wide">
            Features, one per line
            <textarea value={newAddon.features} onChange={(e) => setNewAddon((current) => ({ ...current, features: e.target.value }))} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input type="checkbox" checked={newAddon.isPaid} onChange={(e) => setNewAddon((current) => ({ ...current, isPaid: e.target.checked }))} />
            Paid add-on
          </label>
          <div className="editor-actions">
            <button type="button" className="btn btn-primary" disabled={creating} onClick={() => void createAddon()}>
              {creating ? "Creating…" : "Create add-on"}
            </button>
          </div>
        </div>
      </section>

      {grouped.map(({ vertical, label, items }) => {
        const isOpen = openVertical === vertical;
        return (
        <section key={vertical} className="admin-addon-group admin-addon-accordion">
          <button
            type="button"
            className={`admin-addon-accordion-head${isOpen ? " open" : ""}`}
            onClick={() => toggleVertical(vertical)}
            aria-expanded={isOpen}
          >
            <span>
              <strong>{label}</strong>
              <span className="muted admin-addon-accordion-count">{items.length} add-ons</span>
            </span>
            <span className="admin-addon-accordion-chevron" aria-hidden>{isOpen ? "−" : "+"}</span>
          </button>
          {isOpen ? (
          <>
          <p className="muted admin-addon-vertical-note">
            {vertical === "legal"
              ? "Immigration / RCIC modules are merged here with Bespoke Mail for law firms."
              : `${items.length} add-on${items.length === 1 ? "" : "s"} for this industry vertical.`}
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Add-on</th>
                  <th>Phase</th>
                  <th>Status & pricing</th>
                  <th>Subscribers</th>
                  <th>Marketing</th>
                  <th>Featured</th>
                  <th>Published</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((addon) => (
                  <AddonRow
                    key={addon.id}
                    addon={addon}
                    onUpdated={(updated) => setAddons((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))}
                    onDeleted={(id) => setAddons((prev) => prev.map((a) => (a.id === id ? { ...a, isActive: false, deletedAt: new Date().toISOString() } : a)))}
                    onError={onError}
                    onMessage={onMessage}
                  />
                ))}
              </tbody>
            </table>
          </div>
          </>
          ) : null}
        </section>
        );
      })}

      {addons.length === 0 ? (
        <p className="muted">
          No add-ons in the database. Click <strong>Sync from catalog</strong> to import all PMail+ modules.
        </p>
      ) : null}
    </div>
  );
}

function AddonRow({
  addon,
  onUpdated,
  onDeleted,
  onError,
  onMessage,
}: {
  addon: AdminAddon;
  onUpdated: (addon: AdminAddon) => void;
  onDeleted: (id: string) => void;
  onError: (msg: string) => void;
  onMessage: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [slug, setSlug] = useState(addon.slug);
  const [name, setName] = useState(addon.name);
  const [group, setGroup] = useState(addon.group);
  const [vertical, setVertical] = useState(addon.vertical);
  const [addonKind, setAddonKind] = useState(addon.addonKind);
  const [description, setDescription] = useState(addon.description);
  const [featuresText, setFeaturesText] = useState((addon.features ?? []).join("\n"));
  const [priceCents, setPriceCents] = useState(addon.priceCents);
  const [tenantPriceCents, setTenantPriceCents] = useState(addon.tenantPriceCents);
  const [minTenantSeats, setMinTenantSeats] = useState(addon.minTenantSeats);
  const [isPaid, setIsPaid] = useState(addon.isPaid);
  const [releasePhase, setReleasePhase] = useState<1 | 2 | 3>(addon.releasePhase);
  const [comingSoon, setComingSoon] = useState(addon.comingSoon);
  const [sortOrder, setSortOrder] = useState(addon.sortOrder);
  const [isActive, setIsActive] = useState(addon.isActive);
  const [marketingTitle, setMarketingTitle] = useState(addon.marketing?.marketingTitle ?? addon.name);
  const [badge, setBadge] = useState(addon.marketing?.badge ?? "");
  const [displayPriceCents, setDisplayPriceCents] = useState(addon.marketing?.displayPriceCents ?? addon.priceCents);
  const [trialDays, setTrialDays] = useState(addon.marketing?.trialDays ?? 7);
  const [landingFeatured, setLandingFeatured] = useState(addon.marketing?.landingFeatured ?? false);
  const [isPublished, setIsPublished] = useState(addon.marketing?.isPublished ?? false);
  const [saving, setSaving] = useState(false);

  async function softDelete() {
    if (!window.confirm(`Suspend and soft-delete ${addon.name}?`)) return;
    setSaving(true);
    try {
      await api.deleteAdminAddon(addon.id);
      onDeleted(addon.id);
      onMessage(`${addon.name} suspended and soft-deleted`);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const addonRes = await api.updateAdminAddon(addon.id, {
        slug,
        name,
        group,
        vertical,
        addonKind,
        description,
        features: featuresText
          .split("\n")
          .map((feature) => feature.trim())
          .filter(Boolean),
        priceCents,
        tenantPriceCents,
        minTenantSeats,
        isPaid,
        releasePhase,
        comingSoon,
        sortOrder,
        isActive,
      });
      let updated = addonRes.addon;

      if (addon.marketingId) {
        const marketingRes = await api.updateAddonMarketing(addon.marketingId, {
          marketingTitle,
          badge: badge || null,
          displayPriceCents,
          trialDays,
          landingFeatured,
          isPublished,
        });
        updated = {
          ...updated,
          marketing: marketingRes.item,
          hasMarketing: true,
          marketingId: marketingRes.item.id,
        };
      }

      onUpdated(updated);
      onMessage(`${addon.name} updated`);
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
        <td colSpan={8}>
          <div className="form-grid admin-addon-edit-form">
            <label>
              Slug
              <input value={slug} onChange={(e) => setSlug(e.target.value)} />
            </label>
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Group
              <input value={group} onChange={(e) => setGroup(e.target.value)} />
            </label>
            <label>
              Vertical
              <select value={vertical} onChange={(e) => setVertical(e.target.value)}>
                {VERTICAL_ORDER.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Kind
              <select value={addonKind} onChange={(e) => setAddonKind(e.target.value)}>
                <option value="vertical">Vertical bundle</option>
                <option value="platform">Platform standalone</option>
                <option value="system">Included/system</option>
              </select>
            </label>
            <label>
              Release phase
              <select value={releasePhase} onChange={(e) => setReleasePhase(Number(e.target.value) as 1 | 2 | 3)}>
                <option value={1}>Phase 1</option>
                <option value={2}>Phase 2</option>
                <option value={3}>Phase 3</option>
              </select>
            </label>
            <label>
              Sort order
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
            </label>
            <label>
              User price (cents)
              <input type="number" min={0} value={priceCents} onChange={(e) => setPriceCents(Number(e.target.value))} />
            </label>
            <label>
              Tenant member price (cents)
              <input type="number" min={0} value={tenantPriceCents} onChange={(e) => setTenantPriceCents(Number(e.target.value))} />
            </label>
            <label>
              Min tenant seats
              <input type="number" min={1} value={minTenantSeats} onChange={(e) => setMinTenantSeats(Number(e.target.value))} />
            </label>
            <label className="admin-addon-field-wide">
              Description
              <input value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
            <label className="admin-addon-field-wide">
              Features, one per line
              <textarea value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
              Paid add-on
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" checked={comingSoon} onChange={(e) => setComingSoon(e.target.checked)} />
              Coming soon
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active in PMail+ (tenant trials &amp; subscriptions)
            </label>
            {!addon.hasMarketing ? (
              <p className="admin-alert admin-alert-error">Marketing profile missing — run Sync from catalog first.</p>
            ) : (
              <>
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
                <label>
                  Trial days
                  <input type="number" min={0} value={trialDays} onChange={(e) => setTrialDays(Number(e.target.value))} />
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input type="checkbox" checked={landingFeatured} onChange={(e) => setLandingFeatured(e.target.checked)} />
                  Featured on landing
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
                  Published on site
                </label>
              </>
            )}
            <div className="editor-actions">
              <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={saving}>
                Save changes
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
        <div className="muted">{addon.groupLabel}</div>
      </td>
      <td>
        <span className="badge">Phase {addon.releasePhase}</span>
        {addon.comingSoon ? <span className="badge badge-status-contacted">Coming soon</span> : null}
      </td>
      <td>
        {addon.isActive ? (
          <span className="badge badge-status-active">Active</span>
        ) : (
          <span className="badge badge-status-inactive">Inactive</span>
        )}
        {addon.deletedAt ? <span className="badge badge-status-inactive">Soft deleted</span> : null}
        <div className="muted">
          {addon.isPaid ? "Paid" : "Included"} · {addon.addonKind}
        </div>
        <div className="muted">
          User ${((addon.priceCents ?? 0) / 100).toFixed(2)} · Tenant $
          {((addon.tenantPriceCents ?? 0) / 100).toFixed(2)}/member · min {addon.minTenantSeats}
        </div>
      </td>
      <td>
        {addon.subscriberCount === 0 ? (
          <span className="muted">None</span>
        ) : (
          <div className="admin-addon-subscribers">
            {addon.subscribers.slice(0, 3).map((sub) => (
              <span
                key={`${sub.tenantSlug}-${sub.userEmail ?? "tenant"}-${sub.scope}-${sub.subscriptionDate}`}
                className="badge badge-role"
                title={`Started ${new Date(sub.subscriptionDate).toLocaleDateString()}${sub.expiryDate ? ` · Expires ${new Date(sub.expiryDate).toLocaleDateString()}` : ""}`}
              >
                {sub.userEmail ?? sub.tenantName} ({sub.scope})
              </span>
            ))}
            {addon.subscriberCount > 3 ? <span className="muted">+{addon.subscriberCount - 3} more</span> : null}
          </div>
        )}
      </td>
      <td>
        {!addon.hasMarketing ? (
          <span className="badge badge-status-inactive">Not set up</span>
        ) : (
          <>
            {addon.marketing?.marketingTitle}
            <div className="muted">
              {addon.marketing?.displayPriceCents === 0
                ? "Free"
                : `$${((addon.marketing?.displayPriceCents ?? 0) / 100).toFixed(2)}`}
              {addon.marketing?.badge ? ` · ${addon.marketing.badge}` : ""}
            </div>
          </>
        )}
      </td>
      <td>
        {addon.marketing?.landingFeatured ? (
          <span className="badge badge-status-active">Yes</span>
        ) : (
          <span className="muted">No</span>
        )}
      </td>
      <td>
        {addon.marketing?.isPublished ? (
          <span className="badge badge-status-active">Yes</span>
        ) : (
          <span className="badge badge-status-inactive">No</span>
        )}
      </td>
      <td>
        <div className="editor-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
            Manage
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void softDelete()} disabled={saving || Boolean(addon.deletedAt)}>
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
