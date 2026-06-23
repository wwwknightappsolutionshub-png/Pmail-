import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import "./WorkspaceRemindersPanel.css";

type Filter = "all" | "pending" | "done";

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  pending: "Pending",
  done: "Done",
};

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  call: "Call",
  meeting: "Meeting",
  sms: "SMS",
};

const emptyForm = {
  title: "",
  dueAt: "",
  crmRecordId: "",
  channel: "email",
};

function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loader());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

function formatDueLabel(dueAt: string): string {
  const due = new Date(dueAt);
  const now = new Date();
  const sameDay =
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate();
  const time = due.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today ${time}`;
  return due.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isOverdue(dueAt: string, status: string): boolean {
  return status !== "done" && new Date(dueAt) < new Date();
}

export function WorkspaceRemindersPanel() {
  const [filter, setFilter] = useState<Filter>("all");
  const { data, loading, error, refresh } = useLoad(
    () => api.workspaceReminders(filter === "all" ? undefined : filter).then((r) => r.reminders),
    [filter],
  );
  const { data: contacts } = useLoad(() => api.workspaceCrm().then((r) => r.records));
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const reminders = data ?? [];

  const resetForm = () => {
    setForm(emptyForm);
    setShowForm(false);
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.dueAt) return;
    await api.createWorkspaceReminder({
      title: form.title.trim(),
      dueAt: form.dueAt,
      crmRecordId: form.crmRecordId || undefined,
      channel: form.channel,
    });
    resetForm();
    await refresh();
  };

  const toggleDone = async (id: string, status: string) => {
    await api.updateWorkspaceReminder(id, { status: status === "done" ? "pending" : "done" });
    await refresh();
  };

  const remove = async (id: string) => {
    await api.deleteWorkspaceReminder(id);
    await refresh();
  };

  return (
    <div className="mail-view-panel reminders-panel">
      <header className="reminders-toolbar">
        <div>
          <h2 className="reminders-title">Reminders</h2>
          <p className="reminders-subtitle">Workspace follow-ups</p>
        </div>
        {!showForm ? (
          <button type="button" className="reminders-primary-btn" onClick={() => setShowForm(true)}>
            New reminder
          </button>
        ) : null}
      </header>

      <div className="reminders-filter-tabs" role="tablist" aria-label="Reminder filters">
        {(["all", "pending", "done"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={filter === tab}
            className={filter === tab ? "is-active" : ""}
            onClick={() => setFilter(tab)}
          >
            {FILTER_LABELS[tab]}
          </button>
        ))}
      </div>

      <div className="reminders-count-row">
        <span className="reminders-status">{loading ? "Loading…" : `${reminders.length} shown`}</span>
        <span className="reminders-count">{reminders.length}</span>
      </div>

      {showForm ? (
        <form className="reminders-composer" onSubmit={(e) => void create(e)}>
          <div className="reminders-composer-head">
            <h3>New reminder</h3>
            <button type="button" className="reminders-icon-btn" aria-label="Close form" onClick={resetForm}>
              ×
            </button>
          </div>
          <div className="reminders-form-grid">
            <label className="reminders-field reminders-field--full">
              <span>Title</span>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="reminders-field">
              <span>Due</span>
              <input
                required
                type="datetime-local"
                value={form.dueAt}
                onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
              />
            </label>
            <label className="reminders-field">
              <span>Channel</span>
              <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                <option value="email">Email</option>
                <option value="call">Call</option>
                <option value="meeting">Meeting</option>
                <option value="sms">SMS</option>
              </select>
            </label>
            <label className="reminders-field reminders-field--full">
              <span>Contact</span>
              <select value={form.crmRecordId} onChange={(e) => setForm({ ...form, crmRecordId: e.target.value })}>
                <option value="">None</option>
                {(contacts ?? []).map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="reminders-form-actions">
            <button type="submit" className="reminders-primary-btn">
              Add reminder
            </button>
            <button type="button" className="reminders-secondary-btn" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {error ? <p className="mail-view-error">{error}</p> : null}

      {!loading && reminders.length === 0 ? (
        <p className="reminders-empty">
          {filter === "all" ? "No reminders yet." : `No ${filter} reminders.`}
        </p>
      ) : (
        <ul className="reminders-list">
          {reminders.map((row) => {
            const overdue = isOverdue(row.dueAt, row.status);
            const done = row.status === "done";
            return (
              <li
                key={row.id}
                className={`reminders-card${done ? " is-done" : ""}${overdue ? " is-overdue" : ""}`}
              >
                <button
                  type="button"
                  className={`reminders-check-btn${done ? " is-checked" : ""}`}
                  aria-label={done ? "Mark pending" : "Mark done"}
                  onClick={() => void toggleDone(row.id, row.status)}
                >
                  {done ? "✓" : ""}
                </button>
                <div className="reminders-card-body">
                  <strong className="reminders-card-title">{row.title}</strong>
                  <span className={`reminders-card-meta${overdue ? " is-overdue" : ""}`}>
                    {overdue ? "Overdue · " : ""}
                    {formatDueLabel(row.dueAt)}
                    {row.crmRecord ? ` · ${row.crmRecord.name}` : ""}
                  </span>
                </div>
                <div className="reminders-card-side">
                  <span className="reminders-channel-pill">{CHANNEL_LABELS[row.channel] ?? row.channel}</span>
                  <button type="button" className="reminders-text-btn" onClick={() => void remove(row.id)}>
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
