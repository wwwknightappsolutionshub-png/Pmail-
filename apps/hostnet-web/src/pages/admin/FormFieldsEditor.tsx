import type { FormFieldDefinition } from "../../types/site";
import "./AdminDashboard.css";

const FIELD_TYPES: FormFieldDefinition["type"][] = ["text", "email", "tel", "textarea", "select"];

function reindex(fields: FormFieldDefinition[]): FormFieldDefinition[] {
  return fields.map((field, index) => ({ ...field, sortOrder: (index + 1) * 10 }));
}

function emptyField(index: number): FormFieldDefinition {
  return {
    key: `field_${index}`,
    label: "New field",
    type: "text",
    required: false,
    sortOrder: index * 10,
  };
}

export function FormFieldsEditor({
  fields,
  onChange,
}: {
  fields: FormFieldDefinition[];
  onChange: (fields: FormFieldDefinition[]) => void;
}) {
  function updateField(index: number, patch: Partial<FormFieldDefinition>) {
    const next = fields.map((field, i) => (i === index ? { ...field, ...patch } : field));
    onChange(reindex(next));
  }

  function removeField(index: number) {
    onChange(reindex(fields.filter((_, i) => i !== index)));
  }

  function moveField(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(reindex(next));
  }

  function addField() {
    onChange(reindex([...fields, emptyField(fields.length + 1)]));
  }

  function updateOptions(index: number, raw: string) {
    const options = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [value, ...labelParts] = line.split("|");
        const label = labelParts.join("|").trim() || value.trim();
        return { value: value.trim(), label };
      });
    updateField(index, { options });
  }

  return (
    <div className="admin-form-fields-editor">
      <div className="admin-form-fields-head">
        <strong>Form fields</strong>
        <button type="button" className="btn btn-secondary btn-sm" onClick={addField}>
          Add field
        </button>
      </div>

      {fields.length === 0 ? (
        <p className="muted">No fields yet. Add one to get started.</p>
      ) : (
        <ul className="admin-form-fields-list">
          {fields.map((field, index) => (
            <li key={`${field.key}-${index}`} className="admin-form-field-card">
              <div className="admin-form-field-card-head">
                <span className="badge">{field.type}</span>
                <div className="admin-form-field-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => moveField(index, -1)} disabled={index === 0}>
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => moveField(index, 1)}
                    disabled={index === fields.length - 1}
                  >
                    ↓
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeField(index)}>
                    Remove
                  </button>
                </div>
              </div>

              <div className="admin-form-field-grid">
                <label>
                  Key
                  <input
                    value={field.key}
                    onChange={(e) => updateField(index, { key: e.target.value.replace(/\s+/g, "_").toLowerCase() })}
                    required
                  />
                </label>
                <label>
                  Label
                  <input value={field.label} onChange={(e) => updateField(index, { label: e.target.value })} required />
                </label>
                <label>
                  Type
                  <select value={field.type} onChange={(e) => updateField(index, { type: e.target.value as FormFieldDefinition["type"] })}>
                    {FIELD_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-toggle admin-form-field-required">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(index, { required: e.target.checked })}
                  />
                  Required
                </label>
                <label>
                  Placeholder
                  <input
                    value={field.placeholder ?? ""}
                    onChange={(e) => updateField(index, { placeholder: e.target.value || undefined })}
                  />
                </label>
                <label>
                  Help text
                  <input
                    value={field.helpText ?? ""}
                    onChange={(e) => updateField(index, { helpText: e.target.value || undefined })}
                  />
                </label>
              </div>

              {field.type === "select" ? (
                <label>
                  Options (one per line: value|Label)
                  <textarea
                    rows={3}
                    className="admin-status-mono"
                    value={(field.options ?? []).map((o) => `${o.value}|${o.label}`).join("\n")}
                    onChange={(e) => updateOptions(index, e.target.value)}
                  />
                </label>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
