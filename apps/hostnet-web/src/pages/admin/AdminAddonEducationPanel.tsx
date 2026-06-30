import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../api/client";
import type { AddonEducationCampaignStep } from "../../types/site";
import { AdminPageHeader } from "./AdminPageHeader";
import "./AdminDashboard.css";

function errMsg(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function AdminAddonEducationPanel({
  onError,
  onMessage,
}: {
  onError: (msg: string) => void;
  onMessage: (msg: string) => void;
}) {
  const [steps, setSteps] = useState<AddonEducationCampaignStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaignType, setCampaignType] = useState<"panel" | "vertical">("panel");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.adminAddonEducationSteps();
      setSteps(res.steps);
    } catch (err) {
      onError(errMsg(err, "Failed to load education campaign steps"));
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => steps.filter((step) => step.campaignType === campaignType).sort((a, b) => a.sortOrder - b.sortOrder),
    [steps, campaignType],
  );

  async function updateStep(id: string, patch: Partial<AddonEducationCampaignStep>) {
    setBusyId(id);
    try {
      const res = await api.updateAdminAddonEducationStep(id, patch);
      setSteps((prev) => prev.map((step) => (step.id === id ? res.step : step)));
      onMessage("Campaign step updated");
    } catch (err) {
      onError(errMsg(err, "Failed to update step"));
    } finally {
      setBusyId(null);
    }
  }

  async function moveStep(id: string, direction: -1 | 1) {
    const list = [...filtered];
    const index = list.findIndex((step) => step.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= list.length) return;
    const reordered = [...list];
    const [item] = reordered.splice(index, 1);
    reordered.splice(target, 0, item);
    setBusyId(id);
    try {
      const res = await api.reorderAdminAddonEducationSteps(campaignType, reordered.map((step) => step.id));
      setSteps((prev) => {
        const other = prev.filter((step) => step.campaignType !== campaignType);
        return [...other, ...res.steps];
      });
      onMessage("Campaign order saved");
    } catch (err) {
      onError(errMsg(err, "Failed to reorder steps"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin-addon-education-panel">
      <AdminPageHeader
        title="PMail+ education drip"
        description="Panel workspace and vertical add-on education sequences. Templates live under Email templates (category pmail-education). Users advance after open or link click; unread steps resend every 48h up to 5 times."
      />

      <div className="admin-subtabs" style={{ marginBottom: "1rem" }}>
        {(["panel", "vertical"] as const).map((type) => (
          <button
            key={type}
            type="button"
            className={campaignType === type ? "active" : ""}
            onClick={() => setCampaignType(type)}
          >
            {type === "panel" ? "Panel workspace (8 steps)" : "Vertical (one-time)"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted">Loading campaign steps…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Step</th>
                <th>Template</th>
                <th>Active</th>
                <th>Interval (h)</th>
                <th>Resend (h)</th>
                <th>Max resends</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((step, index) => (
                <tr key={step.id}>
                  <td>{index + 1}</td>
                  <td>
                    <code>{step.stepKey}</code>
                  </td>
                  <td>
                    <code>{step.templateSlug}</code>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={step.isActive}
                      disabled={busyId === step.id}
                      onChange={(e) => void updateStep(step.id, { isActive: e.target.checked })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      className="admin-inline-number"
                      value={step.intervalHours}
                      disabled={busyId === step.id || campaignType === "vertical"}
                      onChange={(e) =>
                        void updateStep(step.id, { intervalHours: Math.max(1, Number(e.target.value) || 48) })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      className="admin-inline-number"
                      value={step.resendIntervalHours}
                      disabled={busyId === step.id}
                      onChange={(e) =>
                        void updateStep(step.id, { resendIntervalHours: Math.max(1, Number(e.target.value) || 48) })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      className="admin-inline-number"
                      value={step.maxResends}
                      disabled={busyId === step.id}
                      onChange={(e) =>
                        void updateStep(step.id, { maxResends: Math.max(0, Number(e.target.value) || 0) })
                      }
                    />
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={busyId === step.id || index === 0 || campaignType === "vertical"}
                        onClick={() => void moveStep(step.id, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={busyId === step.id || index === filtered.length - 1 || campaignType === "vertical"}
                        onClick={() => void moveStep(step.id, 1)}
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="muted" style={{ marginTop: "1rem" }}>
        Per-user and per-tenant suppress controls are on PMail+ users and tenant ops. Users can opt out from mail settings or the unsubscribe link in each email.
      </p>
    </div>
  );
}
