import { AUTO_RESPONSE_TEMPLATES } from "../data/autoResponseTemplates";
import "./MailViews.css";

interface AutoResponsePanelProps {
  onUseTemplate: (template: { subject: string; html: string }) => void;
}

export function AutoResponsePanel({ onUseTemplate }: AutoResponsePanelProps) {
  return (
    <div className="mail-view-panel">
      <header className="mail-view-header">
        <h2>Auto response</h2>
        <p>Sample email templates you can use for automatic or quick replies.</p>
      </header>
      <div className="mail-template-grid">
        {AUTO_RESPONSE_TEMPLATES.map((template) => (
          <article key={template.id} className="mail-template-card">
            <h3>{template.name}</h3>
            <p className="mail-template-desc">{template.description}</p>
            <p className="mail-template-subject">
              <strong>Subject:</strong> {template.subject}
            </p>
            <div
              className="mail-template-preview"
              dangerouslySetInnerHTML={{ __html: template.bodyHtml }}
            />
            <button
              type="button"
              className="mail-toolbar-btn"
              onClick={() =>
                onUseTemplate({ subject: template.subject, html: template.bodyHtml })
              }
            >
              Use template
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}
