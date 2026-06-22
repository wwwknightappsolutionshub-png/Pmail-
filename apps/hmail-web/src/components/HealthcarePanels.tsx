import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import "./MailViews.css";

type HealthcareLane = "registry" | "scheduling" | "referrals" | "compliance";
type StatTone = "accent" | "warn" | "ok" | "alert";

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

function formatStatusLabel(value: string): string {
  return value.replaceAll("_", " ");
}

function dateTimeToIso(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

function HealthcareToolShell({
  lane,
  eyebrow,
  title,
  description,
  stats,
  children,
}: {
  lane: HealthcareLane;
  eyebrow: string;
  title: string;
  description: string;
  stats: Array<{ label: string; value: string | number; tone?: StatTone }>;
  children: ReactNode;
}) {
  return (
    <div className={`mail-view-panel healthcare-tool-shell healthcare-tool-shell--${lane}`}>
      <header className="healthcare-clinical-hero">
        <div className="healthcare-clinical-hero-copy">
          <span className="healthcare-clinical-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="healthcare-vitals-strip" aria-label="Workspace metrics">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`healthcare-vital-chip${stat.tone ? ` healthcare-vital-chip--${stat.tone}` : ""}`}
            >
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </header>
      {children}
    </div>
  );
}

function HealthcareEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="healthcare-empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function HealthcareSectionHead({
  code,
  title,
  description,
}: {
  code: string;
  title: string;
  description: string;
}) {
  return (
    <div className="healthcare-section-head">
      <span>{code}</span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

function HealthcareStatusPill({ label, tone }: { label: string; tone?: StatTone }) {
  return <span className={`healthcare-status-pill${tone ? ` healthcare-status-pill--${tone}` : ""}`}>{label}</span>;
}

export function PatientRegistryPanel() {
  const { data: contacts, loading: contactsLoading, error: contactsError, refresh: refreshContacts } = useLoad(() =>
    api.hcContacts().then((r) => r.contacts),
  );
  const { data: charts, loading: chartsLoading, error: chartsError, refresh: refreshCharts } = useLoad(() =>
    api.hcPatientCharts().then((r) => r.charts),
  );

  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [contactForm, setContactForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "patient",
    dateOfBirth: "",
    medicalRecordNumber: "",
    preferredProvider: "",
  });
  const [chartForm, setChartForm] = useState({
    chartNumber: "",
    patientContactId: "",
    careStage: "intake",
    referralStatus: "none",
    authorizationStatus: "not_required",
    callbackRequired: false,
  });

  const contactRows = contacts ?? [];
  const chartRows = charts ?? [];
  const callbackCount = chartRows.filter((chart) => chart.callbackRequired).length;
  const activeCharts = chartRows.filter((chart) => chart.status === "active").length;

  const createContact = async () => {
    setActionError("");
    setActionNotice("");
    try {
      if (!contactForm.firstName.trim() || !contactForm.lastName.trim()) {
        throw new Error("First and last name are required.");
      }
      await api.createHcContact(contactForm);
      setContactForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        role: "patient",
        dateOfBirth: "",
        medicalRecordNumber: "",
        preferredProvider: "",
      });
      setActionNotice("Contact added to the patient registry.");
      await refreshContacts();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to add contact.");
    }
  };

  const createChart = async () => {
    setActionError("");
    setActionNotice("");
    try {
      if (!chartForm.chartNumber.trim()) throw new Error("Chart number is required.");
      await api.createHcPatientChart({
        chartNumber: chartForm.chartNumber,
        patientContactId: chartForm.patientContactId || undefined,
        careStage: chartForm.careStage,
        referralStatus: chartForm.referralStatus,
        authorizationStatus: chartForm.authorizationStatus,
        callbackRequired: chartForm.callbackRequired,
      });
      setChartForm({
        chartNumber: "",
        patientContactId: "",
        careStage: "intake",
        referralStatus: "none",
        authorizationStatus: "not_required",
        callbackRequired: false,
      });
      setActionNotice("Patient chart opened.");
      await refreshCharts();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to open chart.");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await api.updateHcPatientChartStatus(id, status);
    await refreshCharts();
  };

  return (
    <HealthcareToolShell
      lane="registry"
      eyebrow="Station 01 · Patient registry"
      title="Chart & Contact Registry"
      description="Register patients, open charts, and track care stage, authorization, and callback flags across clinical mail threads."
      stats={[
        { label: "Contacts", value: contactRows.length },
        { label: "Active charts", value: activeCharts, tone: "accent" },
        { label: "Callbacks", value: callbackCount, tone: callbackCount > 0 ? "warn" : "ok" },
      ]}
    >
      {(contactsError || chartsError) ? <p className="mail-view-error">{contactsError || chartsError}</p> : null}
      {actionError ? <p className="mail-view-error">{actionError}</p> : null}
      {actionNotice ? <p className="mail-view-success">{actionNotice}</p> : null}

      <div className="healthcare-tool-layout healthcare-tool-layout--split">
        <section className="healthcare-intake-panel">
          <HealthcareSectionHead
            code="A"
            title="New contact"
            description="Create the patient, provider, or referral contact used by charts and threads."
          />
          <div className="healthcare-field-grid healthcare-field-grid--duo">
            <input placeholder="First name" value={contactForm.firstName} onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })} />
            <input placeholder="Last name" value={contactForm.lastName} onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })} />
          </div>
          <input type="email" placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
          <input placeholder="Medical record number" value={contactForm.medicalRecordNumber} onChange={(e) => setContactForm({ ...contactForm, medicalRecordNumber: e.target.value })} />
          <div className="healthcare-field-grid healthcare-field-grid--duo">
            <input type="date" aria-label="Date of birth" value={contactForm.dateOfBirth} onChange={(e) => setContactForm({ ...contactForm, dateOfBirth: e.target.value })} />
            <input placeholder="Preferred provider" value={contactForm.preferredProvider} onChange={(e) => setContactForm({ ...contactForm, preferredProvider: e.target.value })} />
          </div>
          <select value={contactForm.role} onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}>
            <option value="patient">Patient</option>
            <option value="referral">Referral</option>
            <option value="provider">Provider</option>
          </select>
          <button type="button" className="mail-toolbar-btn healthcare-action-btn" onClick={() => void createContact()}>
            Add contact
          </button>
        </section>

        <section className="healthcare-intake-panel healthcare-intake-panel--primary">
          <HealthcareSectionHead
            code="B"
            title="Open patient chart"
            description="Link a chart to a contact and set care stage plus authorization posture."
          />
          <input placeholder="Chart number" value={chartForm.chartNumber} onChange={(e) => setChartForm({ ...chartForm, chartNumber: e.target.value })} />
          <select value={chartForm.patientContactId} onChange={(e) => setChartForm({ ...chartForm, patientContactId: e.target.value })}>
            <option value="">Patient (optional)</option>
            {contactRows.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.firstName} {contact.lastName}
                {contact.medicalRecordNumber ? ` · MRN ${contact.medicalRecordNumber}` : ""}
              </option>
            ))}
          </select>
          <div className="healthcare-field-grid healthcare-field-grid--duo">
            <select value={chartForm.careStage} onChange={(e) => setChartForm({ ...chartForm, careStage: e.target.value })}>
              <option value="intake">Intake</option>
              <option value="active_care">Active care</option>
              <option value="follow_up">Follow-up</option>
              <option value="closed">Closed</option>
            </select>
            <select value={chartForm.authorizationStatus} onChange={(e) => setChartForm({ ...chartForm, authorizationStatus: e.target.value })}>
              <option value="not_required">Auth not required</option>
              <option value="pending">Auth pending</option>
              <option value="approved">Auth approved</option>
              <option value="denied">Auth denied</option>
              <option value="expired">Auth expired</option>
            </select>
          </div>
          <label className="healthcare-check-row">
            <input type="checkbox" checked={chartForm.callbackRequired} onChange={(e) => setChartForm({ ...chartForm, callbackRequired: e.target.checked })} />
            Callback required
          </label>
          <button type="button" className="mail-toolbar-btn healthcare-action-btn" onClick={() => void createChart()}>
            Open chart
          </button>
        </section>
      </div>

      {contactsLoading || chartsLoading ? <p className="mail-view-empty">Loading registry…</p> : null}

      <section className="healthcare-record-panel">
        <HealthcareSectionHead code="Charts" title="Active chart board" description="Review chart status, care lane, and linked clinical activity." />
        {chartRows.length ? (
          <div className="healthcare-chart-grid">
            {chartRows.map((chart) => (
              <article key={chart.id} className={`healthcare-chart-card${chart.callbackRequired ? " healthcare-chart-card--callback" : ""}`}>
                <div className="healthcare-chart-card-top">
                  <div>
                    <span className="healthcare-chart-id">Chart {chart.chartNumber}</span>
                    {chart.patientName ? <p className="healthcare-chart-patient">{chart.patientName}</p> : null}
                  </div>
                  <HealthcareStatusPill label={formatStatusLabel(chart.status)} tone={chart.status === "active" ? "accent" : undefined} />
                </div>
                <div className="healthcare-meta-row">
                  <span>Care: {formatStatusLabel(chart.careStage)}</span>
                  <span>Auth: {formatStatusLabel(chart.authorizationStatus)}</span>
                </div>
                <p>
                  Referrals {formatStatusLabel(chart.referralStatus)} ({chart.referralCount}) · {chart.appointmentCount} appointments · {chart.auditCaseCount} audit cases
                </p>
                {chart.callbackRequired ? <HealthcareStatusPill label="Callback required" tone="warn" /> : null}
                <select defaultValue={chart.status} onChange={(e) => void updateStatus(chart.id, e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="transferred">Transferred</option>
                  <option value="discharged">Discharged</option>
                </select>
                <code className="feature-id">{chart.id}</code>
              </article>
            ))}
          </div>
        ) : (
          <HealthcareEmptyState title="No charts yet" body="Open a patient chart to start tracking care stage and clinical mail threads." />
        )}
      </section>
    </HealthcareToolShell>
  );
}

