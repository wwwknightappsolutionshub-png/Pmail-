import type { MailProviderPreset, MailProviderPresetKey } from "../constants/mailProviders";
import { MAIL_PROVIDER_LIST } from "../constants/mailProviders";
import "./ProviderPresetPicker.css";

type Props = {
  value: MailProviderPresetKey;
  onChange: (key: MailProviderPresetKey) => void;
  idPrefix?: string;
};

function ProviderIcon({ preset }: { preset: MailProviderPreset }) {
  if (preset.key === "microsoft") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="8" height="8" fill="#f25022" />
        <rect x="13" y="3" width="8" height="8" fill="#7fba00" />
        <rect x="3" y="13" width="8" height="8" fill="#00a4ef" />
        <rect x="13" y="13" width="8" height="8" fill="#ffb900" />
      </svg>
    );
  }

  if (preset.key === "google") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.7c-.2 1.2-1 2.2-2.1 2.9v2.4h3.4c2-1.8 3-4.5 3-7.1z" />
        <path fill="#34A853" d="M12 22c2.8 0 5.2-.9 6.9-2.5l-3.4-2.4c-.9.6-2.1 1-3.5 1-2.7 0-5-1.8-5.8-4.3H3.1v2.5C4.8 19.8 8.1 22 12 22z" />
        <path fill="#FBBC05" d="M6.2 14.8c-.2-.6-.3-1.2-.3-1.8s.1-1.2.3-1.8V8.7H3.1C2.4 10.1 2 11.5 2 13s.4 2.9 1.1 4.3l3.1-2.5z" />
        <path fill="#EA4335" d="M12 6.5c1.5 0 2.8.5 3.9 1.5l2.9-2.9C17.2 3.5 14.8 2.5 12 2.5 8.1 2.5 4.8 4.7 3.1 8.7l3.1 2.5C7 8.3 9.3 6.5 12 6.5z" />
      </svg>
    );
  }

  if (preset.key === "apple") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M16.6 12.8c0-2.1 1.7-3.2 1.8-3.3-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.2.8-.7 0-1.7-.8-2.8-.8-1.4 0-2.7.8-3.4 2.1-1.5 2.5-.4 6.2 1 8.2.7 1 1.5 2 2.6 2 1 0 1.4-.7 2.7-.7 1.2 0 1.6.7 2.7.7 1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.3 1.1-2.3-.1 0-2.2-.9-2.2-3.4zM14.6 6.2c.6-.7 1-1.7.9-2.7-.8.1-1.8.5-2.4 1.2-.5.6-1 1.7-.9 2.6.9.1 1.9-.5 2.4-1.1z"
        />
      </svg>
    );
  }

  if (preset.key === "yahoo") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect width="24" height="24" rx="6" fill="#6001d2" />
        <text x="5" y="16" fill="#fff" fontSize="8" fontWeight="800">
          Y!
        </text>
      </svg>
    );
  }

  if (preset.key === "zoho") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="6" width="5" height="12" rx="1" fill="#ea4335" />
        <rect x="7" y="6" width="5" height="12" rx="1" fill="#fbbc05" />
        <rect x="12" y="6" width="5" height="12" rx="1" fill="#34a853" />
        <rect x="17" y="6" width="5" height="12" rx="1" fill="#4285f4" />
      </svg>
    );
  }

  if (preset.key === "proton") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#6d4aff" d="M4 7.2 12 3l8 4.2v5.9c0 3.7-2.7 6.7-8 8-5.3-1.3-8-4.3-8-8V7.2z" />
        <path fill="#fff" d="M8 8.2h5.1c2 0 3.4 1.3 3.4 3.1s-1.4 3.1-3.4 3.1h-2.6v2.9H8V8.2zm2.5 2.1v2h2.3c.8 0 1.2-.4 1.2-1s-.4-1-1.2-1h-2.3z" />
      </svg>
    );
  }

  if (preset.key === "aol") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect width="24" height="24" rx="6" fill="#111827" />
        <text x="3.2" y="15.7" fill="#fff" fontSize="6.5" fontWeight="800">
          AOL
        </text>
        <circle cx="19" cy="13.5" r="1.5" fill="#fff" />
      </svg>
    );
  }

  if (preset.key === "godaddy") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect width="24" height="24" rx="6" fill="#00a4a6" />
        <path fill="#fff" d="M12 6.2c2.8-2.8 7.8-.8 7.8 3.4 0 4.9-7.8 8.2-7.8 8.2S4.2 14.5 4.2 9.6c0-4.2 5-6.2 7.8-3.4z" />
        <path fill="#00a4a6" d="M8.5 11.5c0-1.6 1.3-2.8 3.1-2.8 1.1 0 2 .4 2.6 1.1l-1.1 1c-.4-.4-.8-.6-1.5-.6-.9 0-1.5.5-1.5 1.3s.6 1.3 1.5 1.3c.4 0 .8-.1 1.1-.3v-.6h-1.3v-1.2h2.8v2.5c-.7.6-1.6.9-2.7.9-1.7.1-3-1-3-2.6z" />
      </svg>
    );
  }

  if (preset.key === "hostinger") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect width="24" height="24" rx="6" fill="#673de6" />
        <path fill="#fff" d="M7 5h3v5h4V5h3v14h-3v-5h-4v5H7V5z" />
      </svg>
    );
  }

  if (preset.key === "custom") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 4a1 1 0 011 1v6h6a1 1 0 110 2h-6v6a1 1 0 11-2 0v-6H5a1 1 0 110-2h6V5a1 1 0 011-1z"
        />
      </svg>
    );
  }

  return <span className="provider-preset-picker__glyph">{preset.shortLabel || preset.label.slice(0, 2)}</span>;
}

export function ProviderPresetPicker({ value, onChange, idPrefix = "provider" }: Props) {
  return (
    <div className="provider-preset-picker" role="radiogroup" aria-label="Mail provider">
      {MAIL_PROVIDER_LIST.map((preset) => {
        const selected = value === preset.key;
        const inputId = `${idPrefix}-${preset.key}`;
        return (
          <label
            key={preset.key}
            className={`provider-preset-picker__item ${selected ? "is-selected" : ""}`}
            title={preset.label}
          >
            <input
              id={inputId}
              type="radio"
              name={`${idPrefix}-preset`}
              value={preset.key}
              checked={selected}
              onChange={() => onChange(preset.key)}
            />
            <span className="provider-preset-picker__icon">
              <ProviderIcon preset={preset} />
            </span>
            <span className="provider-preset-picker__label">{preset.label}</span>
          </label>
        );
      })}
    </div>
  );
}
