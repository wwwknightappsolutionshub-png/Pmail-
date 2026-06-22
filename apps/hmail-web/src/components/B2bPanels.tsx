import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import "./MailViews.css";

type B2bLane = "workspaces" | "projects" | "proposals" | "sla";
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

function IndustryToolShell({
  lane,
  eyebrow,
  title,
  description,
  stats,
  children,
}: {
  lane: B2bLane;
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
          <span className="industry-ws-hero-eyebrow">{eyebrow}</span>
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

function IndustryEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="industry-ws-empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function IndustrySectionHead({
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

function IndustryStatusPill({ label, tone }: { label: string; tone?: StatTone }) {
  return <span className={`industry-ws-status-pill${tone ? ` industry-ws-status-pill--${tone}` : ""}`}>{label}</span>;
}

export function ClientWorkspacesPanel() {
  const { data: contacts, loading: contactsLoading, error: contactsError, refresh: refreshContacts } = useLoad(() =>
    api.b2bContacts().then((r) => r.contacts),
  );
  const { data: workspaces, loading: workspacesLoading, error: workspacesError, refresh: refreshWorkspaces } = useLoad(() =>
    api.b2bWorkspaces().then((r) => r.workspaces),
  );

  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [contactForm, setContactForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "client",
    company: "",
    title: "",
    decisionRole: "economic_buyer",
  });
  const [workspaceForm, setWorkspaceForm] = useState({
    name: "",
    clientDomain: "",
    accountTier: "standard",
    arrCents: "",
    healthScore: "75",
    brandColor: "",
    routingDomain: "",
    onboardingStage: "kickoff",
    renewalDate: "",
    clientContactId: "",
  });

  const contactRows = contacts ?? [];
  const workspaceRows = workspaces ?? [];
  const activeWorkspaces = workspaceRows.filter((workspace) => workspace.status === "active").length;
  const onboardingCount = workspaceRows.filter((workspace) => workspace.status === "onboarding").length;
  const atRiskCount = workspaceRows.filter((workspace) => (workspace.healthScore ?? 100) < 60).length;

  const createContact = async () => {
    setActionError("");
    setActionNotice("");
    try {
      await api.createB2bContact(contactForm);
      setContactForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        role: "client",
        company: "",
        title: "",
        decisionRole: "economic_buyer",
      });
      setActionNotice("Contact added to the client roster.");
      await refreshContacts();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to add contact.");
    }
  };

  const createWorkspace = async () => {
    setActionError("");
    setActionNotice("");
    try {
      await api.createB2bWorkspace({
        name: workspaceForm.name,
        clientDomain: workspaceForm.clientDomain || undefined,
        accountTier: workspaceForm.accountTier,
        arrCents: workspaceForm.arrCents ? Number(workspaceForm.arrCents) : undefined,
        healthScore: workspaceForm.healthScore ? Number(workspaceForm.healthScore) : undefined,
        brandColor: workspaceForm.brandColor || undefined,
        routingDomain: workspaceForm.routingDomain || undefined,
        onboardingStage: workspaceForm.onboardingStage,
        renewalDate: dateTimeToIso(workspaceForm.renewalDate),
        clientContactId: workspaceForm.clientContactId || undefined,
      });
      setWorkspaceForm({
        name: "",
        clientDomain: "",
        accountTier: "standard",
        arrCents: "",
        healthScore: "75",
        brandColor: "",
        routingDomain: "",
        onboardingStage: "kickoff",
        renewalDate: "",
        clientContactId: "",
      });
      setActionNotice("Client workspace provisioned.");
      await refreshWorkspaces();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to add workspace.");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await api.updateB2bWorkspaceStatus(id, status);
    await refreshWorkspaces();
  };

  return (
    <IndustryToolShell
      lane="workspaces"
      eyebrow="Station 01 · Client workspaces"
      title="Client Workspaces Hub"
      description="Register client contacts, provision branded mail workspaces, and monitor account health across delivery lanes."
      stats={[
        { label: "Contacts", value: contactRows.length },
        { label: "Active accounts", value: activeWorkspaces, tone: "accent" },
        { label: "At-risk health", value: atRiskCount, tone: atRiskCount > 0 ? "warn" : "ok" },
        { label: "Onboarding", value: onboardingCount, tone: onboardingCount > 0 ? "accent" : "ok" },
      ]}
    >
      {(contactsError || workspacesError) ? <p className="mail-view-error">{contactsError || workspacesError}</p> : null}
      {actionError ? <p className="mail-view-error">{actionError}</p> : null}
      {actionNotice ? <p className="mail-view-success">{actionNotice}</p> : null}

      <div className="industry-ws-tool-layout industry-ws-tool-layout--split">
        <section className="industry-ws-intake-panel">
          <IndustrySectionHead
            code="A"
            title="New contact"
            description="Add client, stakeholder, or vendor contacts used across workspaces and threads."
          />
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <input placeholder="First name" value={contactForm.firstName} onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })} />
            <input placeholder="Last name" value={contactForm.lastName} onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })} />
          </div>
          <input placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <input placeholder="Company" value={contactForm.company} onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })} />
            <input placeholder="Title" value={contactForm.title} onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })} />
          </div>
          <input placeholder="Decision role" value={contactForm.decisionRole} onChange={(e) => setContactForm({ ...contactForm, decisionRole: e.target.value })} />
          <select value={contactForm.role} onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}>
            <option value="client">Client</option>
            <option value="stakeholder">Stakeholder</option>
            <option value="vendor">Vendor</option>
          </select>
          <button type="button" className="mail-toolbar-btn industry-ws-action-btn" onClick={() => void createContact()}>
            Add contact
          </button>
        </section>

        <section className="industry-ws-intake-panel industry-ws-intake-panel--primary">
          <IndustrySectionHead
            code="B"
            title="New workspace"
            description="Provision an isolated branded domain with tier, health score, and onboarding stage."
          />
          <input placeholder="Workspace name" value={workspaceForm.name} onChange={(e) => setWorkspaceForm({ ...workspaceForm, name: e.target.value })} />
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <input placeholder="Client domain" value={workspaceForm.clientDomain} onChange={(e) => setWorkspaceForm({ ...workspaceForm, clientDomain: e.target.value })} />
            <input placeholder="Routing domain" value={workspaceForm.routingDomain} onChange={(e) => setWorkspaceForm({ ...workspaceForm, routingDomain: e.target.value })} />
          </div>
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <input placeholder="Brand color" value={workspaceForm.brandColor} onChange={(e) => setWorkspaceForm({ ...workspaceForm, brandColor: e.target.value })} />
            <input type="number" placeholder="Health score" value={workspaceForm.healthScore} onChange={(e) => setWorkspaceForm({ ...workspaceForm, healthScore: e.target.value })} />
          </div>
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <input type="number" placeholder="ARR cents" value={workspaceForm.arrCents} onChange={(e) => setWorkspaceForm({ ...workspaceForm, arrCents: e.target.value })} />
            <input type="date" aria-label="Renewal date" value={workspaceForm.renewalDate} onChange={(e) => setWorkspaceForm({ ...workspaceForm, renewalDate: e.target.value })} />
          </div>
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <select value={workspaceForm.accountTier} onChange={(e) => setWorkspaceForm({ ...workspaceForm, accountTier: e.target.value })}>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="enterprise">Enterprise</option>
              <option value="strategic">Strategic</option>
            </select>
            <select value={workspaceForm.onboardingStage} onChange={(e) => setWorkspaceForm({ ...workspaceForm, onboardingStage: e.target.value })}>
              <option value="kickoff">Kickoff</option>
              <option value="discovery">Discovery</option>
              <option value="implementation">Implementation</option>
              <option value="launch">Launch</option>
              <option value="steady_state">Steady state</option>
            </select>
          </div>
          <select value={workspaceForm.clientContactId} onChange={(e) => setWorkspaceForm({ ...workspaceForm, clientContactId: e.target.value })}>
            <option value="">Client contact (optional)</option>
            {contactRows.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.firstName} {contact.lastName}
              </option>
            ))}
          </select>
          <button type="button" className="mail-toolbar-btn industry-ws-action-btn" onClick={() => void createWorkspace()}>
            Add workspace
          </button>
        </section>
      </div>

      {contactsLoading || workspacesLoading ? <p className="mail-view-empty">Loading workspaces…</p> : null}

      <section className="industry-ws-record-panel">
        <IndustrySectionHead code="Accounts" title="Active workspace board" description="Review account tier, health, onboarding stage, and linked delivery activity." />
        {workspaceRows.length ? (
          <div className="industry-ws-template-grid">
            {workspaceRows.map((workspace) => {
              const healthTone: StatTone | undefined =
                (workspace.healthScore ?? 100) < 60 ? "warn" : workspace.status === "active" ? "accent" : undefined;

              return (
                <article key={workspace.id} className="industry-ws-chart-card">
                  <div className="industry-ws-chart-card-top">
                    <div>
                      <span className="industry-ws-chart-id">{workspace.name}</span>
                      {workspace.clientName ? <p className="industry-ws-chart-subtitle">{workspace.clientName}</p> : null}
                    </div>
                    <IndustryStatusPill label={formatStatusLabel(workspace.status)} tone={healthTone} />
                  </div>
                  <div className="industry-ws-meta-row">
                    <span>{workspace.clientDomain ?? "No domain"}</span>
                    <span>Tier: {formatStatusLabel(workspace.accountTier)}</span>
                  </div>
                  <p>
                    Health {workspace.healthScore}/100 · Stage: {formatStatusLabel(workspace.onboardingStage)}
                  </p>
                  <p>
                    {workspace.arrCents ? `$${(workspace.arrCents / 100).toLocaleString()}` : "ARR not set"}
                    {workspace.renewalDate ? ` · Renews ${new Date(workspace.renewalDate).toLocaleDateString()}` : ""}
                  </p>
                  <p>
                    {workspace.milestoneCount} milestones · {workspace.deliverableCount} deliverables · {workspace.proposalCount} proposals · {workspace.slaCaseCount} SLA cases
                  </p>
                  {workspace.routingDomain ? <p>Routing: {workspace.routingDomain}</p> : null}
                  <select defaultValue={workspace.status} onChange={(e) => void updateStatus(workspace.id, e.target.value)}>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="archived">Archived</option>
                    <option value="onboarding">Onboarding</option>
                  </select>
                  <code className="feature-id">{workspace.id}</code>
                </article>
              );
            })}
          </div>
        ) : (
          <IndustryEmptyState title="No workspaces yet" body="Provision a client workspace to start tracking branded mail domains and account health." />
        )}
      </section>
    </IndustryToolShell>
  );
}

