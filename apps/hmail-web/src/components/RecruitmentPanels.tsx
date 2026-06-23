import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import "./MailViews.css";

type RecruitmentLane = "pipeline" | "schedule" | "outreach" | "search";
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

function formatCompensation(cents: number | null): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}

function RecruitmentToolShell({
  lane,
  eyebrow,
  title,
  description,
  stats,
  children,
}: {
  lane: RecruitmentLane;
  eyebrow: string;
  title: string;
  description: string;
  stats: Array<{ label: string; value: string | number; tone?: StatTone }>;
  children: ReactNode;
}) {
  return (
    <div className={`mail-view-panel industry-ws-tool-shell industry-ws-tool-shell--${lane}`}>
      <header className="industry-ws-hero">
        <div className="industry-ws-hero-copy">
          <span className="industry-ws-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="industry-ws-vitals-strip" aria-label="Workspace metrics">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`industry-ws-vital-chip${stat.tone ? ` industry-ws-vital-chip--${stat.tone}` : ""}`}
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

function RecruitmentEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="industry-ws-empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function RecruitmentSectionHead({
  code,
  title,
  description,
}: {
  code: string;
  title: string;
  description: string;
}) {
  return (
    <div className="industry-ws-section-head">
      <span>{code}</span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

function RecruitmentStatusPill({ label, tone }: { label: string; tone?: StatTone }) {
  return (
    <span className={`industry-ws-status-pill${tone ? ` industry-ws-status-pill--${tone}` : ""}`}>{label}</span>
  );
}

function priorityTone(priority: string): StatTone | undefined {
  if (priority === "urgent") return "alert";
  if (priority === "high") return "warn";
  return undefined;
}

export function RolePipelinePanel() {
  const { data: contacts, loading: contactsLoading, error: contactsError, refresh: refreshContacts } = useLoad(() =>
    api.rcContacts().then((r) => r.contacts),
  );
  const { data: roles, loading: rolesLoading, error: rolesError, refresh: refreshRoles } = useLoad(() =>
    api.rcRoles().then((r) => r.roles),
  );

  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [contactForm, setContactForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "candidate",
    source: "",
    currentCompany: "",
    desiredRole: "",
    salaryExpectationCents: "",
    availabilityDate: "",
    candidateStage: "sourced",
  });
  const [roleForm, setRoleForm] = useState({
    title: "",
    clientCompany: "",
    requisitionCode: "",
    priority: "medium",
    employmentType: "full_time",
    location: "",
    remotePolicy: "hybrid",
    salaryMinCents: "",
    salaryMaxCents: "",
    targetStartDate: "",
    pipelineStage: "intake",
    clientContactId: "",
  });

  const contactRows = contacts ?? [];
  const roleRows = roles ?? [];
  const openRoles = roleRows.filter((role) => role.status === "open" || role.status === "interviewing").length;
  const urgentCount = roleRows.filter((role) => role.priority === "urgent" || role.priority === "high").length;

  const createContact = async () => {
    setActionError("");
    setActionNotice("");
    try {
      await api.createRcContact({
        ...contactForm,
        salaryExpectationCents: contactForm.salaryExpectationCents ? Number(contactForm.salaryExpectationCents) : undefined,
        availabilityDate: contactForm.availabilityDate ? new Date(contactForm.availabilityDate).toISOString() : undefined,
      });
      setContactForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        role: "candidate",
        source: "",
        currentCompany: "",
        desiredRole: "",
        salaryExpectationCents: "",
        availabilityDate: "",
        candidateStage: "sourced",
      });
      setActionNotice("Contact added to the talent registry.");
      await refreshContacts();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to add contact.");
    }
  };

  const createRole = async () => {
    setActionError("");
    setActionNotice("");
    try {
      if (!roleForm.title.trim()) throw new Error("Role title is required.");
      await api.createRcRole({
        title: roleForm.title,
        clientCompany: roleForm.clientCompany || undefined,
        requisitionCode: roleForm.requisitionCode || undefined,
        priority: roleForm.priority,
        employmentType: roleForm.employmentType,
        location: roleForm.location || undefined,
        remotePolicy: roleForm.remotePolicy,
        salaryMinCents: roleForm.salaryMinCents ? Number(roleForm.salaryMinCents) : undefined,
        salaryMaxCents: roleForm.salaryMaxCents ? Number(roleForm.salaryMaxCents) : undefined,
        targetStartDate: roleForm.targetStartDate ? new Date(roleForm.targetStartDate).toISOString() : undefined,
        pipelineStage: roleForm.pipelineStage,
        clientContactId: roleForm.clientContactId || undefined,
      });
      setRoleForm({
        title: "",
        clientCompany: "",
        requisitionCode: "",
        priority: "medium",
        employmentType: "full_time",
        location: "",
        remotePolicy: "hybrid",
        salaryMinCents: "",
        salaryMaxCents: "",
        targetStartDate: "",
        pipelineStage: "intake",
        clientContactId: "",
      });
      setActionNotice("Requisition opened on the pipeline board.");
      await refreshRoles();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to add role.");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await api.updateRcRoleStatus(id, status);
    await refreshRoles();
  };

  return (
    <RecruitmentToolShell
      lane="pipeline"
      eyebrow="Station 01 · Role pipeline"
      title="Requisition & Talent Registry"
      description="Register candidates and clients, open requisitions, and track pipeline stage from intake through placement."
      stats={[
        { label: "Contacts", value: contactRows.length },
        { label: "Open roles", value: openRoles, tone: "accent" },
        { label: "High priority", value: urgentCount, tone: urgentCount > 0 ? "warn" : "ok" },
      ]}
    >
      {(contactsError || rolesError) ? <p className="mail-view-error">{contactsError || rolesError}</p> : null}
      {actionError ? <p className="mail-view-error">{actionError}</p> : null}
      {actionNotice ? <p className="mail-view-success">{actionNotice}</p> : null}

      <div className="industry-ws-tool-layout industry-ws-tool-layout--split">
        <section className="industry-ws-intake-panel">
          <RecruitmentSectionHead
            code="A"
            title="New contact"
            description="Add candidates, clients, or hiring managers used across submissions and outreach."
          />
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <input placeholder="First name" value={contactForm.firstName} onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })} />
            <input placeholder="Last name" value={contactForm.lastName} onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })} />
          </div>
          <input type="email" placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <input placeholder="Source" value={contactForm.source} onChange={(e) => setContactForm({ ...contactForm, source: e.target.value })} />
            <input placeholder="Current company" value={contactForm.currentCompany} onChange={(e) => setContactForm({ ...contactForm, currentCompany: e.target.value })} />
          </div>
          <input placeholder="Desired role" value={contactForm.desiredRole} onChange={(e) => setContactForm({ ...contactForm, desiredRole: e.target.value })} />
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <input type="number" placeholder="Salary expectation (cents)" value={contactForm.salaryExpectationCents} onChange={(e) => setContactForm({ ...contactForm, salaryExpectationCents: e.target.value })} />
            <input type="date" aria-label="Availability date" value={contactForm.availabilityDate} onChange={(e) => setContactForm({ ...contactForm, availabilityDate: e.target.value })} />
          </div>
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <select value={contactForm.candidateStage} onChange={(e) => setContactForm({ ...contactForm, candidateStage: e.target.value })}>
              <option value="sourced">Sourced</option>
              <option value="screening">Screening</option>
              <option value="submitted">Submitted</option>
              <option value="interviewing">Interviewing</option>
              <option value="offer">Offer</option>
              <option value="placed">Placed</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={contactForm.role} onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}>
              <option value="candidate">Candidate</option>
              <option value="client">Client</option>
              <option value="hiring_manager">Hiring manager</option>
            </select>
          </div>
          <button type="button" className="mail-toolbar-btn industry-ws-action-btn" onClick={() => void createContact()}>
            Add contact
          </button>
        </section>

        <section className="industry-ws-intake-panel industry-ws-intake-panel--primary">
          <RecruitmentSectionHead
            code="B"
            title="Open requisition"
            description="Define compensation band, employment type, and pipeline stage for a new role."
          />
          <input placeholder="Role title" value={roleForm.title} onChange={(e) => setRoleForm({ ...roleForm, title: e.target.value })} />
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <input placeholder="Client company" value={roleForm.clientCompany} onChange={(e) => setRoleForm({ ...roleForm, clientCompany: e.target.value })} />
            <input placeholder="Requisition code" value={roleForm.requisitionCode} onChange={(e) => setRoleForm({ ...roleForm, requisitionCode: e.target.value })} />
          </div>
          <input placeholder="Location" value={roleForm.location} onChange={(e) => setRoleForm({ ...roleForm, location: e.target.value })} />
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <input type="number" placeholder="Salary min (cents)" value={roleForm.salaryMinCents} onChange={(e) => setRoleForm({ ...roleForm, salaryMinCents: e.target.value })} />
            <input type="number" placeholder="Salary max (cents)" value={roleForm.salaryMaxCents} onChange={(e) => setRoleForm({ ...roleForm, salaryMaxCents: e.target.value })} />
          </div>
          <input type="date" aria-label="Target start date" value={roleForm.targetStartDate} onChange={(e) => setRoleForm({ ...roleForm, targetStartDate: e.target.value })} />
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <select value={roleForm.priority} onChange={(e) => setRoleForm({ ...roleForm, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <select value={roleForm.employmentType} onChange={(e) => setRoleForm({ ...roleForm, employmentType: e.target.value })}>
              <option value="full_time">Full time</option>
              <option value="part_time">Part time</option>
              <option value="contract">Contract</option>
              <option value="temporary">Temporary</option>
              <option value="internship">Internship</option>
            </select>
          </div>
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <select value={roleForm.remotePolicy} onChange={(e) => setRoleForm({ ...roleForm, remotePolicy: e.target.value })}>
              <option value="onsite">Onsite</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </select>
            <select value={roleForm.pipelineStage} onChange={(e) => setRoleForm({ ...roleForm, pipelineStage: e.target.value })}>
              <option value="intake">Intake</option>
              <option value="sourcing">Sourcing</option>
              <option value="screening">Screening</option>
              <option value="interviewing">Interviewing</option>
              <option value="offer">Offer</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <select value={roleForm.clientContactId} onChange={(e) => setRoleForm({ ...roleForm, clientContactId: e.target.value })}>
            <option value="">Client contact (optional)</option>
            {contactRows.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.firstName} {contact.lastName}
              </option>
            ))}
          </select>
          <button type="button" className="mail-toolbar-btn industry-ws-action-btn" onClick={() => void createRole()}>
            Add role
          </button>
        </section>
      </div>

      {contactsLoading || rolesLoading ? <p className="mail-view-empty">Loading pipeline…</p> : null}

      <section className="industry-ws-record-panel">
        <RecruitmentSectionHead code="Roles" title="Open requisition board" description="Review status, pipeline stage, and linked interview activity." />
        {roleRows.length ? (
          <div className="industry-ws-board-grid">
            {roleRows.map((role) => (
              <article key={role.id} className={`industry-ws-board-card industry-ws-board-card--${role.priority}`}>
                <div className="industry-ws-board-card-top">
                  <div>
                    <span className="industry-ws-board-id">{role.title}</span>
                    <p className="industry-ws-board-subtitle">
                      {role.requisitionCode ? `Req ${role.requisitionCode}` : "No requisition"} · {role.clientCompany ?? "No company"}
                    </p>
                  </div>
                  <RecruitmentStatusPill label={formatStatusLabel(role.status)} tone={role.status === "open" ? "accent" : undefined} />
                </div>
                <div className="industry-ws-meta-row">
                  <span>{formatStatusLabel(role.pipelineStage)}</span>
                  <span>{formatStatusLabel(role.employmentType)}</span>
                  <span>{formatStatusLabel(role.remotePolicy)}</span>
                </div>
                <p>
                  {role.interviewCount} interviews · {role.submissionCount} submissions · {role.campaignCount} campaigns · {role.placementCount} placements
                </p>
                <p>
                  {role.location ?? "Location TBD"}
                  {role.targetStartDate ? ` · Starts ${new Date(role.targetStartDate).toLocaleDateString()}` : ""}
                </p>
                {role.salaryMinCents || role.salaryMaxCents ? (
                  <p>Salary: {formatCompensation(role.salaryMinCents)} – {formatCompensation(role.salaryMaxCents)}</p>
                ) : null}
                {role.clientName ? <p>Client: {role.clientName}</p> : null}
                <RecruitmentStatusPill label={role.priority.toUpperCase()} tone={priorityTone(role.priority)} />
                <select defaultValue={role.status} onChange={(e) => void updateStatus(role.id, e.target.value)}>
                  <option value="open">Open</option>
                  <option value="interviewing">Interviewing</option>
                  <option value="filled">Filled</option>
                  <option value="on_hold">On hold</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <code className="feature-id">{role.id}</code>
              </article>
            ))}
          </div>
        ) : (
          <RecruitmentEmptyState title="No requisitions yet" body="Open a role to start tracking sourcing, submissions, and interview activity." />
        )}
      </section>
    </RecruitmentToolShell>
  );
}

