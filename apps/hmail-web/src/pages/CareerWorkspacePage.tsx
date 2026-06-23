import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { api } from "../api/client";
import {
  CAREER_LOCKED_FEATURES,
  CAREER_MARKETPLACE_FEATURES,
  CareerGatePrimaryButton,
  CareerGateSecondaryLink,
  CareerGateView,
} from "../components/CareerGateView";
import { CareerJobHunterNav } from "../components/CareerJobHunterNav";
import { CareerPMailShell } from "../components/CareerPMailShell";
import { JobHunterPanel } from "../components/JobHunterPanel";
import { useAddons } from "../context/AddonContext";
import { CareerWorkspaceContext } from "../context/CareerWorkspaceContext";
import "./CareerWorkspacePage.css";

export function CareerWorkspacePage() {
  const location = useLocation();
  const { hasJobHunterAccess, jobHunterReadOnly, jobHunterCanWrite, jobHunterEntitlement, refresh: refreshAddons } =
    useAddons();

  const hasJobHunter = hasJobHunterAccess();
  const readOnly = jobHunterReadOnly();
  const settingsOnly = location.pathname.startsWith("/career/settings");

  const [loading, setLoading] = useState(true);
  const [careerUnlocked, setCareerUnlocked] = useState<boolean | null>(null);
  const [regionCode, setRegionCode] = useState("US");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const settingsRes = await api.getJobHunterSettings();
      setCareerUnlocked(settingsRes.settings.careerNavUnlocked);
      setRegionCode(settingsRes.settings.regionCode ?? "US");
      await refreshAddons();
    } catch {
      setCareerUnlocked(false);
    } finally {
      setLoading(false);
    }
  }, [refreshAddons]);

  const unlockCareerWorkspace = useCallback(async () => {
    setUnlocking(true);
    setUnlockError("");
    try {
      const settingsRes = await api.getJobHunterSettings();
      if (settingsRes.settings.needsTierBDisclosure) {
        await api.acceptJobHunterConsent();
      }
      await api.updateJobHunterSettings({ enabled: true, manualJobHuntingOverride: true });
      await load();
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : "Could not unlock career workspace");
    } finally {
      setUnlocking(false);
    }
  }, [load]);

  useEffect(() => {
    if (!hasJobHunter) {
      setLoading(false);
      setCareerUnlocked(false);
      return;
    }
    void load();
  }, [hasJobHunter, load]);

  const workspaceContext = useMemo(
    () => ({
      canWrite: jobHunterCanWrite(),
      readOnly,
      regionCode,
    }),
    [jobHunterCanWrite, readOnly, regionCode],
  );

  const gateContent = !hasJobHunter ? (
    <CareerGateView
      eyebrow="Job Hunter required"
      title="Your career workspace lives inside PMail+"
      description="Add Job Hunter to track applications from mail, build CVs, scan for ATS fit, and prepare for interviews."
      features={CAREER_MARKETPLACE_FEATURES}
      primaryAction={
        <Link className="career-workspace-btn career-workspace-btn--primary" to="/addons?highlight=job-hunter-functionality">
          Open Marketplace
        </Link>
      }
      secondaryAction={
        <Link className="career-workspace-btn career-workspace-btn--secondary" to="/">
          Back to mail
        </Link>
      }
    />
  ) : !loading && careerUnlocked === false && !settingsOnly ? (
    <CareerGateView
      eyebrow="Career workspace locked"
      title="Turn on job hunting to get started"
      description="Enable job hunting to unlock CV Hub, scanner, builder, apply assist, and application tracking."
      features={CAREER_LOCKED_FEATURES}
      error={unlockError}
      primaryAction={
        <CareerGatePrimaryButton disabled={unlocking} onClick={() => void unlockCareerWorkspace()}>
          {unlocking ? "Unlocking…" : "Start job hunting"}
        </CareerGatePrimaryButton>
      }
      secondaryAction={<CareerGateSecondaryLink to="/career/settings">Open settings</CareerGateSecondaryLink>}
    />
  ) : null;

  const dashboard = (
    <>
      {jobHunterEntitlement?.careerTrialExpired ? (
        <div className="career-workspace-alert career-workspace-alert--warn" role="status">
          <div className="career-workspace-alert-copy">
            <strong>Job Hunter trial ended</strong>
            <p>Your history is read-only. Subscribe to continue scanning, building CVs, and applying.</p>
          </div>
          <Link className="career-workspace-btn career-workspace-btn--primary" to="/addons?highlight=job-hunter-functionality">
            Upgrade
          </Link>
        </div>
      ) : null}
      <CareerJobHunterNav />
      <CareerWorkspaceContext.Provider value={workspaceContext}>
        <div className="career-jh-panel">
          {loading ? <p>Loading career workspace…</p> : <Outlet />}
        </div>
      </CareerWorkspaceContext.Provider>
    </>
  );

  const settingsPanel = (
    <>
      <CareerJobHunterNav />
      <CareerWorkspaceContext.Provider value={workspaceContext}>
        <div className="career-jh-panel career-jh-panel--settings">
          <JobHunterPanel onSettingsSaved={() => void load()} />
        </div>
      </CareerWorkspaceContext.Provider>
    </>
  );

  const inner =
    gateContent ??
    (settingsOnly && !loading && careerUnlocked === false ? settingsPanel : dashboard);

  return <CareerPMailShell>{inner}</CareerPMailShell>;
}
