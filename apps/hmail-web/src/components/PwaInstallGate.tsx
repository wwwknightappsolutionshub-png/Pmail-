import { HMailLogo } from "./HMailLogo";
import { usePwaInstall } from "../hooks/usePwaInstall";
import "./PwaInstallGate.css";

type PwaInstallGateProps = {
  children: React.ReactNode;
};

export function PwaInstallGate({ children }: PwaInstallGateProps) {
  const {
    gateActive,
    canPromptInstall,
    installing,
    installError,
    isIos,
    isAndroid,
    triggerInstall,
  } = usePwaInstall();

  if (!gateActive) {
    return <>{children}</>;
  }

  return (
    <div className="pwa-install-root">
      <div className="pwa-install-screen" role="dialog" aria-modal="true" aria-labelledby="pwa-install-title">
        <div className="pwa-install-card">
          <div className="pwa-install-brand">
            <HMailLogo size="lg" className="pwa-install-logo" />
            <p className="pwa-install-kicker">Prohost Cloud</p>
            <h1 id="pwa-install-title">Install PMail+ to continue</h1>
            <p className="pwa-install-lead">
              PMail+ is optimized as an installed app on phones. Add it to your home screen to open mail,
              workspace tools, and notifications in full-screen mode.
            </p>
          </div>

          {canPromptInstall ? (
            <button type="button" className="pwa-install-btn" onClick={() => void triggerInstall()} disabled={installing}>
              {installing ? "Opening install…" : "Install PMail+"}
            </button>
          ) : null}

          {installError ? <p className="pwa-install-error">{installError}</p> : null}

          {isIos ? (
            <ol className="pwa-install-steps">
              <li>Tap the <strong>Share</strong> button in Safari.</li>
              <li>Choose <strong>Add to Home Screen</strong>.</li>
              <li>Open PMail+ from your new home screen icon.</li>
            </ol>
          ) : isAndroid ? (
            <ol className="pwa-install-steps">
              <li>Open the browser menu (⋮).</li>
              <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
              <li>Launch PMail+ from the home screen shortcut.</li>
            </ol>
          ) : (
            <ol className="pwa-install-steps">
              <li>Use your browser menu to install or add this site to your home screen.</li>
              <li>Re-open PMail+ from the installed icon.</li>
            </ol>
          )}

          <p className="pwa-install-note">
            After you sign in, install PMail+ and reopen it from your home screen to access mail and workspace tools.
          </p>
        </div>
      </div>
    </div>
  );
}
