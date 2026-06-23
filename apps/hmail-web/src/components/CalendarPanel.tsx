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

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  const todayKey = new Date().toISOString().slice(0, 10);
  const [cursorDate, setCursorDate] = useState(() => todayKey);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [enterprisePanel, setEnterprisePanel] = useState<EnterprisePanel>(null);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    title: "",
    date: todayKey,
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
          dateKey,
          isBlank: false,
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
        dateKey: "",
        isBlank: true,
        events: [] as CalendarEventRow[],
      })),
      ...Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const dateKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return {
          key: dateKey,
          day: String(day),
          dateKey,
          isBlank: false,
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
  const providerConnected = Boolean(settings?.googleConnected || settings?.microsoftConnected);

  const shiftPeriod = (delta: number) => {
    const cursor = new Date(`${cursorDate}T00:00:00`);
    if (viewMode === "week") cursor.setDate(cursor.getDate() + delta * 7);
    else cursor.setMonth(cursor.getMonth() + delta);
    setCursorDate(cursor.toISOString().slice(0, 10));
  };

  const refreshAll = async () => {
    await Promise.all([refreshEvents(), refreshSettings(), refreshCapacity()]);
  };

  const resetForm = () => {
    setForm({
      title: "",
      date: cursorDate,
      startTime: "09:00",
      endTime: "10:00",
      allDay: false,
      location: "",
      notes: "",
    });
    setShowForm(false);
  };

  const createEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    const startAt = form.allDay
      ? `${form.date}T00:00:00.000Z`
      : new Date(`${form.date}T${form.startTime}:00`).toISOString();
    const endAt = form.allDay ? null : new Date(`${form.date}T${form.endTime}:00`).toISOString();
    await api.createCalendarEvent({
      title: form.title.trim(),
      startAt,
      endAt: endAt ?? undefined,
      allDay: form.allDay,
      location: form.location || undefined,
      notes: form.notes || undefined,
    });
    resetForm();
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
    setNotice("Sequences updated");
  };

  const loading = eventsLoading || settingsLoading;
  const error = eventsError || settingsError;

  const featureTabs = [
    { id: "sync" as const, label: "Sync", dotOn: providerConnected },
    {
      id: "reminder-sequences" as const,
      label: "Sequences",
      dotOn: Boolean(settings?.reminderSequences.some((s) => s.active)),
    },
    { id: "capacity" as const, label: "Capacity", dotOn: Boolean((capacity ?? []).length) },
  ];

  return (
    <div className="mail-view-panel calendar-panel">
      <header className="cal-toolbar">
        <div>
          <h2 className="cal-title">Calendar</h2>
          <p className="cal-subtitle">Month & week views</p>
        </div>
        {!showForm ? (
          <button type="button" className="cal-primary-btn" onClick={() => setShowForm(true)}>
            New event
          </button>
        ) : null}
      </header>

      <div className="cal-nav-row">
        <button type="button" className="cal-nav-btn" aria-label="Previous period" onClick={() => shiftPeriod(-1)}>
          ‹
        </button>
        <strong className="cal-period-label">{periodLabel}</strong>
        <button type="button" className="cal-nav-btn" aria-label="Next period" onClick={() => shiftPeriod(1)}>
          ›
        </button>
        <div className="cal-view-tabs" role="tablist" aria-label="Calendar view">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "month"}
            className={viewMode === "month" ? "is-active" : ""}
            onClick={() => setViewMode("month")}
          >
            Month
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "week"}
            className={viewMode === "week" ? "is-active" : ""}
            onClick={() => setViewMode("week")}
          >
            Week
          </button>
        </div>
        {syncedEventCount > 0 ? <span className="cal-stat">{syncedEventCount} synced</span> : null}
      </div>

      <div className="cal-feature-tabs">
        {featureTabs.map((feature) => (
          <button
            key={feature.id}
            type="button"
            className={enterprisePanel === feature.id ? "is-active" : ""}
            onClick={() => setEnterprisePanel((current) => (current === feature.id ? null : feature.id))}
          >
            <span className={`cal-feature-dot${feature.dotOn ? " is-on" : ""}`} aria-hidden="true" />
            {feature.label}
          </button>
        ))}
      </div>

      {enterprisePanel === "sync" && settings ? (
        <section className="cal-drawer">
          <h3>Provider sync</h3>
          <div className="cal-drawer-actions">
            <button
              type="button"
              className={`cal-secondary-btn${settings.googleConnected ? " is-active" : ""}`}
              onClick={() => void toggleProvider("google", !settings.googleConnected)}
            >
              {settings.googleConnected ? "Google connected" : "Connect Google"}
            </button>
            <button
              type="button"
              className={`cal-secondary-btn${settings.microsoftConnected ? " is-active" : ""}`}
              onClick={() => void toggleProvider("microsoft", !settings.microsoftConnected)}
            >
              {settings.microsoftConnected ? "Microsoft connected" : "Connect Microsoft"}
            </button>
            <button type="button" className="cal-primary-btn" onClick={() => void runSync()}>
              Sync now
            </button>
          </div>
          <p className="cal-drawer-footnote">
            {settings.lastSyncAt
              ? `Last sync ${new Date(settings.lastSyncAt).toLocaleString()}`
              : "No sync run yet"}
          </p>
        </section>
      ) : null}

      {enterprisePanel === "reminder-sequences" && settings ? (
        <section className="cal-drawer">
          <h3>Reminder sequences</h3>
          <div className="cal-sequence-list">
            {settings.reminderSequences.map((sequence) => (
              <article key={sequence.id} className="cal-sequence-card">
                <div>
                  <strong>{sequence.name}</strong>
                  <p>
                    {sequence.triggers.length} triggers · {sequence.active ? "Active" : "Paused"}
                  </p>
                </div>
                <button type="button" className="cal-text-btn" onClick={() => void toggleSequence(sequence.id)}>
                  {sequence.active ? "Pause" : "Activate"}
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {enterprisePanel === "capacity" ? (
        <section className="cal-drawer">
          <h3>Team capacity</h3>
          {capacityLoading ? <p className="cal-status">Loading capacity…</p> : null}
          <div className="cal-capacity-list">
            {(capacity ?? []).map((member) => (
              <article key={member.userId} className={`cal-capacity-card cal-capacity-card--${member.coverage}`}>
                <div className="cal-capacity-top">
                  <strong>{member.displayName}</strong>
                  <span>{member.utilization}%</span>
                </div>
                <div className="cal-capacity-bar" aria-hidden="true">
                  <span style={{ width: `${member.utilization}%` }} />
                </div>
                <p className="cal-capacity-meta">
                  {member.eventCount} event{member.eventCount === 1 ? "" : "s"} · {member.hoursBooked}h /{" "}
                  {member.hoursAvailable}h
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {showForm ? (
        <form className="cal-composer" onSubmit={(e) => void createEvent(e)}>
          <div className="cal-composer-head">
            <h3>New event</h3>
            <button type="button" className="cal-icon-btn" aria-label="Close form" onClick={resetForm}>
              ×
            </button>
          </div>
          <div className="cal-form-grid">
            <label className="cal-field cal-field--full">
              <span>Title</span>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="cal-field">
              <span>Date</span>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </label>
            {!form.allDay ? (
              <label className="cal-field">
                <span>Start</span>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </label>
            ) : null}
            {!form.allDay ? (
              <label className="cal-field">
                <span>End</span>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </label>
            ) : null}
            <label className="cal-toggle">
              <input
                type="checkbox"
                checked={form.allDay}
                onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
              />
              All day
            </label>
            <label className="cal-field cal-field--full">
              <span>Location</span>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </label>
            <label className="cal-field cal-field--full">
              <span>Notes</span>
              <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </label>
          </div>
          <div className="cal-form-actions">
            <button type="submit" className="cal-primary-btn">
              Add event
            </button>
            <button type="button" className="cal-secondary-btn" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {notice ? <p className="cal-notice">{notice}</p> : null}
      {loading ? <p className="cal-status">Loading…</p> : null}
      {error ? <p className="mail-view-error">{error}</p> : null}

      <div className="cal-grid-head" aria-hidden="true">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="cal-grid">
        {visibleDays.map((day) => (
          <article
            key={day.key}
            className={`cal-grid-day${day.isBlank ? " is-blank" : ""}${day.dateKey === todayKey ? " is-today" : ""}`}
          >
            {!day.isBlank ? (
              <>
                <span className="cal-day-num">{day.day}</span>
                {day.events.map((event) => (
                  <div key={event.id} className="cal-event">
                    <span className="cal-event-title">{event.title}</span>
                    {event.syncSource && event.syncSource !== "local" ? (
                      <span className="cal-event-meta">
                        {event.syncSource === "google" ? "Google" : "Microsoft"}
                      </span>
                    ) : null}
                    {event.syncSource === "local" ? (
                      <button type="button" className="cal-event-remove" onClick={() => void removeEvent(event.id)}>
                        Remove
                      </button>
                    ) : null}
                  </div>
                ))}
              </>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
