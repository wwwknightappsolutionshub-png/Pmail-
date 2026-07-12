import { useCallback, useMemo, useState } from "react";
import { HMailLogo } from "./HMailLogo";
import {
  isIosSafari,
  isStandaloneDisplayMode,
  markIosPwaWizardDone,
  openCurrentUrlInSafariBestEffort,
  saveIosPwaWizardState,
  type IosPwaWizardStep,
} from "../utils/pwaPlatform";
import "./IosPwaInstallWizard.css";
import "./PwaInstallGate.css";

type IosPwaInstallWizardProps = {
  initialStep: IosPwaWizardStep;
  onDismiss: () => void;
  onComplete: () => void;
};

const STEP_ORDER: IosPwaWizardStep[] = [
  "welcome",
  "open-safari",
  "add-home",
  "open-icon",
  "notifications",
];

function resolveNextStep(current: IosPwaWizardStep): IosPwaWizardStep | null {
  if (current === "welcome") {
    return isIosSafari() ? "add-home" : "open-safari";
  }
  if (current === "open-safari") return "add-home";
  if (current === "add-home") return "open-icon";
  if (current === "open-icon") return "notifications";
  return null;
}

function visibleStepsForProgress(step: IosPwaWizardStep): IosPwaWizardStep[] {
  if (isIosSafari() || step === "welcome") {
    return STEP_ORDER.filter((item) => item !== "open-safari" || !isIosSafari());
  }
  return STEP_ORDER;
}

function AddHomeScreenGuideVisuals() {
  return (
    <div className="ios-pwa-guide" aria-hidden="true">
      <div className="ios-pwa-guide-block">
        <p className="ios-pwa-guide-caption">1. Tap ⋯ at the bottom of the browser</p>
        <div className="ios-pwa-mock-browser-bar">
          <span className="ios-pwa-mock-browser-icon" aria-hidden="true">
            ‹
          </span>
          <span className="ios-pwa-mock-browser-icon" aria-hidden="true">
            ≡
          </span>
          <span className="ios-pwa-mock-browser-url">mail.prohost.cloud</span>
          <span className="ios-pwa-mock-browser-icon" aria-hidden="true">
            ↻
          </span>
          <span className="ios-pwa-mock-browser-more ios-pwa-mock-highlight" aria-hidden="true">
            ⋯
          </span>
        </div>
      </div>

      <div className="ios-pwa-guide-block">
        <p className="ios-pwa-guide-caption">2. Choose Share</p>
        <div className="ios-pwa-mock-menu">
          <div className="ios-pwa-mock-menu-row">Find on Page</div>
          <div className="ios-pwa-mock-menu-row ios-pwa-mock-highlight-row">
            <span>Share</span>
            <span className="ios-pwa-mock-menu-chevron">›</span>
          </div>
          <div className="ios-pwa-mock-menu-row">Add to Reading List</div>
        </div>
      </div>

      <div className="ios-pwa-guide-block">
        <p className="ios-pwa-guide-caption">3. Tap View More</p>
        <div className="ios-pwa-mock-share-actions">
          <div className="ios-pwa-mock-share-action">
            <span className="ios-pwa-mock-share-circle">⎘</span>
            <span>Copy</span>
          </div>
          <div className="ios-pwa-mock-share-action">
            <span className="ios-pwa-mock-share-circle">✎</span>
            <span>Markup</span>
          </div>
          <div className="ios-pwa-mock-share-action">
            <span className="ios-pwa-mock-share-circle">Bookmark</span>
            <span>Add to Bookmarks</span>
          </div>
          <div className="ios-pwa-mock-share-action ios-pwa-mock-highlight-action">
            <span className="ios-pwa-mock-share-circle ios-pwa-mock-share-circle--accent">∨</span>
            <span>View More</span>
          </div>
        </div>
      </div>

      <div className="ios-pwa-guide-block">
        <p className="ios-pwa-guide-caption">4. Tap Add to Home Screen</p>
        <div className="ios-pwa-mock-menu">
          <div className="ios-pwa-mock-menu-row">Add to Favourites</div>
          <div className="ios-pwa-mock-menu-row">Find on Page</div>
          <div className="ios-pwa-mock-menu-row ios-pwa-mock-highlight-row">
            <span className="ios-pwa-mock-home-icon" aria-hidden="true">
              +
            </span>
            <span>Add to Home Screen</span>
          </div>
          <div className="ios-pwa-mock-menu-row">Print</div>
        </div>
      </div>
    </div>
  );
}

