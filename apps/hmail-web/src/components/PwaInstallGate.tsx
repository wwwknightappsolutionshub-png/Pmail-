import { HMailLogo } from "./HMailLogo";
import { usePwaInstall } from "../hooks/usePwaInstall";
import "./PwaInstallGate.css";

type PwaInstallGateProps = {
  children: React.ReactNode;
};

export function PwaInstallGate({ children }: PwaInstallGateProps) {
  const {
    promptVisible,
    promptMode,
    canPromptInstall,
    needsManualInstall,
    installing,
    installError,
    isIos,
    isAndroid,
    triggerInstall,
    dismissPrompt,
    continueAfterInstall,
    continueInBrowser,
  } = usePwaInstall();

  return (
    <>
      {children}
      {promptVisible ? (
        <div className="pwa-install-root">
          <div
            className="pwa-install-screen"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
          >
            <div className="pwa-install-card">
              <button
                type="button"
                className="pwa-install-dismiss"
                onClick={dismissPrompt}
                aria-label="Dismiss install prompt"
              >
                ×
              </button>

              <div className="pwa-install-brand">
                <HMailLogo size="lg" className="pwa-install-logo" />
                <h1 id="pwa-install-title">Install Pmail+</h1>
                <p className="pwa-install-lead">
                  Experience mailing with extra addons and ease of access
                </p>
                {promptMode === "exit-intent" ? (
                  <p className="pwa-install-kicker">Before you go — add PMail+ to your home screen</p>
                ) : null}
              </div>

              {canPromptInstall ? (
                <button
                  type="button"
                  className="pwa-install-btn"
                  onClick={() => void triggerInstall()}
                  disabled={installing}
                >
                  {installing ? "Opening install…" : "Install now"}
                </button>
              ) : null}

              {needsManualInstall ? (
                <div className="pwa-install-manual">
                  <p className="pwa-install-manual-lead">
                    {isIos
                      ? "On iPhone and iPad, add PMail+ from Safari’s Share menu:"
                      : "Add PMail+ to your home screen from your browser menu:"}
                  </p>
                  {isIos ? (
                    <ol className="pwa-install-steps">
                      <li>
                        Tap the <strong>Share</strong> button in Safari.
                      </li>
                      <li>
                        Choose <strong>Add to Home Screen</strong>.
                      </li>
                      <li>Open PMail+ from your new home screen icon.</li>
                    </ol>
                  ) : isAndroid ? (
                    <ol className="pwa-install-steps">
                      <li>Open the browser menu (⋮).</li>
                      <li>
                        Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                      </li>
                      <li>Launch PMail+ from the home screen shortcut.</li>
                    </ol>
                  ) : (
                    <ol className="pwa-install-steps">
                      <li>Use your browser menu to install or add this site to your home screen.</li>
                      <li>Re-open PMail+ from the installed icon.</li>
                    </ol>
                  )}
                </div>
              ) : null}

              {installError ? <p className="pwa-install-error">{installError}</p> : null}

              <div className="pwa-install-actions">
                {needsManualInstall ? (
                  <button
                    type="button"
                    className="pwa-install-btn pwa-install-btn--continue"
                    onClick={continueAfterInstall}
                  >
                    {isIos ? "I've added PMail+ — continue" : "Continue in browser"}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="pwa-install-btn pwa-install-btn--ghost"
                  onClick={continueInBrowser}
                >
                  Continue without installing
                </button>
              </div>

              <p className="pwa-install-note">
                {canPromptInstall
                  ? "Install PMail+ for full-screen mail, workspace tools, and push notifications."
                  : "Add PMail+ to your home screen for the fastest access to mail and workspace add-ons."}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
