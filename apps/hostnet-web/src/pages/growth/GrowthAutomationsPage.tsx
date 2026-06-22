import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import type { GrowthAutomation, GrowthAutomationRun, GrowthPlanSlug } from "../../types/growth";
import { GrowthPlanCheckoutModal } from "./GrowthPlanCheckoutModal";
import { GrowthUpgradeBanner } from "./GrowthUpgradeBanner";
import { isUpgradeableError, useGrowthContext } from "./GrowthContext";
import "./Growth.css";

export function GrowthAutomationsPage() {
  const { isOwner } = useGrowthContext();
  const [automations, setAutomations] = useState<GrowthAutomation[]>([]);
  const [runs, setRuns] = useState<GrowthAutomationRun[]>([]);
  const [error, setError] = useState("");
  const [limitError, setLimitError] = useState("");
  const [checkoutPlan, setCheckoutPlan] = useState<GrowthPlanSlug | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    triggerType: "lead_created",
    actionType: "send_nurture_email",
    emailStep: "1",
    stageSlug: "contacted",
  });

  async function load() {
    const [autoRes, runsRes] = await Promise.all([
      api.growthAutomations(),
      api.growthAutomationRuns(),
    ]);
    setAutomations(autoRes.automations);
    setRuns(runsRes.runs);
    setError("");
    setLimitError("");
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load automations");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleActive(automation: GrowthAutomation) {
    setBusyId(automation.id);
    try {
      await api.growthAutomationUpdate(automation.id, { isActive: !automation.isActive });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update automation");
    } finally {
      setBusyId("");
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setBusyId("create");
    setError("");
    try {
      const actionConfig =
        form.actionType === "send_nurture_email"
          ? { emailStep: Number(form.emailStep) || 1 }
          : form.actionType === "move_stage"
            ? { stageSlug: form.stageSlug }
            : {};
      const triggerFilter =
        form.triggerType === "stage_changed" ? { toStage: form.stageSlug } : undefined;

      await api.growthAutomationCreate({
        name: form.name.trim(),
        triggerType: form.triggerType,
        actionType: form.actionType,
        triggerFilter,
        actionConfig,
      });
      setShowForm(false);
      setForm({
        name: "",
        triggerType: "lead_created",
        actionType: "send_nurture_email",
        emailStep: "1",
        stageSlug: "contacted",
      });
      await load();
    } catch (err) {
      if (isUpgradeableError(err)) {
        setLimitError(err.message);
      } else {
        setError(err instanceof ApiError ? err.message : "Failed to create automation");
      }
    } finally {
      setBusyId("");
    }
  }

  if (loading) {
    return <div className="growth-card">Loading automations…</div>;
  }

  return (
    <div className="growth-automations-page">
      <div className="growth-card">
        <div className="growth-pipeline-head">
          <div>
            <h1>Automations</h1>
            <p className="muted">
              Trigger actions when leads are captured, stages change, or chats complete. Nurture emails pull from your Content Studio sequence.
            </p>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "Add rule"}
          </button>
        </div>

        {limitError ? (
          <GrowthUpgradeBanner
            message={limitError}
            onUpgrade={isOwner ? (plan) => setCheckoutPlan(plan) : undefined}
          />
        ) : null}
        {error ? <div className="error-banner">{error}</div> : null}

        {showForm ? (
          <form className="growth-automation-form growth-lead-form-card" onSubmit={(e) => void handleCreate(e)}>
            <label className="growth-lead-form-wide">
              Rule name
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </label>
            <label>
              When
              <select
                value={form.triggerType}
                onChange={(e) => setForm((f) => ({ ...f, triggerType: e.target.value }))}
              >
                <option value="lead_created">Lead captured</option>
                <option value="stage_changed">Stage changed</option>
                <option value="chat_completed">Chat completed</option>
              </select>
            </label>
            <label>
              Then
              <select
                value={form.actionType}
                onChange={(e) => setForm((f) => ({ ...f, actionType: e.target.value }))}
              >
                <option value="send_nurture_email">Send nurture email</option>
                <option value="notify_owner">Notify owner</option>
                <option value="move_stage">Move pipeline stage</option>
              </select>
            </label>
            {form.actionType === "send_nurture_email" ? (
              <label>
                Email step
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={form.emailStep}
                  onChange={(e) => setForm((f) => ({ ...f, emailStep: e.target.value }))}
                />
              </label>
            ) : null}
            {form.actionType === "move_stage" || form.triggerType === "stage_changed" ? (
              <label>
                Stage slug
                <input
                  value={form.stageSlug}
                  onChange={(e) => setForm((f) => ({ ...f, stageSlug: e.target.value }))}
                  placeholder="qualified"
                />
              </label>
            ) : null}
            <div className="growth-lead-form-actions">
              <button type="submit" className="btn btn-primary btn-sm" disabled={busyId === "create"}>
                Save rule
              </button>
            </div>
          </form>
        ) : null}

        <h2 style={{ marginTop: "1.25rem", fontSize: "1rem" }}>Active rules ({automations.length})</h2>
        {automations.length === 0 ? (
          <p className="muted">No automations yet. Complete onboarding to seed default rules.</p>
        ) : (
          <ul className="growth-automation-list">
            {automations.map((automation) => (
              <li key={automation.id} className={automation.isActive ? "" : "inactive"}>
                <div className="growth-automation-main">
                  <strong>{automation.name}</strong>
                  <p className="muted">{automation.triggerLabel}</p>
                  <p className="muted">{automation.actionLabel}</p>
                </div>
                <button
                  type="button"
                  className={`btn btn-sm ${automation.isActive ? "btn-secondary" : "btn-primary"}`}
                  disabled={busyId === automation.id}
                  onClick={() => void toggleActive(automation)}
                >
                  {automation.isActive ? "Disable" : "Enable"}
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="muted" style={{ marginTop: "1rem", fontSize: "0.85rem" }}>
          Nurture emails use the <Link to="/growth/studio">email sequence</Link> asset from your content bundle.
        </p>
      </div>

      <div className="growth-card">
        <h2 style={{ fontSize: "1rem" }}>Recent runs</h2>
        {runs.length === 0 ? (
          <p className="muted">No automation runs yet. Capture a lead or complete a chat to see activity.</p>
        ) : (
          <ul className="growth-agent-list">
            {runs.map((run) => (
              <li key={run.id}>
                <strong>{run.automationName}</strong>
                <span className={`growth-automation-status ${run.status}`}> · {run.status}</span>
                <div className="muted">
                  {new Date(run.createdAt).toLocaleString()}
                  {run.errorMessage ? ` — ${run.errorMessage}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {checkoutPlan ? (
        <GrowthPlanCheckoutModal planSlug={checkoutPlan} onClose={() => setCheckoutPlan(null)} />
      ) : null}
    </div>
  );
}
