import "./LoginAuthToast.css";

type LoginAuthToastProps = {
  title: string;
  message: string;
  onDismiss: () => void;
};

export function LoginAuthToast({ title, message, onDismiss }: LoginAuthToastProps) {
  return (
    <div
      className="login-auth-toast-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="login-auth-toast-title"
      aria-describedby="login-auth-toast-message"
    >
      <div className="login-auth-toast">
        <div className="login-auth-toast-copy">
          <strong id="login-auth-toast-title">{title}</strong>
          <p id="login-auth-toast-message" className="login-auth-toast-subtitle">
            {message}
          </p>
        </div>
        <div className="login-auth-toast-actions">
          <button type="button" className="login-auth-toast-primary" onClick={onDismiss}>
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
