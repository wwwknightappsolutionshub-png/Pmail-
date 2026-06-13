import { SAMPLE_SCHEDULED_MESSAGES } from "../data/autoResponseTemplates";
import "./MailViews.css";

function formatScheduled(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ScheduledPanel() {
  return (
    <div className="mail-view-panel">
      <header className="mail-view-header">
        <h2>Scheduled</h2>
        <p>Messages queued to send later. Scheduling uses sample data until send-later is connected.</p>
      </header>
      <div className="mail-scheduled-list">
        {SAMPLE_SCHEDULED_MESSAGES.length === 0 ? (
          <p className="mail-view-empty">No scheduled messages.</p>
        ) : (
          SAMPLE_SCHEDULED_MESSAGES.map((item) => (
            <article key={item.id} className="mail-scheduled-card">
              <div className="mail-scheduled-top">
                <strong>{item.subject}</strong>
                <span className="mail-scheduled-badge">{item.status}</span>
              </div>
              <p>
                <strong>To:</strong> {item.to}
              </p>
              <p>
                <strong>Sends:</strong> {formatScheduled(item.scheduledFor)}
              </p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
