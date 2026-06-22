import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import "./CalendarPanel.css";

type CalendarEventRow = {
  id: string;
  title: string;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  location: string | null;
  notes: string | null;
  syncSource?: string;
};

type ReminderTrigger = {
  id: string;
  label: string;
  daysBefore: number;
  hoursBefore: number;
  channel: "email" | "in-app";
};

type ReminderSequence = {
  id: string;
  name: string;
  crmRecordId?: string | null;
  active: boolean;
  triggers: ReminderTrigger[];
};

type CalendarSettings = {
  googleConnected: boolean;
  microsoftConnected: boolean;
  lastSyncAt: string | null;
  capacityHoursPerWeek: number;
  reminderSequences: ReminderSequence[];
};

type CapacityMember = {
  userId: string;
  displayName: string;
  email: string;
  eventCount: number;
  hoursBooked: number;
  hoursAvailable: number;
  utilization: number;
  coverage: "ok" | "medium" | "high";
};

type EnterprisePanel = "sync" | "reminder-sequences" | "capacity" | null;

function eventDateKey(iso: string): string {
  return iso.slice(0, 10);
}

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

  return { data, loading, error, refresh, setData };
}

export function CalendarPanel() {
  const [cursorDate, setCursorDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [enterprisePanel, setEnterprisePanel] = useState<EnterprisePanel>(null);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    title: "",
    date: new Date().toISOString().slice(0, 10),
    startTime: "09:00",
    endTime: "10:00",
    allDay: false,
    location: "",
    notes: "",
  });

  const range = useMemo(() => {
    const cursor = new Date(`${cursorDate}T00:00:00`);
    if (viewMode === "week") {
      const day = cursor.getDay();
      const start = new Date(cursor);
      start.setDate(cursor.getDate() - day);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { from: start.toISOString(), to: end.toISOString() };
    }
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  }, [cursorDate, viewMode]);

  const {
    data: events,
    loading: eventsLoading,
    error: eventsError,
    refresh: refreshEvents,
  } = useLoad(() => api.workspaceCalendar(range.from, range.to).then((r) => r.events as CalendarEventRow[]), [
    range.from,
    range.to,
  ]);

  const {
    data: settings,
    loading: settingsLoading,
    error: settingsError,
    refresh: refreshSettings,
    setData: setSettings,
  } = useLoad(() => api.workspaceCalendarSettings().then((r) => r.settings as CalendarSettings), []);

  const {
    data: capacity,
    loading: capacityLoading,
    refresh: refreshCapacity,
  } = useLoad(
    () => api.workspaceCalendarCapacity(range.from).then((r) => r.members as CapacityMember[]),
    [range.from],
  );

  const visibleDays = useMemo(() => {
    const cursor = new Date(`${cursorDate}T00:00:00`);
    const list = events ?? [];
    if (viewMode === "week") {
      const day = cursor.getDay();
      const start = new Date(cursor);
      start.setDate(cursor.getDate() - day);
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        const dateKey = date.toISOString().slice(0, 10);
        return {
          key: dateKey,
          day: String(date.getDate()),
          events: list.filter((event) => eventDateKey(event.startAt) === dateKey),
        };
      });
    }
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const leadingBlanks = monthStart.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    return [
      ...Array.from({ length: leadingBlanks }, (_, index) => ({
        key: `blank-${index}`,
        day: "",
        events: [] as CalendarEventRow[],
      })),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const dateKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return {
          key: dateKey,
          day: String(day),
          events: list.filter((event) => eventDateKey(event.startAt) === dateKey),
        };
      }),
    ];
  }, [cursorDate, events, viewMode]);

  const periodLabel = new Date(`${cursorDate}T00:00:00`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    ...(viewMode === "week" ? { day: "numeric" } : {}),
  });

  const syncedEventCount = (events ?? []).filter((event) => event.syncSource && event.syncSource !== "local").length;

  const shiftPeriod = (delta: number) => {
    const cursor = new Date(`${cursorDate}T00:00:00`);
    if (viewMode === "week") cursor.setDate(cursor.getDate() + delta * 7);
    else cursor.setMonth(cursor.getMonth() + delta);
    setCursorDate(cursor.toISOString().slice(0, 10));
  };

  const refreshAll = async () => {
    await Promise.all([refreshEvents(), refreshSettings(), refreshCapacity()]);
  };

  const createEvent = async () => {
    const startAt = form.allDay
      ? `${form.date}T00:00:00.000Z`
      : new Date(`${form.date}T${form.startTime}:00`).toISOString();
    const endAt = form.allDay ? null : new Date(`${form.date}T${form.endTime}:00`).toISOString();
    await api.createCalendarEvent({
      title: form.title,
      startAt,
      endAt: endAt ?? undefined,
      allDay: form.allDay,
      location: form.location || undefined,
      notes: form.notes || undefined,
    });
    setForm((current) => ({ ...current, title: "", location: "", notes: "" }));
    setNotice("Event added");
    await refreshAll();
  };

  const removeEvent = async (id: string) => {
    await api.deleteCalendarEvent(id);
    await refreshAll();
  };

  const toggleProvider = async (provider: "google" | "microsoft", connected: boolean) => {
    const result = connected
      ? await api.connectCalendarProvider(provider)
      : await api.disconnectCalendarProvider(provider);
    setSettings(result.settings as CalendarSettings);
    setNotice(connected ? `${provider === "google" ? "Google" : "Microsoft"} connected` : "Provider disconnected");
    await refreshAll();
  };

  const runSync = async () => {
    const result = await api.syncCalendarProviders();
    setSettings(result.settings as CalendarSettings);
    setNotice("Calendar synced");
    await refreshAll();
  };

  const toggleSequence = async (sequenceId: string) => {
    if (!settings) return;
    const sequences = settings.reminderSequences.map((sequence) =>
      sequence.id === sequenceId ? { ...sequence, active: !sequence.active } : sequence,
    );
    const result = await api.updateCalendarReminderSequences(sequences);
    setSettings(result.settings as CalendarSettings);
    setNotice("Reminder sequences updated");
  };

  const loading = eventsLoading || settingsLoading;
  const error = eventsError || settingsError;

  return (
    <div className="mail-view-panel calendar-panel">
      <header className="mail-view-header">
        <h2>Full calendar</h2>
        <p>Month and week views with provider sync, reminder sequences, and team capacity.</p>
      </header>

      {notice ? <p className="calendar-panel-notice">{notice}</p> : null}

      <div className="calendar-panel-toolbar">
        <button type="button" className="mail-toolbar-btn" onClick={() => shiftPeriod(-1)}>
          Previous
        </button>
        <strong>{periodLabel}</strong>
        <button type="button" className="mail-toolbar-btn" onClick={() => shiftPeriod(1)}>
          Next
        </button>
        <button type="button" className={`mail-toolbar-btn ${viewMode === "month" ? "is-active" : ""}`} onClick={() => setViewMode("month")}>
          Month
        </button>
        <button type="button" className={`mail-toolbar-btn ${viewMode === "week" ? "is-active" : ""}`} onClick={() => setViewMode("week")}>
          Week
        </button>
        <span className="calendar-panel-stat">{syncedEventCount} synced events</span>
      </div>

      <section className="calendar-enterprise-actions">
        {(
          [
            { id: "sync" as const, label: "Calendar sync" },
            { id: "reminder-sequences" as const, label: "Automated reminder sequences" },
            { id: "capacity" as const, label: "Team capacity" },
          ] as const
        ).map((feature) => (
          <button
            key={feature.id}
            type="button"
            className={`calendar-enterprise-action ${enterprisePanel === feature.id ? "is-active" : ""}`}
            onClick={() => setEnterprisePanel((current) => (current === feature.id ? null : feature.id))}
          >
            <span>{feature.label}</span>
            <small>Available</small>
          </button>
        ))}
      </section>

      {enterprisePanel === "sync" && settings ? (
        <section className="calendar-enterprise-panel">
          <h3>Calendar sync</h3>
          <div className="calendar-sync-actions">
            <button
              type="button"
              className={`mail-toolbar-btn ${settings.googleConnected ? "is-active" : ""}`}
              onClick={() => void toggleProvider("google", !settings.googleConnected)}
            >
              {settings.googleConnected ? "Disconnect Google" : "Connect Google"}
            </button>
            <button
              type="button"
              className={`mail-toolbar-btn ${settings.microsoftConnected ? "is-active" : ""}`}
              onClick={() => void toggleProvider("microsoft", !settings.microsoftConnected)}
            >
              {settings.microsoftConnected ? "Disconnect Microsoft" : "Connect Microsoft"}
            </button>
            <button type="button" className="mail-toolbar-btn" onClick={() => void runSync()}>
              Sync now
            </button>
          </div>
          <p className="muted">
            {settings.lastSyncAt
              ? `Last sync ${new Date(settings.lastSyncAt).toLocaleString()}`
              : "No sync run yet"}
          </p>
        </section>
      ) : null}

      {enterprisePanel === "reminder-sequences" && settings ? (
        <section className="calendar-enterprise-panel">
          <h3>Automated client reminder sequences</h3>
          <div className="feature-list">
            {settings.reminderSequences.map((sequence) => (
              <article key={sequence.id} className="feature-list-card">
                <strong>{sequence.name}</strong>
                <p>{sequence.triggers.length} triggers · {sequence.active ? "Active" : "Paused"}</p>
                <button type="button" className="mail-toolbar-btn" onClick={() => void toggleSequence(sequence.id)}>
                  {sequence.active ? "Pause" : "Activate"}
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {enterprisePanel === "capacity" ? (
        <section className="calendar-enterprise-panel">
          <h3>Team capacity</h3>
          {capacityLoading ? <p className="mail-view-empty">Loading capacity…</p> : null}
          <div className="calendar-capacity-list">
            {(capacity ?? []).map((member) => (
              <article key={member.userId} className={`calendar-capacity-card calendar-capacity-card--${member.coverage}`}>
                <div className="calendar-capacity-top">
                  <strong>{member.displayName}</strong>
                  <span>{member.utilization}%</span>
                </div>
                <div className="calendar-capacity-bar" aria-hidden="true">
                  <span style={{ width: `${member.utilization}%` }} />
                </div>
                <p className="muted">
                  {member.eventCount} event{member.eventCount === 1 ? "" : "s"} · {member.hoursBooked}h booked / {member.hoursAvailable}h
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="feature-form calendar-event-form">
        <input placeholder="Event title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <label className="feature-toggle">
          <input type="checkbox" checked={form.allDay} onChange={(e) => setForm({ ...form, allDay: e.target.checked })} />
          All day
        </label>
        {!form.allDay ? (
          <>
            <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </>
        ) : null}
        <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button type="button" className="mail-toolbar-btn" onClick={() => void createEvent()}>
          Add event
        </button>
      </section>

      {loading ? <p className="mail-view-empty">Loading calendar…</p> : null}
      {error ? <p className="mail-view-error">{error}</p> : null}

      <div className="calendar-grid">
        {visibleDays.map((day) => (
          <article key={day.key} className="calendar-grid-day">
            <strong>{day.day || " "}</strong>
            {day.events.map((event) => (
              <div key={event.id} className="calendar-grid-event">
                <span>{event.title}</span>
                {event.syncSource && event.syncSource !== "local" ? (
                  <small>Synced from {event.syncSource === "google" ? "Google" : "Microsoft"}</small>
                ) : null}
                {event.syncSource === "local" ? (
                  <button type="button" className="mail-toolbar-btn" onClick={() => void removeEvent(event.id)}>
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
          </article>
        ))}
      </div>
    </div>
  );
}