export function IosPwaInstallWizard({
  initialStep,
  onDismiss,
  onComplete,
}: IosPwaInstallWizardProps) {
  const [step, setStep] = useState<IosPwaWizardStep>(initialStep);
  const [openIconError, setOpenIconError] = useState("");
  const [notificationError, setNotificationError] = useState("");
  const [notificationBusy, setNotificationBusy] = useState(false);

  const progressSteps = useMemo(() => visibleStepsForProgress(step), [step]);
  const progressIndex = Math.max(0, progressSteps.indexOf(step));

  const persistStep = useCallback((next: IosPwaWizardStep) => {
    saveIosPwaWizardState({ status: "in_progress", step: next });
    setStep(next);
  }, []);

  const goNext = useCallback(() => {
    const next = resolveNextStep(step);
    if (!next) return;
    setOpenIconError("");
    setNotificationError("");
    persistStep(next);
  }, [persistStep, step]);

  const finishWizard = useCallback(() => {
    markIosPwaWizardDone();
    onComplete();
  }, [onComplete]);

  const onOpenInSafariClick = useCallback(() => {
    openCurrentUrlInSafariBestEffort();
  }, []);

  const onConfirmOpenedFromHome = useCallback(() => {
    if (!isStandaloneDisplayMode()) {
      setOpenIconError(
        "PMail+ is still open in the browser. Close this tab, then tap the PMail+ icon on your Home Screen and return here.",
      );
      return;
    }
    setOpenIconError("");
    persistStep("notifications");
  }, [persistStep]);

  const onAllowNotifications = useCallback(async () => {
    setNotificationBusy(true);
    setNotificationError("");
    try {
      if (typeof Notification === "undefined") {
        finishWizard();
        return;
      }
      await Notification.requestPermission();
      finishWizard();
    } catch {
      setNotificationError("Notification permission could not be requested on this device.");
    } finally {
      setNotificationBusy(false);
    }
  }, [finishWizard]);

  return (
    <div className="pwa-install-root">
      <div
        className="pwa-install-screen"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ios-pwa-wizard-title"
      >
        <div className="pwa-install-card">
          <button
            type="button"
            className="pwa-install-dismiss"
            onClick={onDismiss}
            aria-label="Dismiss install wizard"
          >
            ×
          </button>

          <div className="pwa-install-brand">
            <HMailLogo size="lg" className="pwa-install-logo" />
          </div>

          <div className="ios-pwa-wizard-progress" aria-hidden="true">
            {progressSteps.map((item, index) => (
              <span
                key={item}
                className={[
                  "ios-pwa-wizard-dot",
                  index === progressIndex ? "ios-pwa-wizard-dot--active" : "",
                  index < progressIndex ? "ios-pwa-wizard-dot--done" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            ))}
          </div>

          {step === "welcome" ? (
            <>
              <p className="ios-pwa-wizard-step-label">Welcome</p>
              <h1 id="ios-pwa-wizard-title" className="ios-pwa-wizard-title">
                Welcome to PMail+
              </h1>
              <div className="ios-pwa-wizard-body">
                <p>
                  Welcome to the next generation of bespoke mailing experience. We observed you are an
                  iOS user, thus we&apos;d guide you on how to get started the easy way.
                </p>
                <p>
                  PMail+ is not another email provider but that one level up layer to your current
                  mailing experience. No need to create a new email account — you simply switch and
                  plug in new features.
                </p>
              </div>
              <div className="ios-pwa-wizard-actions">
                <button type="button" className="pwa-install-btn" onClick={goNext}>
                  Continue to Step 1
                </button>
              </div>
            </>
          ) : null}

          {step === "open-safari" ? (
            <>
              <p className="ios-pwa-wizard-step-label">Step 1</p>
              <h1 id="ios-pwa-wizard-title" className="ios-pwa-wizard-title">
                Open PMail+ in Safari
              </h1>
              <div className="ios-pwa-wizard-body">
                <p>
                  Add to Home Screen works in Safari. If you opened this link from WhatsApp, Instagram,
                  Chrome, or another app, open it in Safari first.
                </p>
              </div>
              <div className="ios-pwa-wizard-visual">
                <ol className="ios-pwa-wizard-steps">
                  <li>
                    Tap <strong>Open in Safari</strong> below (best effort), or
                  </li>
                  <li>
                    Tap the <strong>⋯</strong> or share controls in this browser and choose{" "}
                    <strong>Open in Safari</strong>.
                  </li>
                </ol>
                <p className="ios-pwa-wizard-hint">
                  If the button does not leave this browser, use the browser&apos;s own Open in Safari
                  option.
                </p>
              </div>
              <div className="ios-pwa-wizard-actions">
                <button type="button" className="pwa-install-btn" onClick={onOpenInSafariClick}>
                  Open in Safari
                </button>
                <button
                  type="button"
                  className="pwa-install-btn pwa-install-btn--continue"
                  onClick={goNext}
                >
                  I&apos;m in Safari — continue
                </button>
              </div>
            </>
          ) : null}

          {step === "add-home" ? (
            <>
              <p className="ios-pwa-wizard-step-label">
                {isIosSafari() ? "Step 1" : "Step 2"}
              </p>
              <h1 id="ios-pwa-wizard-title" className="ios-pwa-wizard-title">
                Add PMail+ to Home Screen
              </h1>
              <div className="ios-pwa-wizard-body">
                <p>
                  Tap the <strong>⋯</strong> below in your browser, then choose <strong>Share</strong>,
                  then <strong>View More</strong>, then <strong>Add to Home Screen</strong>.
                </p>
              </div>
              <div className="ios-pwa-wizard-visual ios-pwa-wizard-visual--guide">
                <ol className="ios-pwa-wizard-steps">
                  <li>
                    Tap the <strong>⋯</strong> at the bottom of the browser.
                  </li>
                  <li>
                    Select <strong>Share</strong>.
                  </li>
                  <li>
                    Tap <strong>View More</strong>.
                  </li>
                  <li>
                    Tap <strong>Add to Home Screen</strong>, then confirm <strong>Add</strong>.
                  </li>
                </ol>
                <AddHomeScreenGuideVisuals />
              </div>
              <div className="ios-pwa-wizard-actions">
                <button type="button" className="pwa-install-btn" onClick={goNext}>
                  I added PMail+ to Home Screen
                </button>
              </div>
            </>
          ) : null}

          {step === "open-icon" ? (
            <>
              <p className="ios-pwa-wizard-step-label">
                {isIosSafari() ? "Step 2" : "Step 3"}
              </p>
              <h1 id="ios-pwa-wizard-title" className="ios-pwa-wizard-title">
                Open PMail+ from Home Screen
              </h1>
              <div className="ios-pwa-wizard-body">
                <p>
                  Leave the browser, find the new <strong>PMail+</strong> icon on your Home Screen, and
                  open it. Then return to this step and continue.
                </p>
              </div>
              <div className="ios-pwa-wizard-visual">
                <ol className="ios-pwa-wizard-steps">
                  <li>Go to your Home Screen.</li>
                  <li>
                    Tap the <strong>PMail+</strong> icon.
                  </li>
                  <li>Come back to this guide in the installed app and tap the button below.</li>
                </ol>
              </div>
              {openIconError ? <p className="ios-pwa-wizard-error">{openIconError}</p> : null}
              <div className="ios-pwa-wizard-actions">
                <button type="button" className="pwa-install-btn" onClick={onConfirmOpenedFromHome}>
                  I opened PMail+ from Home Screen
                </button>
              </div>
            </>
          ) : null}

          {step === "notifications" ? (
            <>
              <p className="ios-pwa-wizard-step-label">
                {isIosSafari() ? "Step 3" : "Step 4"}
              </p>
              <h1 id="ios-pwa-wizard-title" className="ios-pwa-wizard-title">
                Allow notifications
              </h1>
              <div className="ios-pwa-wizard-body">
                <p>
                  Allow notifications so PMail+ can alert you about important mail activity on this
                  device.
                </p>
              </div>
              {notificationError ? (
                <p className="ios-pwa-wizard-error">{notificationError}</p>
              ) : null}
              <div className="ios-pwa-wizard-actions">
                <button
                  type="button"
                  className="pwa-install-btn"
                  disabled={notificationBusy}
                  onClick={() => void onAllowNotifications()}
                >
                  {notificationBusy ? "Requesting…" : "Allow notifications"}
                </button>
                <button type="button" className="ios-pwa-wizard-not-now" onClick={finishWizard}>
                  Not now
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