export function AppointmentDeskPanel() {
  const { data: charts } = useLoad(() => api.hcPatientCharts().then((r) => r.charts));
  const { data: appointments, loading, error, refresh } = useLoad(() => api.hcAppointments().then((r) => r.appointments));
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [form, setForm] = useState({
    chartId: "",
    firstName: "",
    lastName: "",
    email: "",
    scheduledAt: "",
    appointmentType: "consult",
    callbackStatus: "not_required",
    notes: "",
  });

  const appointmentRows = appointments ?? [];
  const todayKey = new Date().toDateString();
  const todayCount = appointmentRows.filter((appointment) => new Date(appointment.scheduledAt).toDateString() === todayKey).length;
  const noShowCount = appointmentRows.filter((appointment) => appointment.status === "no_show").length;
  const callbackCount = appointmentRows.filter((appointment) => appointment.callbackStatus === "queued").length;

  const sortedAppointments = useMemo(
    () => [...appointmentRows].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [appointmentRows],
  );

  const scheduleAppointment = async () => {
    setActionError("");
    setActionNotice("");
    try {
      if (!form.chartId) throw new Error("Select a patient chart.");
      if (!form.firstName.trim() || !form.lastName.trim()) throw new Error("Patient name is required.");
      if (!form.scheduledAt) throw new Error("Scheduled time is required.");
      await api.createHcAppointment({
        chartId: form.chartId,
        contact: { firstName: form.firstName, lastName: form.lastName, email: form.email || undefined },
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        appointmentType: form.appointmentType,
        callbackStatus: form.callbackStatus,
        notes: form.notes || undefined,
      });
      setForm({
        chartId: "",
        firstName: "",
        lastName: "",
        email: "",
        scheduledAt: "",
        appointmentType: "consult",
        callbackStatus: "not_required",
        notes: "",
      });
      setActionNotice("Appointment scheduled.");
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to schedule appointment.");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await api.updateHcAppointmentStatus(id, {
      status,
      callbackStatus: status === "no_show" ? "queued" : undefined,
      noShowReason: status === "no_show" ? "Needs callback queue follow-up" : undefined,
    });
    await refresh();
  };

  return (
    <HealthcareToolShell
      lane="scheduling"
      eyebrow="Station 02 · Appointment desk"
      title="Daily Schedule Console"
      description="Book encounters, monitor today's queue, and route no-shows into the callback lane."
      stats={[
        { label: "Today", value: todayCount, tone: "accent" },
        { label: "No-shows", value: noShowCount, tone: noShowCount > 0 ? "warn" : "ok" },
        { label: "Callbacks", value: callbackCount, tone: callbackCount > 0 ? "alert" : "ok" },
      ]}
    >
      {error ? <p className="mail-view-error">{error}</p> : null}
      {actionError ? <p className="mail-view-error">{actionError}</p> : null}
      {actionNotice ? <p className="mail-view-success">{actionNotice}</p> : null}

      <div className="healthcare-tool-layout healthcare-tool-layout--schedule">
        <section className="healthcare-intake-panel healthcare-intake-panel--primary">
          <HealthcareSectionHead code="Book" title="Schedule encounter" description="Attach the visit to a chart and set type, callback posture, and notes." />
          <select value={form.chartId} onChange={(e) => setForm({ ...form, chartId: e.target.value })}>
            <option value="">Select chart</option>
            {(charts ?? []).map((chart) => (
              <option key={chart.id} value={chart.id}>
                Chart {chart.chartNumber}
                {chart.patientName ? ` · ${chart.patientName}` : ""}
              </option>
            ))}
          </select>
          <div className="healthcare-field-grid healthcare-field-grid--duo">
            <input placeholder="Patient first name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <input placeholder="Patient last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <input type="email" placeholder="Patient email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input type="datetime-local" aria-label="Scheduled time" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
          <div className="healthcare-field-grid healthcare-field-grid--duo">
            <select value={form.appointmentType} onChange={(e) => setForm({ ...form, appointmentType: e.target.value })}>
              <option value="consult">Consult</option>
              <option value="follow_up">Follow-up</option>
              <option value="procedure">Procedure</option>
              <option value="telehealth">Telehealth</option>
              <option value="callback">Callback</option>
            </select>
            <select value={form.callbackStatus} onChange={(e) => setForm({ ...form, callbackStatus: e.target.value })}>
              <option value="not_required">No callback</option>
              <option value="queued">Callback queued</option>
              <option value="completed">Callback completed</option>
              <option value="failed">Callback failed</option>
            </select>
          </div>
          <input placeholder="Clinical notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button type="button" className="mail-toolbar-btn healthcare-action-btn" onClick={() => void scheduleAppointment()}>
            Schedule appointment
          </button>
        </section>

        <section className="healthcare-record-panel healthcare-record-panel--timeline">
          <HealthcareSectionHead code="Queue" title="Encounter timeline" description="Today's and upcoming visits sorted by scheduled time." />
          {loading ? <p className="mail-view-empty">Loading appointments…</p> : null}
          {sortedAppointments.length ? (
            <div className="healthcare-encounter-timeline">
              {sortedAppointments.map((appointment) => {
                const scheduled = new Date(appointment.scheduledAt);
                const isToday = scheduled.toDateString() === todayKey;
                const statusTone: StatTone | undefined =
                  appointment.status === "no_show" ? "warn" : appointment.status === "completed" ? "ok" : "accent";

                return (
                  <article key={appointment.id} className={`healthcare-encounter-card${isToday ? " healthcare-encounter-card--today" : ""}`}>
                    <div className="healthcare-encounter-time">
                      <strong>{scheduled.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</strong>
                      <span>{scheduled.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                    </div>
                    <div className="healthcare-encounter-body">
                      <div className="healthcare-chart-card-top">
                        <div>
                          <span className="healthcare-chart-id">Chart {appointment.chart.chartNumber}</span>
                          <p className="healthcare-chart-patient">{appointment.contactName}</p>
                        </div>
                        <HealthcareStatusPill label={formatStatusLabel(appointment.status)} tone={statusTone} />
                      </div>
                      <div className="healthcare-meta-row">
                        <span>{formatStatusLabel(appointment.appointmentType)}</span>
                        <span>Callback: {formatStatusLabel(appointment.callbackStatus)}</span>
                      </div>
                      {appointment.noShowReason ? <p>{appointment.noShowReason}</p> : null}
                      <select defaultValue={appointment.status} onChange={(e) => void updateStatus(appointment.id, e.target.value)}>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_show">No show</option>
                      </select>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <HealthcareEmptyState title="Schedule is clear" body="Book an encounter to populate the daily timeline." />
          )}
        </section>
      </div>
    </HealthcareToolShell>
  );
}

export function ReferralTrackerPanel({ onUseTemplate }: { onUseTemplate: (t: { subject: string; html: string }) => void }) {
  const { data: templates, loading: templatesLoading, error: templatesError } = useLoad(() => api.hcTemplates().then((r) => r.templates));
  const { data: charts } = useLoad(() => api.hcPatientCharts().then((r) => r.charts));
  const { data: contacts } = useLoad(() => api.hcContacts().then((r) => r.contacts));
  const { data: referrals, refresh } = useLoad(() => api.hcReferrals().then((r) => r.referrals));
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [form, setForm] = useState({
    chartId: "",
    providerContactId: "",
    direction: "inbound",
    referralType: "specialist",
    specialty: "",
    priority: "routine",
    dueAt: "",
    notes: "",
  });

  const referralRows = referrals ?? [];
  const openCount = referralRows.filter((referral) => !["completed", "declined", "cancelled"].includes(referral.status)).length;
  const urgentCount = referralRows.filter((referral) => referral.priority === "urgent" || referral.priority === "stat").length;

  const createReferral = async () => {
    setActionError("");
    setActionNotice("");
    try {
      if (!form.chartId) throw new Error("Select a patient chart.");
      await api.createHcReferral({
        chartId: form.chartId,
        providerContactId: form.providerContactId || undefined,
        direction: form.direction,
        referralType: form.referralType,
        specialty: form.specialty || undefined,
        priority: form.priority,
        dueAt: dateTimeToIso(form.dueAt),
        notes: form.notes || undefined,
      });
      setForm({
        chartId: "",
        providerContactId: "",
        direction: "inbound",
        referralType: "specialist",
        specialty: "",
        priority: "routine",
        dueAt: "",
        notes: "",
      });
      setActionNotice("Referral opened.");
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to open referral.");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await api.updateHcReferralStatus(id, status);
    await refresh();
  };

  const priorityTone = (priority: string): StatTone | undefined => {
    if (priority === "stat") return "alert";
    if (priority === "urgent") return "warn";
    return undefined;
  };

  return (
    <HealthcareToolShell
      lane="referrals"
      eyebrow="Station 03 · Referral tracker"
      title="Referral Coordination Hub"
      description="Open inbound and outbound referrals, triage priority, and launch templated provider updates."
      stats={[
        { label: "Open cases", value: openCount, tone: "accent" },
        { label: "Urgent / STAT", value: urgentCount, tone: urgentCount > 0 ? "warn" : "ok" },
        { label: "Templates", value: (templates ?? []).length },
      ]}
    >
      {templatesError ? <p className="mail-view-error">{templatesError}</p> : null}
      {actionError ? <p className="mail-view-error">{actionError}</p> : null}
      {actionNotice ? <p className="mail-view-success">{actionNotice}</p> : null}

      <div className="healthcare-tool-layout healthcare-tool-layout--split">
        <section className="healthcare-intake-panel healthcare-intake-panel--primary">
          <HealthcareSectionHead code="Open" title="New referral" description="Route the case to a provider contact with priority and due date." />
          <select value={form.chartId} onChange={(e) => setForm({ ...form, chartId: e.target.value })}>
            <option value="">Select patient chart</option>
            {(charts ?? []).map((chart) => (
              <option key={chart.id} value={chart.id}>
                Chart {chart.chartNumber}
                {chart.patientName ? ` · ${chart.patientName}` : ""}
              </option>
            ))}
          </select>
          <select value={form.providerContactId} onChange={(e) => setForm({ ...form, providerContactId: e.target.value })}>
            <option value="">Referring/provider contact (optional)</option>
            {(contacts ?? []).filter((contact) => contact.role === "provider" || contact.role === "referral").map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.firstName} {contact.lastName}
              </option>
            ))}
          </select>
          <div className="healthcare-field-grid healthcare-field-grid--duo">
            <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
              <option value="inbound">Inbound referral</option>
              <option value="outbound">Outbound referral</option>
            </select>
            <select value={form.referralType} onChange={(e) => setForm({ ...form, referralType: e.target.value })}>
              <option value="specialist">Specialist</option>
              <option value="diagnostic">Diagnostic</option>
              <option value="insurance">Insurance authorization</option>
              <option value="community">Community care</option>
            </select>
          </div>
          <input placeholder="Specialty" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
          <div className="healthcare-field-grid healthcare-field-grid--duo">
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="stat">STAT</option>
            </select>
            <input type="date" aria-label="Due date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
          </div>
          <input placeholder="Referral notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button type="button" className="mail-toolbar-btn healthcare-action-btn" onClick={() => void createReferral()}>
            Open referral
          </button>
        </section>

        <section className="healthcare-record-panel">
          <HealthcareSectionHead code="Queue" title="Referral board" description="Track direction, provider ownership, and triage status." />
          {referralRows.length ? (
            <div className="healthcare-referral-grid">
              {referralRows.map((referral) => (
                <article key={referral.id} className={`healthcare-referral-card healthcare-referral-card--${referral.priority}`}>
                  <div className="healthcare-chart-card-top">
                    <div>
                      <span className="healthcare-chart-id">{referral.specialty ?? formatStatusLabel(referral.referralType)}</span>
                      <p className="healthcare-chart-patient">Chart {referral.chart.chartNumber}</p>
                    </div>
                    <HealthcareStatusPill label={referral.priority.toUpperCase()} tone={priorityTone(referral.priority)} />
                  </div>
                  <div className="healthcare-meta-row">
                    <span>{formatStatusLabel(referral.direction)}</span>
                    <span>{formatStatusLabel(referral.status)}</span>
                  </div>
                  {referral.providerName ? <p>Provider: {referral.providerName}</p> : null}
                  {referral.dueAt ? <p>Due {new Date(referral.dueAt).toLocaleDateString()}</p> : null}
                  <select defaultValue={referral.status} onChange={(e) => void updateStatus(referral.id, e.target.value)}>
                    <option value="received">Received</option>
                    <option value="triaged">Triaged</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="declined">Declined</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </article>
              ))}
            </div>
          ) : (
            <HealthcareEmptyState title="Referral queue is empty" body="Open a referral to coordinate specialist handoffs and payer requests." />
          )}
        </section>
      </div>

      <section className="healthcare-record-panel healthcare-record-panel--templates">
        <HealthcareSectionHead code="Mail" title="Referral templates" description="Launch pre-approved outreach into the compose workspace." />
        {templatesLoading ? <p className="mail-view-empty">Loading templates…</p> : null}
        {(templates ?? []).length ? (
          <div className="healthcare-template-grid">
            {(templates ?? []).map((template) => (
              <article key={template.id} className="healthcare-template-card">
                <h3>{template.name}</h3>
                <p>{template.description}</p>
                <p className="healthcare-template-subject">
                  <strong>Subject:</strong> {template.subject}
                </p>
                <button
                  type="button"
                  className="mail-toolbar-btn healthcare-action-btn"
                  onClick={() => onUseTemplate({ subject: template.subject, html: template.bodyHtml })}
                >
                  Use template
                </button>
              </article>
            ))}
          </div>
        ) : (
          <HealthcareEmptyState title="No templates loaded" body="Healthcare referral templates will appear here once seeded for the tenant." />
        )}
      </section>
    </HealthcareToolShell>
  );
}

export function HipaaAuditPanel() {
  const { data: charts } = useLoad(() => api.hcPatientCharts().then((r) => r.charts));
  const { data: cases, loading: casesLoading, error: casesError, refresh } = useLoad(() => api.hcAuditCases().then((r) => r.cases));
  const { data: logs, refresh: refreshLogs } = useLoad(() => api.hcAccessLogs().then((r) => r.logs));
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const { data: notes, refresh: refreshNotes } = useLoad(
    () => (selectedCaseId ? api.hcAuditNotes(selectedCaseId).then((r) => r.notes) : Promise.resolve([])),
    [selectedCaseId],
  );
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [caseForm, setCaseForm] = useState({ chartId: "", title: "", severity: "", accessReason: "", roleScope: "clinical_staff" });
  const [accessForm, setAccessForm] = useState({ chartId: "", action: "viewed", reason: "", roleScope: "clinical_staff" });
  const [noteBody, setNoteBody] = useState("");

  const caseRows = cases ?? [];
  const logRows = logs ?? [];
  const openCases = caseRows.filter((auditCase) => auditCase.status !== "closed").length;
  const escalatedCount = caseRows.filter((auditCase) => auditCase.status === "escalated").length;

  const createCase = async () => {
    setActionError("");
    setActionNotice("");
    try {
      if (!caseForm.chartId || !caseForm.title.trim()) throw new Error("Chart and case title are required.");
      await api.createHcAuditCase({
        chartId: caseForm.chartId,
        title: caseForm.title,
        severity: caseForm.severity || undefined,
        accessReason: caseForm.accessReason || undefined,
        roleScope: caseForm.roleScope || undefined,
      });
      setCaseForm({ chartId: "", title: "", severity: "", accessReason: "", roleScope: "clinical_staff" });
      setActionNotice("Audit case opened.");
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to open audit case.");
    }
  };

  const createAccessLog = async () => {
    setActionError("");
    setActionNotice("");
    try {
      if (!accessForm.chartId || !accessForm.reason.trim()) throw new Error("Chart and access reason are required.");
      await api.createHcAccessLog(accessForm);
      setAccessForm({ chartId: "", action: "viewed", reason: "", roleScope: "clinical_staff" });
      setActionNotice("Access event logged.");
      await refreshLogs();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to log access.");
    }
  };

  const addNote = async () => {
    if (!selectedCaseId || !noteBody.trim()) return;
    await api.createHcAuditNote(selectedCaseId, noteBody);
    setNoteBody("");
    await refreshNotes();
  };

  const updateStatus = async (id: string, status: string) => {
    await api.updateHcAuditCaseStatus(id, {
      status,
      resolved: status === "closed",
      exportRequested: status === "escalated",
    });
    await refresh();
  };

  const selectedCase = caseRows.find((auditCase) => auditCase.id === selectedCaseId);

  return (
    <HealthcareToolShell
      lane="compliance"
      eyebrow="Station 04 · HIPAA audit"
      title="Compliance & Access Console"
      description="Open audit cases, log minimum-necessary chart access, and review the live access trail."
      stats={[
        { label: "Open cases", value: openCases, tone: openCases > 0 ? "warn" : "ok" },
        { label: "Access logs", value: logRows.length, tone: "accent" },
        { label: "Escalated", value: escalatedCount, tone: escalatedCount > 0 ? "alert" : "ok" },
      ]}
    >
      {casesError ? <p className="mail-view-error">{casesError}</p> : null}
      {actionError ? <p className="mail-view-error">{actionError}</p> : null}
      {actionNotice ? <p className="mail-view-success">{actionNotice}</p> : null}

      <div className="healthcare-tool-layout healthcare-tool-layout--split">
        <section className="healthcare-intake-panel">
          <HealthcareSectionHead code="Case" title="Open audit case" description="Document severity, access reason, and role scope for review." />
          <select value={caseForm.chartId} onChange={(e) => setCaseForm({ ...caseForm, chartId: e.target.value })}>
            <option value="">Select chart</option>
            {(charts ?? []).map((chart) => (
              <option key={chart.id} value={chart.id}>Chart {chart.chartNumber}</option>
            ))}
          </select>
          <input placeholder="Audit case title" value={caseForm.title} onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })} />
          <div className="healthcare-field-grid healthcare-field-grid--duo">
            <input placeholder="Severity" value={caseForm.severity} onChange={(e) => setCaseForm({ ...caseForm, severity: e.target.value })} />
            <select value={caseForm.roleScope} onChange={(e) => setCaseForm({ ...caseForm, roleScope: e.target.value })}>
              <option value="clinical_staff">Clinical staff</option>
              <option value="billing">Billing</option>
              <option value="referral_coordinator">Referral coordinator</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <input placeholder="Access reason" value={caseForm.accessReason} onChange={(e) => setCaseForm({ ...caseForm, accessReason: e.target.value })} />
          <button type="button" className="mail-toolbar-btn healthcare-action-btn" onClick={() => void createCase()}>
            Open audit case
          </button>
        </section>

        <section className="healthcare-intake-panel healthcare-intake-panel--primary">
          <HealthcareSectionHead code="Log" title="Record chart access" description="Capture minimum-necessary access with role scope and action type." />
          <select value={accessForm.chartId} onChange={(e) => setAccessForm({ ...accessForm, chartId: e.target.value })}>
            <option value="">Select chart</option>
            {(charts ?? []).map((chart) => (
              <option key={chart.id} value={chart.id}>
                Chart {chart.chartNumber}
                {chart.patientName ? ` · ${chart.patientName}` : ""}
              </option>
            ))}
          </select>
          <div className="healthcare-field-grid healthcare-field-grid--duo">
            <select value={accessForm.action} onChange={(e) => setAccessForm({ ...accessForm, action: e.target.value })}>
              <option value="viewed">Viewed</option>
              <option value="exported">Exported</option>
              <option value="printed">Printed</option>
              <option value="shared">Shared</option>
            </select>
            <select value={accessForm.roleScope} onChange={(e) => setAccessForm({ ...accessForm, roleScope: e.target.value })}>
              <option value="clinical_staff">Clinical staff</option>
              <option value="billing">Billing</option>
              <option value="referral_coordinator">Referral coordinator</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <input placeholder="Minimum-necessary reason" value={accessForm.reason} onChange={(e) => setAccessForm({ ...accessForm, reason: e.target.value })} />
          <button type="button" className="mail-toolbar-btn healthcare-action-btn" onClick={() => void createAccessLog()}>
            Log access
          </button>
        </section>
      </div>

      {casesLoading ? <p className="mail-view-empty">Loading audit cases…</p> : null}

      <div className="healthcare-tool-layout healthcare-tool-layout--audit">
        <section className="healthcare-record-panel">
          <HealthcareSectionHead code="Cases" title="Audit case board" description="Review open investigations and move cases through compliance workflow." />
          {caseRows.length ? (
            <div className="healthcare-audit-grid">
              {caseRows.map((auditCase) => (
                <article
                  key={auditCase.id}
                  className={`healthcare-audit-card${selectedCaseId === auditCase.id ? " healthcare-audit-card--active" : ""}`}
                >
                  <div className="healthcare-chart-card-top">
                    <div>
                      <span className="healthcare-chart-id">{auditCase.title}</span>
                      <p className="healthcare-chart-patient">Chart {auditCase.chart.chartNumber}</p>
                    </div>
                    <HealthcareStatusPill
                      label={formatStatusLabel(auditCase.status)}
                      tone={auditCase.status === "escalated" ? "alert" : auditCase.status === "open" ? "warn" : "ok"}
                    />
                  </div>
                  <p>
                    {auditCase.noteCount} notes
                    {auditCase.severity ? ` · Severity ${auditCase.severity}` : ""}
                    {auditCase.roleScope ? ` · ${formatStatusLabel(auditCase.roleScope)}` : ""}
                  </p>
                  {auditCase.accessReason ? <p>{auditCase.accessReason}</p> : null}
                  <div className="healthcare-card-actions">
                    <button type="button" className="mail-toolbar-btn" onClick={() => setSelectedCaseId(auditCase.id)}>
                      View notes
                    </button>
                    <select defaultValue={auditCase.status} onChange={(e) => void updateStatus(auditCase.id, e.target.value)}>
                      <option value="open">Open</option>
                      <option value="under_review">Under review</option>
                      <option value="closed">Closed</option>
                      <option value="escalated">Escalated</option>
                    </select>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <HealthcareEmptyState title="No audit cases" body="Open a case when chart access needs formal review." />
          )}
        </section>

        <section className="healthcare-record-panel healthcare-record-panel--access-log">
          <HealthcareSectionHead code="Trail" title="Access log stream" description="Recent minimum-necessary chart touches across the care team." />
          {logRows.length ? (
            <div className="healthcare-access-stream">
              {logRows.map((log) => (
                <article key={log.id} className="healthcare-access-event">
                  <div className="healthcare-access-event-marker" aria-hidden="true" />
                  <div>
                    <div className="healthcare-chart-card-top">
                      <strong>{formatStatusLabel(log.action)}</strong>
                      <HealthcareStatusPill label={formatStatusLabel(log.roleScope)} />
                    </div>
                    <p>Chart {log.chart.chartNumber} · {log.reason}</p>
                    <p className="healthcare-access-meta">
                      {log.user.displayName ?? log.user.email} · {new Date(log.createdAt).toLocaleString()}
                    </p>
                    {log.exportedAt ? <p>Exported {new Date(log.exportedAt).toLocaleString()}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <HealthcareEmptyState title="No access events" body="Log chart access to build the HIPAA audit trail." />
          )}
        </section>
      </div>

      {selectedCase ? (
        <section className="healthcare-record-panel healthcare-record-panel--notes">
          <HealthcareSectionHead
            code="Notes"
            title={`Team notes · ${selectedCase.title}`}
            description="Collaborative review notes for the selected audit case."
          />
          <div className="healthcare-note-compose">
            <textarea placeholder="Add a compliance note…" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} rows={3} />
            <button type="button" className="mail-toolbar-btn healthcare-action-btn" onClick={() => void addNote()}>
              Add note
            </button>
          </div>
          <ul className="healthcare-note-list">
            {(notes ?? []).map((note) => (
              <li key={note.id}>
                <strong>{note.author.displayName ?? note.author.email}</strong>
                <p>{note.body}</p>
                <small>{new Date(note.createdAt).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </HealthcareToolShell>
  );
}
