import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError, formatPrice } from "../../api/client";
import type {
  GrowthPlanOption,
  GrowthPlanSlug,
  GrowthPlanSnapshot,
  GrowthSettingsPayload,
  GrowthTeamMember,
} from "../../types/growth";
import { GROWTH_PLAN_LABELS } from "../../types/growth";
import { useGrowthContext } from "./GrowthContext";
import { GrowthPlanCheckoutModal } from "./GrowthPlanCheckoutModal";
import "./Growth.css";

export function GrowthSettingsPage() {
  const { isOwner, reload: reloadPlanContext } = useGrowthContext();
  const [payload, setPayload] = useState<GrowthSettingsPayload | null>(null);
  const [plan, setPlan] = useState<GrowthPlanSnapshot | null>(null);
  const [planOptions, setPlanOptions] = useState<GrowthPlanOption[]>([]);
  const [checkoutPlan, setCheckoutPlan] = useState<GrowthPlanSlug | null>(null);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [settingsRes, planRes, optionsRes] = await Promise.all([
      api.growthSettings(),
      api.growthPlan(),
      api.growthPlanOptions(),
    ]);
    setPayload(settingsRes);
    setPlan(planRes.plan);
    setPlanOptions(optionsRes.plans);
    setNotifyEmail(settingsRes.settings.notifyEmail ?? "");
    setError("");
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load settings");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSaveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!isOwner) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await api.growthSettingsUpdate({ notifyEmail: notifyEmail.trim() || null });
      setMessage("Notification settings saved.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save settings");
    } finally {
      setBusy(false);
    }
  }

  async function handleInvite(event: React.FormEvent) {
    event.preventDefault();
    if (!isOwner) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await api.growthTeamInvite({ email: inviteEmail.trim(), role: "marketer" });
      setInviteEmail("");
      setMessage("Marketer invited.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to invite teammate");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(member: GrowthTeamMember) {
    if (!isOwner || member.role === "owner") return;
    setBusy(true);
    setError("");
    try {
      await api.growthTeamRemove(member.id);
      setMessage("Team member removed.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to remove teammate");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="growth-card">Loading settings…</div>;
  }

  return (
    <div className="growth-card">
      <h1>Settings & plan</h1>
      <p className="muted">
        Manage your Prohost Growth subscription, lead alerts, and team access.{" "}
        <Link to="/growth/dashboard">Back to dashboard</Link>
      </p>

      {error ? <div className="error-banner">{error}</div> : null}
      {message ? <div className="success-banner">{message}</div> : null}

      {plan ? (
        <section className="growth-settings-section">
          <h2>Plan & usage</h2>
          <div className="growth-status-grid">
            <div className="growth-status-card">
              <strong>{plan.planName}</strong>
              <p className="muted">
                {formatPrice(plan.priceCents)}/mo · {plan.hasAccess ? "Active trial or subscription" : "No access"}
              </p>
            </div>
            <div className="growth-status-card">
              <strong>Leads this month</strong>
              <p className="muted">
                {plan.usage.leadsThisMonth} / {plan.limits.leadsPerMonth}
              </p>
            </div>
            <div className="growth-status-card">
              <strong>Automations</strong>
              <p className="muted">
                {plan.usage.automationCount} / {plan.limits.automations}
              </p>
            </div>
            <div className="growth-status-card">
              <strong>Published pages</strong>
              <p className="muted">
                {plan.usage.publishedPages} / {plan.limits.publishedPages}
              </p>
            </div>
          </div>
          {!plan.limits.analytics ? (
            <p className="muted" style={{ marginTop: "0.75rem" }}>
              Analytics requires Pro or Agency. Subscribe to unlock the command center and optimization loop.
            </p>
          ) : null}
        </section>
      ) : null}

      {isOwner && planOptions.length > 0 ? (
        <section className="growth-settings-section">
          <h2>Upgrade plan</h2>
          <p className="muted">Higher tiers unlock more leads, automations, published pages, and analytics.</p>
          <div className="growth-plan-tier-grid">
            {planOptions.map((option) => {
              const isCurrent = plan?.planSlug === option.slug;
              const canUpgrade =
                option.slug === "pro"
                  ? plan?.planSlug === "starter"
                  : option.slug === "agency"
                    ? plan?.planSlug !== "agency"
                    : false;
              return (
                <div key={option.slug} className={`growth-plan-tier-card${isCurrent ? " current" : ""}`}>
                  <strong>{GROWTH_PLAN_LABELS[option.slug]}</strong>
                  <p className="growth-plan-tier-price">{formatPrice(option.priceCents)}/mo</p>
                  <ul className="growth-plan-tier-limits muted">
                    <li>{option.limits.leadsPerMonth} leads / month</li>
                    <li>{option.limits.automations} automations</li>
                    <li>{option.limits.publishedPages} published pages</li>
                    <li>{option.limits.analytics ? "Analytics & optimization" : "Chatbot only"}</li>
                  </ul>
                  {isCurrent ? (
                    <span className="growth-plan-tier-badge">Current plan</span>
                  ) : canUpgrade ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setCheckoutPlan(option.slug)}
                    >
                      Upgrade to {GROWTH_PLAN_LABELS[option.slug]}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="growth-settings-section">
        <h2>Lead notifications</h2>
        {!isOwner ? (
          <p className="muted">Only the workspace owner can change notification settings.</p>
        ) : (
          <form className="growth-form" onSubmit={handleSaveSettings}>
            <label>
              Notify email
              <input
                type="email"
                value={notifyEmail}
                onChange={(event) => setNotifyEmail(event.target.value)}
                placeholder="owner@yourdomain.com"
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Save notifications
            </button>
          </form>
        )}
      </section>

      <section className="growth-settings-section">
        <h2>Team</h2>
        <p className="muted">Owners manage billing and settings. Marketers can use pipeline, studio, and automations.</p>
        <ul className="growth-team-list">
          {(payload?.team ?? []).map((member) => (
            <li key={member.id} className="growth-team-row">
              <span>
                {member.email} · <strong>{member.role}</strong>
              </span>
              {isOwner && member.role !== "owner" ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={busy}
                  onClick={() => void handleRemove(member)}
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {isOwner ? (
          <form className="growth-form" onSubmit={handleInvite} style={{ marginTop: "1rem" }}>
            <label>
              Invite marketer
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="marketer@yourdomain.com"
                required
              />
            </label>
            <button type="submit" className="btn btn-secondary" disabled={busy}>
              Send invite
            </button>
          </form>
        ) : null}
      </section>

      {checkoutPlan ? (
        <GrowthPlanCheckoutModal
          planSlug={checkoutPlan}
          onClose={() => setCheckoutPlan(null)}
          onComplete={() => {
            void reloadPlanContext();
            void load();
          }}
        />
      ) : null}
    </div>
  );
}