export function ProjectTrackerPanel() {
  const { data: workspaces } = useLoad(() => api.b2bWorkspaces().then((r) => r.workspaces));
  const { data: milestones, loading, error, refresh } = useLoad(() => api.b2bMilestones().then((r) => r.milestones));
  const { data: deliverables, refresh: refreshDeliverables } = useLoad(() => api.b2bDeliverables().then((r) => r.deliverables));

  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [form, setForm] = useState({
    workspaceId: "",
    title: "",
    firstName: "",
    lastName: "",
    email: "",
    scheduledAt: "",
    milestoneType: "delivery",
    phase: "implementation",
    ownerRole: "",
    deliverableUrl: "",
    notes: "",
  });
  const [deliverableForm, setDeliverableForm] = useState({
    workspaceId: "",
    title: "",
    kind: "deliverable",
    dueAt: "",
    url: "",
  });

  const milestoneRows = milestones ?? [];
  const deliverableRows = deliverables ?? [];
  const todayKey = new Date().toDateString();
  const todayCount = milestoneRows.filter((milestone) => new Date(milestone.scheduledAt).toDateString() === todayKey).length;
  const missedCount = milestoneRows.filter((milestone) => milestone.status === "missed").length;
  const openDeliverables = deliverableRows.filter((deliverable) => deliverable.status !== "approved").length;

  const sortedMilestones = useMemo(
    () => [...milestoneRows].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    [milestoneRows],
  );

  const scheduleMilestone = async () => {
    setActionError("");
    setActionNotice("");
    try {
      await api.createB2bMilestone({
        workspaceId: form.workspaceId,
        title: form.title,
        contact: { firstName: form.firstName, lastName: form.lastName, email: form.email || undefined },
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        milestoneType: form.milestoneType,
        phase: form.phase,
        ownerRole: form.ownerRole || undefined,
        deliverableUrl: form.deliverableUrl || undefined,
        notes: form.notes || undefined,
      });
      setForm({
        workspaceId: "",
        title: "",
        firstName: "",
        lastName: "",
        email: "",
        scheduledAt: "",
        milestoneType: "delivery",
        phase: "implementation",
        ownerRole: "",
        deliverableUrl: "",
        notes: "",
      });
      setActionNotice("Milestone scheduled.");
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to add milestone.");
    }
  };

  const createDeliverable = async () => {
    setActionError("");
    setActionNotice("");
    try {
      await api.createB2bDeliverable({
        workspaceId: deliverableForm.workspaceId,
        title: deliverableForm.title,
        kind: deliverableForm.kind,
        dueAt: dateTimeToIso(deliverableForm.dueAt),
        url: deliverableForm.url || undefined,
      });
      setDeliverableForm({ workspaceId: "", title: "", kind: "deliverable", dueAt: "", url: "" });
      setActionNotice("Deliverable added to the queue.");
      await refreshDeliverables();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to add deliverable.");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await api.updateB2bMilestoneStatus(id, status);
    await refresh();
  };

  const updateDeliverableStatus = async (id: string, status: string) => {
    await api.updateB2bDeliverableStatus(id, status);
    await refreshDeliverables();
  };

  return (
    <IndustryToolShell
      lane="projects"
      eyebrow="Station 02 · Project delivery"
      title="Project Delivery Console"
      description="Schedule milestones, track deliverables, and monitor phase progress across client workspaces."
      stats={[
        { label: "Today", value: todayCount, tone: "accent" },
        { label: "Missed", value: missedCount, tone: missedCount > 0 ? "warn" : "ok" },
        { label: "Open deliverables", value: openDeliverables, tone: openDeliverables > 0 ? "accent" : "ok" },
      ]}
    >
      {error ? <p className="mail-view-error">{error}</p> : null}
      {actionError ? <p className="mail-view-error">{actionError}</p> : null}
      {actionNotice ? <p className="mail-view-success">{actionNotice}</p> : null}

      <div className="industry-ws-tool-layout industry-ws-tool-layout--split">
        <section className="industry-ws-intake-panel industry-ws-intake-panel--primary">
          <IndustrySectionHead code="Plan" title="Schedule milestone" description="Attach the milestone to a workspace with owner, phase, and deliverable link." />
          <select value={form.workspaceId} onChange={(e) => setForm({ ...form, workspaceId: e.target.value })}>
            <option value="">Select workspace</option>
            {(workspaces ?? []).map((workspace) => (
              <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
            ))}
          </select>
          <input placeholder="Milestone title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <input placeholder="Contact first name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <input placeholder="Contact last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <input type="email" placeholder="Contact email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input type="datetime-local" aria-label="Scheduled time" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <select value={form.milestoneType} onChange={(e) => setForm({ ...form, milestoneType: e.target.value })}>
              <option value="kickoff">Kickoff</option>
              <option value="delivery">Delivery</option>
              <option value="review">Review</option>
              <option value="approval">Approval</option>
              <option value="renewal">Renewal</option>
            </select>
            <input placeholder="Phase" value={form.phase} onChange={(e) => setForm({ ...form, phase: e.target.value })} />
          </div>
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <input placeholder="Owner role" value={form.ownerRole} onChange={(e) => setForm({ ...form, ownerRole: e.target.value })} />
            <input placeholder="Deliverable URL" value={form.deliverableUrl} onChange={(e) => setForm({ ...form, deliverableUrl: e.target.value })} />
          </div>
          <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button type="button" className="mail-toolbar-btn industry-ws-action-btn" onClick={() => void scheduleMilestone()}>
            Add milestone
          </button>
        </section>

        <section className="industry-ws-intake-panel">
          <IndustrySectionHead code="Ship" title="Add deliverable" description="Queue assets, reports, and implementation packages with due dates." />
          <select value={deliverableForm.workspaceId} onChange={(e) => setDeliverableForm({ ...deliverableForm, workspaceId: e.target.value })}>
            <option value="">Select workspace</option>
            {(workspaces ?? []).map((workspace) => (
              <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
            ))}
          </select>
          <input placeholder="Deliverable title" value={deliverableForm.title} onChange={(e) => setDeliverableForm({ ...deliverableForm, title: e.target.value })} />
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <select value={deliverableForm.kind} onChange={(e) => setDeliverableForm({ ...deliverableForm, kind: e.target.value })}>
              <option value="deliverable">Deliverable</option>
              <option value="asset">Asset</option>
              <option value="report">Report</option>
              <option value="implementation">Implementation</option>
              <option value="training">Training</option>
            </select>
            <input type="datetime-local" aria-label="Due date" value={deliverableForm.dueAt} onChange={(e) => setDeliverableForm({ ...deliverableForm, dueAt: e.target.value })} />
          </div>
          <input placeholder="URL" value={deliverableForm.url} onChange={(e) => setDeliverableForm({ ...deliverableForm, url: e.target.value })} />
          <button type="button" className="mail-toolbar-btn industry-ws-action-btn" onClick={() => void createDeliverable()}>
            Add deliverable
          </button>
        </section>
      </div>

      <div className="industry-ws-tool-layout industry-ws-tool-layout--schedule">
        <section className="industry-ws-record-panel industry-ws-record-panel--timeline">
          <IndustrySectionHead code="Queue" title="Milestone timeline" description="Upcoming and past milestones sorted by scheduled time." />
          {loading ? <p className="mail-view-empty">Loading milestones…</p> : null}
          {sortedMilestones.length ? (
            <div className="industry-ws-encounter-timeline">
              {sortedMilestones.map((milestone) => {
                const scheduled = new Date(milestone.scheduledAt);
                const isToday = scheduled.toDateString() === todayKey;
                const statusTone: StatTone | undefined =
                  milestone.status === "missed" ? "warn" : milestone.status === "completed" ? "ok" : "accent";

                return (
                  <article key={milestone.id} className={`industry-ws-encounter-card${isToday ? " industry-ws-encounter-card--today" : ""}`}>
                    <div className="industry-ws-encounter-time">
                      <strong>{scheduled.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</strong>
                      <span>{scheduled.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                    </div>
                    <div className="industry-ws-encounter-body">
                      <div className="industry-ws-chart-card-top">
                        <div>
                          <span className="industry-ws-chart-id">{milestone.title}</span>
                          <p className="industry-ws-chart-subtitle">{milestone.workspace.name} · {milestone.contactName}</p>
                        </div>
                        <IndustryStatusPill label={formatStatusLabel(milestone.status)} tone={statusTone} />
                      </div>
                      <div className="industry-ws-meta-row">
                        <span>{formatStatusLabel(milestone.milestoneType)}</span>
                        <span>Phase: {formatStatusLabel(milestone.phase)}</span>
                      </div>
                      {milestone.ownerRole ? <p>Owner: {milestone.ownerRole}</p> : null}
                      {milestone.deliverableUrl ? <p>Deliverable: {milestone.deliverableUrl}</p> : null}
                      <select defaultValue={milestone.status} onChange={(e) => void updateStatus(milestone.id, e.target.value)}>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="missed">Missed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <IndustryEmptyState title="Delivery queue is clear" body="Schedule a milestone to populate the project timeline." />
          )}
        </section>

        <section className="industry-ws-record-panel">
          <IndustrySectionHead code="Assets" title="Deliverable board" description="Track planned, in-progress, and approved client deliverables." />
          {deliverableRows.length ? (
            <div className="industry-ws-template-grid">
              {deliverableRows.map((deliverable) => {
                const statusTone: StatTone | undefined =
                  deliverable.status === "blocked" ? "warn" : deliverable.status === "approved" ? "ok" : "accent";

                return (
                  <article key={deliverable.id} className="industry-ws-chart-card">
                    <div className="industry-ws-chart-card-top">
                      <div>
                        <span className="industry-ws-chart-id">{deliverable.title}</span>
                        <p className="industry-ws-chart-subtitle">{deliverable.workspace.name}</p>
                      </div>
                      <IndustryStatusPill label={formatStatusLabel(deliverable.status)} tone={statusTone} />
                    </div>
                    <div className="industry-ws-meta-row">
                      <span>{formatStatusLabel(deliverable.kind)}</span>
                      <span>
                        {deliverable.dueAt ? `Due ${new Date(deliverable.dueAt).toLocaleString()}` : "No due date"}
                      </span>
                    </div>
                    {deliverable.approvedAt ? <p>Approved {new Date(deliverable.approvedAt).toLocaleString()}</p> : null}
                    {deliverable.url ? <p>{deliverable.url}</p> : null}
                    <select defaultValue={deliverable.status} onChange={(e) => void updateDeliverableStatus(deliverable.id, e.target.value)}>
                      <option value="planned">Planned</option>
                      <option value="in_progress">In progress</option>
                      <option value="sent">Sent</option>
                      <option value="approved">Approved</option>
                      <option value="blocked">Blocked</option>
                    </select>
                  </article>
                );
              })}
            </div>
          ) : (
            <IndustryEmptyState title="No deliverables queued" body="Add a deliverable to track assets and implementation packages." />
          )}
        </section>
      </div>
    </IndustryToolShell>
  );
}

export function ProposalDeskPanel({ onUseTemplate }: { onUseTemplate: (t: { subject: string; html: string }) => void }) {
  const { data: templates, loading: templatesLoading, error: templatesError } = useLoad(() => api.b2bTemplates().then((r) => r.templates));
  const { data: workspaces } = useLoad(() => api.b2bWorkspaces().then((r) => r.workspaces));
  const { data: proposals, refresh: refreshProposals } = useLoad(() => api.b2bProposals().then((r) => r.proposals));

  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [proposalForm, setProposalForm] = useState({
    workspaceId: "",
    title: "",
    version: "1",
    amountCents: "",
    validUntil: "",
    sowUrl: "",
  });

  const proposalRows = proposals ?? [];
  const openCount = proposalRows.filter((proposal) => !["approved", "declined", "expired"].includes(proposal.status)).length;
  const pendingCount = proposalRows.filter((proposal) => ["sent", "revision_requested"].includes(proposal.status)).length;

  const createProposal = async () => {
    setActionError("");
    setActionNotice("");
    try {
      await api.createB2bProposal({
        workspaceId: proposalForm.workspaceId,
        title: proposalForm.title,
        version: proposalForm.version ? Number(proposalForm.version) : undefined,
        amountCents: proposalForm.amountCents ? Number(proposalForm.amountCents) : undefined,
        validUntil: dateTimeToIso(proposalForm.validUntil),
        sowUrl: proposalForm.sowUrl || undefined,
      });
      setProposalForm({ workspaceId: "", title: "", version: "1", amountCents: "", validUntil: "", sowUrl: "" });
      setActionNotice("Proposal created.");
      await refreshProposals();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to create proposal.");
    }
  };

  const updateProposalStatus = async (id: string, status: string) => {
    await api.updateB2bProposalStatus(id, status);
    await refreshProposals();
  };

  return (
    <IndustryToolShell
      lane="proposals"
      eyebrow="Station 03 · Proposal desk"
      title="Proposal Coordination Hub"
      description="Create versioned SOW revisions, track approval pipeline, and launch templated client outreach."
      stats={[
        { label: "Open pipeline", value: openCount, tone: "accent" },
        { label: "Pending review", value: pendingCount, tone: pendingCount > 0 ? "warn" : "ok" },
        { label: "Templates", value: (templates ?? []).length },
      ]}
    >
      {templatesError ? <p className="mail-view-error">{templatesError}</p> : null}
      {actionError ? <p className="mail-view-error">{actionError}</p> : null}
      {actionNotice ? <p className="mail-view-success">{actionNotice}</p> : null}

      <div className="industry-ws-tool-layout industry-ws-tool-layout--split">
        <section className="industry-ws-intake-panel industry-ws-intake-panel--primary">
          <IndustrySectionHead code="Draft" title="New proposal" description="Attach a workspace, version, amount, and SOW link for client review." />
          <select value={proposalForm.workspaceId} onChange={(e) => setProposalForm({ ...proposalForm, workspaceId: e.target.value })}>
            <option value="">Select workspace</option>
            {(workspaces ?? []).map((workspace) => (
              <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
            ))}
          </select>
          <input placeholder="Proposal / SOW title" value={proposalForm.title} onChange={(e) => setProposalForm({ ...proposalForm, title: e.target.value })} />
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <input type="number" placeholder="Version" value={proposalForm.version} onChange={(e) => setProposalForm({ ...proposalForm, version: e.target.value })} />
            <input type="number" placeholder="Amount cents" value={proposalForm.amountCents} onChange={(e) => setProposalForm({ ...proposalForm, amountCents: e.target.value })} />
          </div>
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <input type="date" aria-label="Valid until" value={proposalForm.validUntil} onChange={(e) => setProposalForm({ ...proposalForm, validUntil: e.target.value })} />
            <input placeholder="SOW URL" value={proposalForm.sowUrl} onChange={(e) => setProposalForm({ ...proposalForm, sowUrl: e.target.value })} />
          </div>
          <button type="button" className="mail-toolbar-btn industry-ws-action-btn" onClick={() => void createProposal()}>
            Create proposal
          </button>
        </section>

        <section className="industry-ws-record-panel">
          <IndustrySectionHead code="Pipeline" title="Proposal board" description="Track version, amount, validity, and approval status per workspace." />
          {proposalRows.length ? (
            <div className="industry-ws-template-grid">
              {proposalRows.map((proposal) => {
                const statusTone: StatTone | undefined =
                  proposal.status === "approved" ? "ok" :
                  proposal.status === "declined" || proposal.status === "expired" ? "alert" :
                  proposal.status === "revision_requested" ? "warn" : "accent";

                return (
                  <article key={proposal.id} className="industry-ws-chart-card">
                    <div className="industry-ws-chart-card-top">
                      <div>
                        <span className="industry-ws-chart-id">{proposal.title} v{proposal.version}</span>
                        <p className="industry-ws-chart-subtitle">{proposal.workspace.name}</p>
                      </div>
                      <IndustryStatusPill label={formatStatusLabel(proposal.status)} tone={statusTone} />
                    </div>
                    <p>
                      {proposal.amountCents ? `$${(proposal.amountCents / 100).toLocaleString()}` : "No amount"}
                      {proposal.validUntil ? ` · Valid until ${new Date(proposal.validUntil).toLocaleDateString()}` : ""}
                    </p>
                    {proposal.sowUrl ? <p>SOW: {proposal.sowUrl}</p> : null}
                    {proposal.approvedAt ? <p>Approved {new Date(proposal.approvedAt).toLocaleString()}</p> : null}
                    <select defaultValue={proposal.status} onChange={(e) => void updateProposalStatus(proposal.id, e.target.value)}>
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="revision_requested">Revision requested</option>
                      <option value="approved">Approved</option>
                      <option value="declined">Declined</option>
                      <option value="expired">Expired</option>
                    </select>
                  </article>
                );
              })}
            </div>
          ) : (
            <IndustryEmptyState title="Proposal pipeline is empty" body="Create a proposal to start tracking SOW revisions and client approvals." />
          )}
        </section>
      </div>

      <section className="industry-ws-record-panel industry-ws-record-panel--templates">
        <IndustrySectionHead code="Mail" title="Proposal templates" description="Launch pre-approved outreach into the compose workspace." />
        {templatesLoading ? <p className="mail-view-empty">Loading templates…</p> : null}
        {(templates ?? []).length ? (
          <div className="industry-ws-template-grid">
            {(templates ?? []).map((template) => (
              <article key={template.id} className="industry-ws-chart-card">
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
          <IndustryEmptyState title="No templates loaded" body="B2B proposal templates will appear here once seeded for the tenant." />
        )}
      </section>
    </IndustryToolShell>
  );
}

export function SlaMonitorPanel() {
  const { data: workspaces } = useLoad(() => api.b2bWorkspaces().then((r) => r.workspaces));
  const { data: cases, loading, error, refresh } = useLoad(() => api.b2bSlaCases().then((r) => r.slaCases));
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const { data: notes, refresh: refreshNotes } = useLoad(
    () => (selectedCaseId ? api.b2bSlaNotes(selectedCaseId).then((r) => r.notes) : Promise.resolve([])),
    [selectedCaseId],
  );
  const { data: events, refresh: refreshEvents } = useLoad(
    () => (selectedCaseId ? api.b2bSlaEvents(selectedCaseId).then((r) => r.events) : Promise.resolve([])),
    [selectedCaseId],
  );

  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [caseForm, setCaseForm] = useState({
    workspaceId: "",
    title: "",
    severity: "p3",
    category: "support",
    responseTargetMinutes: "240",
    resolutionTargetMinutes: "1440",
    responseDueAt: "",
  });
  const [noteBody, setNoteBody] = useState("");
  const [eventForm, setEventForm] = useState({ eventType: "comment", message: "" });

  const caseRows = cases ?? [];
  const openCases = caseRows.filter((slaCase) => !["resolved"].includes(slaCase.status)).length;
  const atRiskCount = caseRows.filter((slaCase) => ["at_risk", "breached"].includes(slaCase.status)).length;
  const escalatedCount = caseRows.filter((slaCase) => slaCase.status === "escalated" || slaCase.escalatedAt).length;

  const createCase = async () => {
    setActionError("");
    setActionNotice("");
    try {
      await api.createB2bSlaCase({
        workspaceId: caseForm.workspaceId,
        title: caseForm.title,
        severity: caseForm.severity,
        category: caseForm.category,
        responseTargetMinutes: caseForm.responseTargetMinutes ? Number(caseForm.responseTargetMinutes) : undefined,
        resolutionTargetMinutes: caseForm.resolutionTargetMinutes ? Number(caseForm.resolutionTargetMinutes) : undefined,
        responseDueAt: dateTimeToIso(caseForm.responseDueAt),
      });
      setCaseForm({
        workspaceId: "",
        title: "",
        severity: "p3",
        category: "support",
        responseTargetMinutes: "240",
        resolutionTargetMinutes: "1440",
        responseDueAt: "",
      });
      setActionNotice("SLA case opened.");
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to open SLA case.");
    }
  };

  const addNote = async () => {
    if (!selectedCaseId || !noteBody.trim()) return;
    await api.createB2bSlaNote(selectedCaseId, noteBody);
    setNoteBody("");
    await refreshNotes();
  };

  const addEvent = async () => {
    if (!selectedCaseId || !eventForm.message.trim()) return;
    await api.createB2bSlaEvent(selectedCaseId, eventForm);
    setEventForm({ eventType: "comment", message: "" });
    await refreshEvents();
    await refresh();
  };

  const updateStatus = async (id: string, status: string) => {
    await api.updateB2bSlaCaseStatus(id, status);
    await refresh();
  };

  const selectedCase = caseRows.find((slaCase) => slaCase.id === selectedCaseId);

  const severityTone = (severity: string): StatTone | undefined => {
    if (severity === "p1") return "alert";
    if (severity === "p2") return "warn";
    return undefined;
  };

  return (
    <IndustryToolShell
      lane="sla"
      eyebrow="Station 04 · SLA monitor"
      title="SLA Compliance Console"
      description="Open SLA cases, log escalation events, and review response targets with team notes."
      stats={[
        { label: "Open cases", value: openCases, tone: openCases > 0 ? "warn" : "ok" },
        { label: "At risk / breached", value: atRiskCount, tone: atRiskCount > 0 ? "alert" : "ok" },
        { label: "Escalated", value: escalatedCount, tone: escalatedCount > 0 ? "warn" : "ok" },
      ]}
    >
      {error ? <p className="mail-view-error">{error}</p> : null}
      {actionError ? <p className="mail-view-error">{actionError}</p> : null}
      {actionNotice ? <p className="mail-view-success">{actionNotice}</p> : null}

      <div className="industry-ws-tool-layout industry-ws-tool-layout--split">
        <section className="industry-ws-intake-panel industry-ws-intake-panel--primary">
          <IndustrySectionHead code="Open" title="New SLA case" description="Set severity, category, response targets, and due window for the workspace." />
          <select value={caseForm.workspaceId} onChange={(e) => setCaseForm({ ...caseForm, workspaceId: e.target.value })}>
            <option value="">Select workspace</option>
            {(workspaces ?? []).map((workspace) => (
              <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
            ))}
          </select>
          <input placeholder="SLA case title" value={caseForm.title} onChange={(e) => setCaseForm({ ...caseForm, title: e.target.value })} />
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <select value={caseForm.severity} onChange={(e) => setCaseForm({ ...caseForm, severity: e.target.value })}>
              <option value="p1">P1</option>
              <option value="p2">P2</option>
              <option value="p3">P3</option>
              <option value="p4">P4</option>
            </select>
            <select value={caseForm.category} onChange={(e) => setCaseForm({ ...caseForm, category: e.target.value })}>
              <option value="support">Support</option>
              <option value="delivery">Delivery</option>
              <option value="security">Security</option>
              <option value="billing">Billing</option>
              <option value="integration">Integration</option>
            </select>
          </div>
          <div className="industry-ws-field-grid industry-ws-field-grid--duo">
            <input type="number" placeholder="Response target minutes" value={caseForm.responseTargetMinutes} onChange={(e) => setCaseForm({ ...caseForm, responseTargetMinutes: e.target.value })} />
            <input type="number" placeholder="Resolution target minutes" value={caseForm.resolutionTargetMinutes} onChange={(e) => setCaseForm({ ...caseForm, resolutionTargetMinutes: e.target.value })} />
          </div>
          <input type="datetime-local" aria-label="Response due" value={caseForm.responseDueAt} onChange={(e) => setCaseForm({ ...caseForm, responseDueAt: e.target.value })} />
          <button type="button" className="mail-toolbar-btn industry-ws-action-btn" onClick={() => void createCase()}>
            Open SLA case
          </button>
        </section>

        <section className="industry-ws-record-panel industry-ws-record-panel--timeline">
          <IndustrySectionHead code="Stream" title="Case board" description="Monitor severity, targets, and escalation posture across workspaces." />
          {loading ? <p className="mail-view-empty">Loading SLA cases…</p> : null}
          {caseRows.length ? (
            <div className="industry-ws-encounter-timeline">
              {caseRows.map((slaCase) => {
                const statusTone: StatTone | undefined =
                  slaCase.status === "breached" ? "alert" :
                  slaCase.status === "at_risk" || slaCase.status === "escalated" ? "warn" :
                  slaCase.status === "resolved" ? "ok" : "accent";

                return (
                  <article
                    key={slaCase.id}
                    className={`industry-ws-encounter-card${selectedCaseId === slaCase.id ? " industry-ws-encounter-card--active" : ""}`}
                  >
                    <div className="industry-ws-encounter-time">
                      <strong>{slaCase.severity.toUpperCase()}</strong>
                      <span>{formatStatusLabel(slaCase.category)}</span>
                    </div>
                    <div className="industry-ws-encounter-body">
                      <div className="industry-ws-chart-card-top">
                        <div>
                          <span className="industry-ws-chart-id">{slaCase.title}</span>
                          <p className="industry-ws-chart-subtitle">{slaCase.workspace.name}</p>
                        </div>
                        <IndustryStatusPill label={formatStatusLabel(slaCase.status)} tone={statusTone} />
                      </div>
                      <p>
                        {slaCase.noteCount} notes · {slaCase.eventCount} events
                        {slaCase.responseDueAt ? ` · Due ${new Date(slaCase.responseDueAt).toLocaleString()}` : ""}
                      </p>
                      <p>
                        Targets: {slaCase.responseTargetMinutes}m response · {slaCase.resolutionTargetMinutes}m resolution
                      </p>
                      {slaCase.escalatedAt ? <p>Escalated {new Date(slaCase.escalatedAt).toLocaleString()}</p> : null}
                      {slaCase.resolvedAt ? <p>Resolved {new Date(slaCase.resolvedAt).toLocaleString()}</p> : null}
                      <IndustryStatusPill label={slaCase.severity.toUpperCase()} tone={severityTone(slaCase.severity)} />
                      <div className="industry-ws-card-actions">
                        <button type="button" className="mail-toolbar-btn" onClick={() => setSelectedCaseId(slaCase.id)}>
                          View notes
                        </button>
                        <select defaultValue={slaCase.status} onChange={(e) => void updateStatus(slaCase.id, e.target.value)}>
                          <option value="open">Open</option>
                          <option value="at_risk">At risk</option>
                          <option value="breached">Breached</option>
                          <option value="resolved">Resolved</option>
                          <option value="escalated">Escalated</option>
                        </select>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <IndustryEmptyState title="No SLA cases" body="Open an SLA case when response or resolution targets need tracking." />
          )}
        </section>
      </div>

      {selectedCase ? (
        <section className="industry-ws-record-panel industry-ws-record-panel--notes">
          <IndustrySectionHead
            code="Notes"
            title={`Team notes · ${selectedCase.title}`}
            description="Collaborative notes and escalation timeline for the selected SLA case."
          />
          <div className="industry-ws-note-compose">
            <textarea placeholder="Add a note…" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} rows={3} />
            <button type="button" className="mail-toolbar-btn industry-ws-action-btn" onClick={() => void addNote()}>
              Add note
            </button>
          </div>
          <div className="industry-ws-note-compose">
            <select value={eventForm.eventType} onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}>
              <option value="comment">Comment</option>
              <option value="escalated">Escalated</option>
              <option value="breached">Breached</option>
              <option value="resolved">Resolved</option>
            </select>
            <textarea placeholder="Timeline event…" value={eventForm.message} onChange={(e) => setEventForm({ ...eventForm, message: e.target.value })} rows={3} />
            <button type="button" className="mail-toolbar-btn industry-ws-action-btn" onClick={() => void addEvent()}>
              Add event
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
          <ul className="industry-ws-note-list">
            {(events ?? []).map((event) => (
              <li key={event.id}>
                <strong>{formatStatusLabel(event.eventType)}</strong>
                <p>{event.message}</p>
                <small>{event.user.displayName ?? event.user.email} · {new Date(event.createdAt).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </IndustryToolShell>
  );
}
