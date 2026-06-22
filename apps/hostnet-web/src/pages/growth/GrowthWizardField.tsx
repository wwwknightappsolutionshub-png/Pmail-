import { WIZARD_STEP_INTROS } from "./growthWizardHints";

type GrowthWizardFieldProps = {
  label: string;
  hint?: string;
  example?: string;
  full?: boolean;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
};

export function GrowthWizardField({
  label,
  hint,
  example,
  full,
  value,
  onChange,
  required,
  multiline,
  rows = 3,
  placeholder,
}: GrowthWizardFieldProps) {
  const inputId = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <label className={full ? "full" : undefined} htmlFor={inputId}>
      <span className="growth-field-label">{label}</span>
      {hint ? <span className="growth-field-hint">{hint}</span> : null}
      {multiline ? (
        <textarea
          id={inputId}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
        />
      ) : (
        <input
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
        />
      )}
      {example ? (
        <button
          type="button"
          className="growth-suggestion-btn"
          onClick={() => onChange(example)}
          title="Replace field with example text (you can edit after)"
        >
          Use suggestion
        </button>
      ) : null}
    </label>
  );
}

export function GrowthWizardStepIntro({ step }: { step: number }) {
  const intro = WIZARD_STEP_INTROS[step];
  if (!intro) return null;

  return (
    <div className="growth-step-intro">
      <strong>{intro.title}</strong>
      <p>{intro.summary}</p>
      <ul>
        {intro.tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </div>
  );
}
