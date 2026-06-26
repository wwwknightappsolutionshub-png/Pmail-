import "./LoginProviderSelectToast.css";

type LoginProviderSelectToastProps = {
  onDismiss: () => void;
};

export function LoginProviderSelectToast({ onDismiss }: LoginProviderSelectToastProps) {
  return (
    <div
      className="login-provider-select-toast-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-provider-select-toast-title"
    >
      <div className="login-provider-select-toast">
        <div className="login-provider-select-toast-copy">
          <strong id="login-provider-select-toast-title">HOORAY !!</strong>
          <p className="login-provider-select-toast-subtitle">
            Please select your current email provider from the list below
          </p>
        </div>
        <div className="login-provider-select-toast-actions">
          <button type="button" className="login-provider-select-toast-primary" onClick={onDismiss}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
