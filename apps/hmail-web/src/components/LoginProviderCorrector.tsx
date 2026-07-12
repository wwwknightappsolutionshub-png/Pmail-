import { ProviderPresetPicker } from "./ProviderPresetPicker";
import type { MailProviderPresetKey } from "../constants/mailProviders";
import "./LoginProviderCorrector.css";
import "./ProviderPresetPicker.css";

type LoginProviderCorrectorProps = {
  value: MailProviderPresetKey | null;
  onSelect: (key: MailProviderPresetKey) => void;
  onDismiss: () => void;
};

export function LoginProviderCorrector({ value, onSelect, onDismiss }: LoginProviderCorrectorProps) {
  return (
    <div
      className="login-provider-corrector-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-provider-corrector-title"
    >
      <div className="login-provider-corrector">
        <div className="login-provider-corrector-copy">
          <strong id="login-provider-corrector-title">WHO IS YOUR CURRENT EMAIL PROVIDER?</strong>
          <p className="login-provider-corrector-subtitle">
            Confirm or correct the service that hosts your mailbox so we can apply the right settings.
          </p>
        </div>
        <ProviderPresetPicker value={value} onChange={onSelect} idPrefix="login-provider-corrector" />
        <div className="login-provider-corrector-actions">
          <button type="button" className="login-provider-corrector-dismiss" onClick={onDismiss}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