export function InterviewDeskPanel() {
  const { data: roles } = useLoad(() => api.rcRoles().then((r) => r.roles));
  const { data: contacts } = useLoad(() => api.rcContacts("candidate").then((r) => r.contacts));
  const { data: interviews, loading, error, refresh } = useLoad(() => api.rcInterviews().then((r) => r.interviews));
  const { data: submissions, refresh: refreshSubmissions } = useLoad(() => api.rcSubmissions().then((r) => r.submissions));
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [form, setForm] = useState({
    roleId: "",
    firstName: "",
    lastName: "",
    email: "",
    scheduledAt: "",
    interviewType: "phone_screen",
    roundNumber: "1",
    interviewerName: "",
    notes: "",
  });
  const [submissionForm, setSubmissionForm] = useState({
    roleId: "",
    contactId: "",
    source: "",
    score: "",
    notes: "",
  });

  const interviewRows = interviews ?? [];
  const submissionRows = submissions ?? [];
  const todayKey = new Date().toDateString();
  const todayCount = interviewRows.filter((interview) => new Date(interview.scheduledAt).toDateString() === todayKey).length;
  const noShowCount = interviewRows.filter((interview) => interview.status === "no_show").length;
  const activeSubmissions = submissionRows.filter((submission) => !["rejected", "hired"].includes(submission.stage)).length;

  const sortedInterviews = useMemo(
    () => [...interviewRows].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [interviewRows],
  );

  const scheduleInterview = async () => {
    setActionError("");
    setActionNotice("");
    try {
      if (!form.roleId) throw new Error("Select a role.");
      if (!form.firstName.trim() || !form.lastName.trim()) throw new Error("Candidate name is required.");
      if (!form.scheduledAt) throw new Error("Scheduled time is required.");
      await api.createRcInterview({
        roleId: form.roleId,
        contact: { firstName: form.firstName, lastName: form.lastName, email: form.email || undefined },
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        interviewType: form.interviewType,
        roundNumber: form.roundNumber ? Number(form.roundNumber) : undefined,
        interviewerName: form.interviewerName || undefined,
        notes: form.notes || undefined,
      });
      setForm({
        roleId: "",
        firstName: "",
        lastName: "",
        email: "",
        scheduledAt: "",
        interviewType: "phone_screen",
        roundNumber: "1",
        interviewerName: "",
        notes: "",
      });
      setActionNotice("Interview scheduled.");
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to schedule interview.");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await api.updateRcInterviewStatus(id, {
      status,
      feedbackStatus: status === "completed" ? "submitted" : undefined,
      score: status === "completed" ? 85 : undefined,
    });
    await refresh();
  };

  const createSubmission = async () => {
    setActionError("");
    setActionNotice("");
    try {
      if (!submissionForm.roleId || !submissionForm.contactId) throw new Error("Select a role and candidate.");
      await api.createRcSubmission({
        roleId: submissionForm.roleId,
        contactId: submissionForm.contactId,
        source: submissionForm.source || undefined,
        score: submissionForm.score ? Number(submissionForm.score) : undefined,
        notes: submissionForm.notes || undefined,
      });
      setSubmissionForm({ roleId: "", contactId: "", source: "", score: "", notes: "" });
      setActionNotice("Candidate submitted to the role.");
      await refreshSubmissions();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to submit candidate.");
    }
  };

  const updateSubmissionStage = async (id: string, stage: string) => {
    await api.updateRcSubmissionStage(id, stage);
    await refreshSubmissions();
  };

  return (
    <RecruitmentToolShell
      lane="schedule"
      eyebrow="Station 02 · Interview desk"
      title="Interview & Submission Console"
      description="Schedule panel rounds, track today's queue, and advance submitted candidates through the hiring funnel."
      stats={[
        { label: "Today", value: todayCount, tone: "accent" },
        { label: "No-shows", value: noShowCount, tone: noShowCount > 0 ? "warn" : "ok" },
        { label: "Active subs", value: activeSubmissions, tone: activeSubmissions > 0 ? "accent" : "ok" },
      ]}
    >
      {error ? <p className="mail-view-error">{error}</p> : null}
      {actionError ? <p className="mail-view-error">{actionError}</p> : null}
      {actionNotice ? <p className="mail-view-success">{actionNotice}</p> : null}

      <div className="industry-ws-tool-layout industry-ws-tool-layout--schedule">
        <section className="industry-ws-intake-panel industry-ws-intake-panel--primary">
          <RecruitmentSectionHead code="Book" title="Schedule interview" description="Attach the session to a role with type, round, and interviewer details." />
          <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
            <option value="">Select role</option>
            {(roles ?? []).map((role) => (
              <option key={role.id} value={role.id}>
                {role.title}
                {role.clientCompany ? ` · ${role.clientCompany}` : ""}
              </option>
            ))}
          </select>
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <input placeholder="Candidate first name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <input placeholder="Candidate last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <input type="email" placeholder="Candidate email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input type="datetime-local" aria-label="Scheduled time" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <select value={form.interviewType} onChange={(e) => setForm({ ...form, interviewType: e.target.value })}>
              <option value="phone_screen">Phone screen</option>
              <option value="technical">Technical</option>
              <option value="panel">Panel</option>
              <option value="client">Client</option>
              <option value="final">Final</option>
            </select>
            <input type="number" placeholder="Round" value={form.roundNumber} onChange={(e) => setForm({ ...form, roundNumber: e.target.value })} />
          </div>
          <input placeholder="Interviewer" value={form.interviewerName} onChange={(e) => setForm({ ...form, interviewerName: e.target.value })} />
          <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button type="button" className="mail-toolbar-btn industry-ws-action-btn" onClick={() => void scheduleInterview()}>
            Schedule interview
          </button>
        </section>

        <section className="industry-ws-record-panel industry-ws-record-panel--timeline">
          <RecruitmentSectionHead code="Queue" title="Interview timeline" description="Today's and upcoming sessions sorted by scheduled time." />
          {loading ? <p className="mail-view-empty">Loading interviews…</p> : null}
          {sortedInterviews.length ? (
            <div className="industry-ws-timeline">
              {sortedInterviews.map((interview) => {
                const scheduled = new Date(interview.scheduledAt);
                const isToday = scheduled.toDateString() === todayKey;
                const statusTone: StatTone | undefined =
                  interview.status === "no_show" ? "warn" : interview.status === "completed" ? "ok" : "accent";

                return (
                  <article key={interview.id} className={`industry-ws-timeline-card${isToday ? " industry-ws-timeline-card--today" : ""}`}>
                    <div className="industry-ws-timeline-time">
                      <strong>{scheduled.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</strong>
                      <span>{scheduled.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                    </div>
                    <div className="industry-ws-timeline-body">
                      <div className="industry-ws-board-card-top">
                        <div>
                          <span className="industry-ws-board-id">{interview.role.title}</span>
                          <p className="industry-ws-board-subtitle">{interview.contactName}</p>
                        </div>
                        <RecruitmentStatusPill label={formatStatusLabel(interview.status)} tone={statusTone} />
                      </div>
                      <div className="industry-ws-meta-row">
                        <span>{formatStatusLabel(interview.interviewType)}</span>
                        <span>Round {interview.roundNumber}</span>
                        <span>Feedback: {formatStatusLabel(interview.feedbackStatus)}</span>
                      </div>
                      {interview.score != null ? <p>Score {interview.score}</p> : null}
                      {interview.interviewerName ? <p>Interviewer: {interview.interviewerName}</p> : null}
                      <select defaultValue={interview.status} onChange={(e) => void updateStatus(interview.id, e.target.value)}>
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
            <RecruitmentEmptyState title="Interview queue is clear" body="Schedule a session to populate the daily timeline." />
          )}
        </section>
      </div>

      <div className="industry-ws-tool-layout industry-ws-tool-layout--split">
        <section className="industry-ws-intake-panel">
          <RecruitmentSectionHead code="Submit" title="Submit candidate" description="Link a sourced candidate to a requisition with score and notes." />
          <select value={submissionForm.roleId} onChange={(e) => setSubmissionForm({ ...submissionForm, roleId: e.target.value })}>
            <option value="">Select role</option>
            {(roles ?? []).map((role) => (
              <option key={role.id} value={role.id}>{role.title}</option>
            ))}
          </select>
          <select value={submissionForm.contactId} onChange={(e) => setSubmissionForm({ ...submissionForm, contactId: e.target.value })}>
            <option value="">Select candidate</option>
            {(contacts ?? []).map((contact) => (
              <option key={contact.id} value={contact.id}>{contact.firstName} {contact.lastName}</option>
            ))}
          </select>
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <input placeholder="Source" value={submissionForm.source} onChange={(e) => setSubmissionForm({ ...submissionForm, source: e.target.value })} />
            <input type="number" placeholder="Score" value={submissionForm.score} onChange={(e) => setSubmissionForm({ ...submissionForm, score: e.target.value })} />
          </div>
          <input placeholder="Notes" value={submissionForm.notes} onChange={(e) => setSubmissionForm({ ...submissionForm, notes: e.target.value })} />
          <button type="button" className="mail-toolbar-btn industry-ws-action-btn" onClick={() => void createSubmission()}>
            Submit candidate
          </button>
        </section>

        <section className="industry-ws-record-panel">
          <RecruitmentSectionHead code="Subs" title="Submission board" description="Advance candidates through shortlist, interview, and offer stages." />
          {submissionRows.length ? (
            <div className="industry-ws-board-grid">
              {submissionRows.map((submission) => (
                <article key={submission.id} className="industry-ws-board-card">
                  <div className="industry-ws-board-card-top">
                    <div>
                      <span className="industry-ws-board-id">{submission.candidateName}</span>
                      <p className="industry-ws-board-subtitle">{submission.role.title}</p>
                    </div>
                    <RecruitmentStatusPill label={formatStatusLabel(submission.stage)} tone="accent" />
                  </div>
                  <p>
                    {submission.source ?? "No source"}
                    {submission.score != null ? ` · Score ${submission.score}` : ""}
                  </p>
                  <select defaultValue={submission.stage} onChange={(e) => void updateSubmissionStage(submission.id, e.target.value)}>
                    <option value="submitted">Submitted</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="interviewing">Interviewing</option>
                    <option value="offer">Offer</option>
                    <option value="rejected">Rejected</option>
                    <option value="hired">Hired</option>
                  </select>
                </article>
              ))}
            </div>
          ) : (
            <RecruitmentEmptyState title="No submissions yet" body="Submit a candidate to a role to track funnel progression." />
          )}
        </section>
      </div>
    </RecruitmentToolShell>
  );
}

export function BulkOutreachPanel({ onUseTemplate }: { onUseTemplate: (t: { subject: string; html: string }) => void }) {
  const { data, loading, error } = useLoad(() => api.rcTemplates().then((r) => r.templates));
  const { data: roles } = useLoad(() => api.rcRoles().then((r) => r.roles));
  const { data: campaigns, refresh: refreshCampaigns } = useLoad(() => api.rcCampaigns().then((r) => r.campaigns));
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    roleId: "",
    channel: "email",
    audience: "sourced_candidates",
    subject: "",
    bodyHtml: "",
    scheduledFor: "",
  });

  const campaignRows = campaigns ?? [];
  const templateRows = data ?? [];
  const activeCampaigns = campaignRows.filter((campaign) => ["scheduled", "sent"].includes(campaign.status)).length;

  const createCampaign = async () => {
    setActionError("");
    setActionNotice("");
    try {
      if (!campaignForm.name.trim()) throw new Error("Campaign name is required.");
      await api.createRcCampaign({
        name: campaignForm.name,
        roleId: campaignForm.roleId || undefined,
        channel: campaignForm.channel,
        audience: campaignForm.audience,
        subject: campaignForm.subject || undefined,
        bodyHtml: campaignForm.bodyHtml || undefined,
        scheduledFor: campaignForm.scheduledFor || undefined,
      });
      setCampaignForm({ name: "", roleId: "", channel: "email", audience: "sourced_candidates", subject: "", bodyHtml: "", scheduledFor: "" });
      setActionNotice("Outreach campaign created.");
      await refreshCampaigns();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to create campaign.");
    }
  };

  const updateCampaignStatus = async (id: string, status: string) => {
    await api.updateRcCampaignStatus(id, status);
    await refreshCampaigns();
  };

  return (
    <RecruitmentToolShell
      lane="outreach"
      eyebrow="Station 03 · Bulk outreach"
      title="Campaign & Template Hub"
      description="Launch queued candidate outreach, monitor send performance, and pull pre-approved mail templates."
      stats={[
        { label: "Campaigns", value: campaignRows.length, tone: "accent" },
        { label: "Active sends", value: activeCampaigns, tone: activeCampaigns > 0 ? "warn" : "ok" },
        { label: "Templates", value: templateRows.length },
      ]}
    >
      {error ? <p className="mail-view-error">{error}</p> : null}
      {actionError ? <p className="mail-view-error">{actionError}</p> : null}
      {actionNotice ? <p className="mail-view-success">{actionNotice}</p> : null}

      <div className="industry-ws-tool-layout industry-ws-tool-layout--split">
        <section className="industry-ws-intake-panel industry-ws-intake-panel--primary">
          <RecruitmentSectionHead code="Launch" title="Create campaign" description="Queue a channel-specific send with audience targeting and optional role scope." />
          <input placeholder="Campaign name" value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} />
          <select value={campaignForm.roleId} onChange={(e) => setCampaignForm({ ...campaignForm, roleId: e.target.value })}>
            <option value="">All roles</option>
            {(roles ?? []).map((role) => (
              <option key={role.id} value={role.id}>{role.title}</option>
            ))}
          </select>
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <select value={campaignForm.channel} onChange={(e) => setCampaignForm({ ...campaignForm, channel: e.target.value })}>
              <option value="email">Email</option>
              <option value="linkedin">LinkedIn</option>
              <option value="sms">SMS</option>
              <option value="phone">Phone</option>
            </select>
            <input placeholder="Audience" value={campaignForm.audience} onChange={(e) => setCampaignForm({ ...campaignForm, audience: e.target.value })} />
          </div>
          <input placeholder="Email subject" value={campaignForm.subject} onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })} />
          <textarea placeholder="Email body (HTML)" value={campaignForm.bodyHtml} onChange={(e) => setCampaignForm({ ...campaignForm, bodyHtml: e.target.value })} />
          <input type="datetime-local" value={campaignForm.scheduledFor} onChange={(e) => setCampaignForm({ ...campaignForm, scheduledFor: e.target.value })} />
          <button type="button" className="mail-toolbar-btn industry-ws-action-btn" onClick={() => void createCampaign()}>
            Create campaign
          </button>
        </section>

        <section className="industry-ws-record-panel">
          <RecruitmentSectionHead code="Queue" title="Campaign board" description="Track channel, audience, send counts, and campaign status." />
          {campaignRows.length ? (
            <div className="industry-ws-board-grid">
              {campaignRows.map((campaign) => (
                <article key={campaign.id} className="industry-ws-board-card">
                  <div className="industry-ws-board-card-top">
                    <div>
                      <span className="industry-ws-board-id">{campaign.name}</span>
                      <p className="industry-ws-board-subtitle">{formatStatusLabel(campaign.channel)} · {campaign.audience}</p>
                    </div>
                    <RecruitmentStatusPill
                      label={formatStatusLabel(campaign.status)}
                      tone={campaign.status === "sent" ? "ok" : campaign.status === "paused" ? "warn" : "accent"}
                    />
                  </div>
                  <p>
                    {campaign.sentCount} sent · {campaign.replyCount} replies
                    {campaign.launchedAt ? ` · Launched ${new Date(campaign.launchedAt).toLocaleString()}` : ""}
                  </p>
                  {campaign.role ? <p>Role: {campaign.role.title}</p> : null}
                  <div className="industry-ws-field-grid industry-ws-field-grid--duo">
                    <button type="button" className="mail-toolbar-btn" onClick={() => void api.launchRcCampaign(campaign.id).then(refreshCampaigns)}>
                      Launch now
                    </button>
                    <select defaultValue={campaign.status} onChange={(e) => void updateCampaignStatus(campaign.id, e.target.value)}>
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="sent">Sent</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <RecruitmentEmptyState title="No campaigns queued" body="Create a campaign to start tracked bulk outreach to sourced candidates." />
          )}
        </section>
      </div>

      <section className="industry-ws-record-panel industry-ws-record-panel--templates">
        <RecruitmentSectionHead code="Mail" title="Outreach templates" description="Launch pre-approved messaging into the compose workspace." />
        {loading ? <p className="mail-view-empty">Loading templates…</p> : null}
        {templateRows.length ? (
          <div className="industry-ws-template-grid">
            {templateRows.map((template) => (
              <article key={template.id} className="industry-ws-template-card">
                <h3>{template.name}</h3>
                <p>{template.description}</p>
                <p className="industry-ws-template-subject">
                  <strong>Subject:</strong> {template.subject}
                </p>
                <button
                  type="button"
                  className="mail-toolbar-btn industry-ws-action-btn"
                  onClick={() => onUseTemplate({ subject: template.subject, html: template.bodyHtml })}
                >
                  Use template
                </button>
              </article>
            ))}
          </div>
        ) : (
          <RecruitmentEmptyState title="No templates loaded" body="Recruitment outreach templates will appear here once seeded for the tenant." />
        )}
      </section>
    </RecruitmentToolShell>
  );
}

export function TalentSearchPanel() {
  const [mailQuery, setMailQuery] = useState("");
  const [mailResults, setMailResults] = useState<Array<{ uid: number; subject: string; from: string; date: string; snippet: string }>>([]);
  const [mailError, setMailError] = useState("");
  const { data: roles } = useLoad(() => api.rcRoles().then((r) => r.roles));
  const { data: contacts } = useLoad(() => api.rcContacts("candidate").then((r) => r.contacts));
  const { data: placements, loading, error, refresh } = useLoad(() => api.rcPlacements().then((r) => r.placements));
  const { data: referenceChecks, refresh: refreshReferenceChecks } = useLoad(() =>
    api.rcReferenceChecks().then((r) => r.referenceChecks),
  );
  const [selectedPlacementId, setSelectedPlacementId] = useState("");
  const { data: notes, refresh: refreshNotes } = useLoad(
    () => (selectedPlacementId ? api.rcPlacementNotes(selectedPlacementId).then((r) => r.notes) : Promise.resolve([])),
    [selectedPlacementId],
  );
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [placementForm, setPlacementForm] = useState({
    roleId: "",
    title: "",
    compensationCents: "",
    candidateContactId: "",
    startDate: "",
    recruiterFeeCents: "",
    guaranteeEndDate: "",
  });
  const [referenceForm, setReferenceForm] = useState({
    contactId: "",
    placementId: "",
    refereeName: "",
    refereeEmail: "",
    relationship: "",
  });
  const [noteBody, setNoteBody] = useState("");

  const placementRows = placements ?? [];
  const referenceRows = referenceChecks ?? [];
  const openPlacements = placementRows.filter((placement) => !["placed", "withdrawn"].includes(placement.status)).length;
  const pendingReferences = referenceRows.filter((check) => check.status === "requested" || check.status === "in_progress").length;

  const searchMail = async () => {
    setMailError("");
    try {
      const { results } = await api.rcTalentMailSearch(mailQuery);
      setMailResults(results);
    } catch (err) {
      setMailError(err instanceof Error ? err.message : "Mail search failed");
    }
  };

  const createPlacement = async () => {
    setActionError("");
    setActionNotice("");
    try {
      if (!placementForm.roleId || !placementForm.title.trim()) throw new Error("Role and placement title are required.");
      await api.createRcPlacement({
        roleId: placementForm.roleId,
        title: placementForm.title,
        compensationCents: placementForm.compensationCents ? Number(placementForm.compensationCents) : undefined,
        candidateContactId: placementForm.candidateContactId || undefined,
        startDate: placementForm.startDate ? new Date(placementForm.startDate).toISOString() : undefined,
        recruiterFeeCents: placementForm.recruiterFeeCents ? Number(placementForm.recruiterFeeCents) : undefined,
        guaranteeEndDate: placementForm.guaranteeEndDate ? new Date(placementForm.guaranteeEndDate).toISOString() : undefined,
      });
      setPlacementForm({
        roleId: "",
        title: "",
        compensationCents: "",
        candidateContactId: "",
        startDate: "",
        recruiterFeeCents: "",
        guaranteeEndDate: "",
      });
      setActionNotice("Placement opened.");
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to open placement.");
    }
  };

  const addNote = async () => {
    if (!selectedPlacementId || !noteBody.trim()) return;
    await api.createRcPlacementNote(selectedPlacementId, noteBody);
    setNoteBody("");
    await refreshNotes();
  };

  const updateStatus = async (id: string, status: string) => {
    await api.updateRcPlacementStatus(id, {
      status,
      onboardingStatus: status === "placed" ? "started" : undefined,
    });
    await refresh();
  };

  const createReferenceCheck = async () => {
    setActionError("");
    setActionNotice("");
    try {
      if (!referenceForm.contactId || !referenceForm.refereeName.trim()) throw new Error("Candidate and referee name are required.");
      await api.createRcReferenceCheck({
        contactId: referenceForm.contactId,
        placementId: referenceForm.placementId || undefined,
        refereeName: referenceForm.refereeName,
        refereeEmail: referenceForm.refereeEmail || undefined,
        relationship: referenceForm.relationship || undefined,
      });
      setReferenceForm({ contactId: "", placementId: "", refereeName: "", refereeEmail: "", relationship: "" });
      setActionNotice("Reference check requested.");
      await refreshReferenceChecks();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to request reference.");
    }
  };

  const updateReferenceStatus = async (id: string, status: string) => {
    await api.updateRcReferenceCheckStatus(id, status);
    await refreshReferenceChecks();
  };

  const selectedPlacement = placementRows.find((placement) => placement.id === selectedPlacementId);

  return (
    <RecruitmentToolShell
      lane="search"
      eyebrow="Station 04 · Talent search"
      title="Placement & Reference Console"
      description="Open placements, request reference checks, and review onboarding notes across active searches."
      stats={[
        { label: "Open placements", value: openPlacements, tone: openPlacements > 0 ? "accent" : "ok" },
        { label: "Pending refs", value: pendingReferences, tone: pendingReferences > 0 ? "warn" : "ok" },
        { label: "Total records", value: placementRows.length },
      ]}
    >
      {error ? <p className="mail-view-error">{error}</p> : null}
      {actionError ? <p className="mail-view-error">{actionError}</p> : null}
      {actionNotice ? <p className="mail-view-success">{actionNotice}</p> : null}

      <section className="industry-ws-intake-panel industry-ws-intake-panel--primary" style={{ marginBottom: "1rem" }}>
        <RecruitmentSectionHead code="Mail" title="Candidate mail search" description="Search inbox for messages from known recruitment contacts (IMAP + contact matching)." />
        <input placeholder="from:resume OR subject:application" value={mailQuery} onChange={(e) => setMailQuery(e.target.value)} />
        <button type="button" className="mail-toolbar-btn" onClick={() => void searchMail()}>
          Search mail
        </button>
        {mailError ? <p className="mail-view-error">{mailError}</p> : null}
        {mailResults.length > 0 ? (
          <div className="feature-list">
            {mailResults.map((row) => (
              <article key={row.uid} className="feature-list-card">
                <strong>{row.subject}</strong>
                <p>{row.from}</p>
                <p className="muted">{row.snippet}</p>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <div className="industry-ws-tool-layout industry-ws-tool-layout--split">
        <section className="industry-ws-intake-panel">
          <RecruitmentSectionHead code="Place" title="Open placement" description="Link a candidate to a role with compensation, fee, and guarantee window." />
          <select value={placementForm.roleId} onChange={(e) => setPlacementForm({ ...placementForm, roleId: e.target.value })}>
            <option value="">Select role</option>
            {(roles ?? []).map((role) => (
              <option key={role.id} value={role.id}>
                {role.title}
                {role.clientCompany ? ` · ${role.clientCompany}` : ""}
              </option>
            ))}
          </select>
          <input placeholder="Placement title" value={placementForm.title} onChange={(e) => setPlacementForm({ ...placementForm, title: e.target.value })} />
          <input placeholder="Compensation (cents)" value={placementForm.compensationCents} onChange={(e) => setPlacementForm({ ...placementForm, compensationCents: e.target.value })} />
          <select value={placementForm.candidateContactId} onChange={(e) => setPlacementForm({ ...placementForm, candidateContactId: e.target.value })}>
            <option value="">Candidate (optional)</option>
            {(contacts ?? []).map((contact) => (
              <option key={contact.id} value={contact.id}>{contact.firstName} {contact.lastName}</option>
            ))}
          </select>
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <input type="date" aria-label="Start date" value={placementForm.startDate} onChange={(e) => setPlacementForm({ ...placementForm, startDate: e.target.value })} />
            <input type="date" aria-label="Guarantee end date" value={placementForm.guaranteeEndDate} onChange={(e) => setPlacementForm({ ...placementForm, guaranteeEndDate: e.target.value })} />
          </div>
          <input placeholder="Recruiter fee (cents)" value={placementForm.recruiterFeeCents} onChange={(e) => setPlacementForm({ ...placementForm, recruiterFeeCents: e.target.value })} />
          <button type="button" className="mail-toolbar-btn industry-ws-action-btn" onClick={() => void createPlacement()}>
            Open placement
          </button>
        </section>

        <section className="industry-ws-intake-panel industry-ws-intake-panel--primary">
          <RecruitmentSectionHead code="Ref" title="Request reference" description="Queue a referee check tied to a candidate and optional placement." />
          <select value={referenceForm.contactId} onChange={(e) => setReferenceForm({ ...referenceForm, contactId: e.target.value })}>
            <option value="">Select candidate</option>
            {(contacts ?? []).map((contact) => (
              <option key={contact.id} value={contact.id}>{contact.firstName} {contact.lastName}</option>
            ))}
          </select>
          <select value={referenceForm.placementId} onChange={(e) => setReferenceForm({ ...referenceForm, placementId: e.target.value })}>
            <option value="">Placement (optional)</option>
            {placementRows.map((placement) => (
              <option key={placement.id} value={placement.id}>{placement.title}</option>
            ))}
          </select>
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <input placeholder="Referee name" value={referenceForm.refereeName} onChange={(e) => setReferenceForm({ ...referenceForm, refereeName: e.target.value })} />
            <input type="email" placeholder="Referee email" value={referenceForm.refereeEmail} onChange={(e) => setReferenceForm({ ...referenceForm, refereeEmail: e.target.value })} />
          </div>
          <input placeholder="Relationship" value={referenceForm.relationship} onChange={(e) => setReferenceForm({ ...referenceForm, relationship: e.target.value })} />
          <button type="button" className="mail-toolbar-btn industry-ws-action-btn" onClick={() => void createReferenceCheck()}>
            Request reference
          </button>
        </section>
      </div>

      {loading ? <p className="mail-view-empty">Loading placements…</p> : null}

      <div className="industry-ws-tool-layout industry-ws-tool-layout--audit">
        <section className="industry-ws-record-panel">
          <RecruitmentSectionHead code="Placements" title="Placement board" description="Review compensation, onboarding posture, and linked reference activity." />
          {placementRows.length ? (
            <div className="industry-ws-board-grid">
              {placementRows.map((placement) => (
                <article
                  key={placement.id}
                  className={`industry-ws-board-card${selectedPlacementId === placement.id ? " industry-ws-board-card--active" : ""}`}
                >
                  <div className="industry-ws-board-card-top">
                    <div>
                      <span className="industry-ws-board-id">{placement.title}</span>
                      <p className="industry-ws-board-subtitle">{placement.role.title} · {formatCompensation(placement.compensationCents)}</p>
                    </div>
                    <RecruitmentStatusPill
                      label={formatStatusLabel(placement.status)}
                      tone={placement.status === "placed" ? "ok" : placement.status === "withdrawn" ? "warn" : "accent"}
                    />
                  </div>
                  <div className="industry-ws-meta-row">
                    <span>Onboarding: {formatStatusLabel(placement.onboardingStatus)}</span>
                    <span>{placement.noteCount} notes</span>
                    <span>{placement.referenceCheckCount} references</span>
                  </div>
                  <p>
                    {placement.startDate ? `Start ${new Date(placement.startDate).toLocaleDateString()}` : "Start TBD"}
                    {placement.recruiterFeeCents ? ` · Fee ${formatCompensation(placement.recruiterFeeCents)}` : ""}
                  </p>
                  {placement.guaranteeEndDate ? <p>Guarantee until {new Date(placement.guaranteeEndDate).toLocaleDateString()}</p> : null}
                  {placement.candidateName ? <p>Candidate: {placement.candidateName}</p> : null}
                  <div className="industry-ws-card-actions">
                    <button type="button" className="mail-toolbar-btn" onClick={() => setSelectedPlacementId(placement.id)}>
                      View notes
                    </button>
                    <select defaultValue={placement.status} onChange={(e) => void updateStatus(placement.id, e.target.value)}>
                      <option value="open">Open</option>
                      <option value="offer">Offer</option>
                      <option value="accepted">Accepted</option>
                      <option value="placed">Placed</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <RecruitmentEmptyState title="No placements yet" body="Open a placement to track offer, onboarding, and reference checks." />
          )}
        </section>

        <section className="industry-ws-record-panel industry-ws-record-panel--stream">
          <RecruitmentSectionHead code="Refs" title="Reference queue" description="Pending and completed referee checks across active candidates." />
          {referenceRows.length ? (
            <div className="industry-ws-stream">
              {referenceRows.map((check) => (
                <article key={check.id} className="industry-ws-stream-event">
                  <div className="industry-ws-stream-marker" aria-hidden="true" />
                  <div>
                    <div className="industry-ws-board-card-top">
                      <strong>{check.refereeName}</strong>
                      <RecruitmentStatusPill
                        label={formatStatusLabel(check.status)}
                        tone={check.status === "completed" ? "ok" : check.status === "failed" ? "alert" : "warn"}
                      />
                    </div>
                    <p>{check.candidateName} · {check.relationship ?? "No relationship"}</p>
                    {check.placement ? <p>Placement: {check.placement.title}</p> : null}
                    {check.completedAt ? (
                      <p className="industry-ws-stream-meta">Completed {new Date(check.completedAt).toLocaleString()}</p>
                    ) : null}
                    <select defaultValue={check.status} onChange={(e) => void updateReferenceStatus(check.id, e.target.value)}>
                      <option value="requested">Requested</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <RecruitmentEmptyState title="Reference queue is empty" body="Request a reference check to validate candidate history." />
          )}
        </section>
      </div>

      {selectedPlacement ? (
        <section className="industry-ws-record-panel industry-ws-record-panel--notes">
          <RecruitmentSectionHead
            code="Notes"
            title={`Team notes · ${selectedPlacement.title}`}
            description="Collaborative placement notes for the selected search record."
          />
          <div className="industry-ws-note-compose">
            <textarea placeholder="Add a placement note…" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} rows={3} />
            <button type="button" className="mail-toolbar-btn industry-ws-action-btn" onClick={() => void addNote()}>
              Add note
            </button>
          </div>
          <ul className="industry-ws-note-list">
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
    </RecruitmentToolShell>
  );
}
