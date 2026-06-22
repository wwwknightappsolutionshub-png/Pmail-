import { type ReactNode, useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import "./MailViews.css";

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

const DOCUMENT_CATEGORIES = [
  ["source_document", "Source document"],
  ["tax_slip", "Tax slip"],
  ["bank_statement", "Bank statement"],
  ["payroll", "Payroll"],
  ["receipt", "Receipt"],
  ["entity_record", "Entity record"],
  ["signature", "Signature"],
  ["notice", "Notice"],
] as const;

const FILING_TYPES = [
  ["corporate_tax", "Corporate tax"],
  ["personal_tax", "Personal tax"],
  ["sales_tax", "Sales tax"],
  ["payroll", "Payroll"],
  ["installment", "Installment"],
  ["annual_return", "Annual return"],
  ["trust_return", "Trust return"],
] as const;

function dateTimeToIso(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

function AccountingToolShell({
  eyebrow,
  title,
  description,
  stats,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  stats: Array<{ label: string; value: string | number; tone?: "accent" | "warn" | "ok" }>;
  children: ReactNode;
}) {
  return (
    <div className="mail-view-panel accounting-tool-shell">
      <header className="accounting-tool-hero">
        <div>
          <span className="accounting-tool-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="accounting-tool-stats">
          {stats.map((stat) => (
            <div key={stat.label} className={`accounting-tool-stat${stat.tone ? ` accounting-tool-stat--${stat.tone}` : ""}`}>
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

function AccountingEmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="accounting-empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

export function DocumentIntakePanel() {
  const { data: contacts, loading: contactsLoading, error: contactsError, refresh: refreshContacts } = useLoad(() =>
    api.acContacts().then((r) => r.contacts),
  );
  const { data: requests, loading: requestsLoading, error: requestsError, refresh: refreshRequests } = useLoad(() =>
    api.acDocumentRequests().then((r) => r.requests),
  );

  const [contactForm, setContactForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "client",
  });
  const [requestForm, setRequestForm] = useState({
    title: "",
    description: "",
    referenceCode: "",
    category: "source_document",
    fiscalYear: "",
    dueAt: "",
    clientContactId: "",
  });
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");

  const createContact = async () => {
    setActionError("");
    setActionNotice("");
    try {
      if (!contactForm.firstName.trim() || !contactForm.lastName.trim()) {
        throw new Error("Contact first and last name are required.");
      }
      await api.createAcContact(contactForm);
      setContactForm({ firstName: "", lastName: "", email: "", phone: "", role: "client" });
      setActionNotice("Contact added to the accounting vault.");
      await refreshContacts();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to add contact.");
    }
  };

  const createRequest = async () => {
    setActionError("");
    setActionNotice("");
    try {
      if (!requestForm.title.trim()) throw new Error("Request title is required.");
      await api.createAcDocumentRequest({
        title: requestForm.title,
        description: requestForm.description || undefined,
        referenceCode: requestForm.referenceCode || undefined,
        category: requestForm.category,
        fiscalYear: requestForm.fiscalYear || undefined,
        dueAt: dateTimeToIso(requestForm.dueAt),
        clientContactId: requestForm.clientContactId || undefined,
      });
      setRequestForm({
        title: "",
        description: "",
        referenceCode: "",
        category: "source_document",
        fiscalYear: "",
        dueAt: "",
        clientContactId: "",
      });
      setActionNotice("Vault request opened.");
      await refreshRequests();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to open vault request.");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await api.updateAcDocumentRequestStatus(id, status);
    await refreshRequests();
  };

  const requestRows = requests ?? [];
  const contactRows = contacts ?? [];
  const reviewCount = requestRows.filter((request) => request.status === "review_needed").length;

  return (
    <AccountingToolShell
      eyebrow="Source document operations"
      title="Document Request Vault"
      description="Create client contacts, open source-document requests, and triage the vault queue by review status."
      stats={[
        { label: "Contacts", value: contactRows.length },
        { label: "Open requests", value: requestRows.length, tone: "accent" },
        { label: "Need review", value: reviewCount, tone: reviewCount > 0 ? "warn" : "ok" },
      ]}
    >
      {(contactsError || requestsError) ? (
        <p className="mail-view-error">{contactsError || requestsError}</p>
      ) : null}
      {actionError ? <p className="mail-view-error">{actionError}</p> : null}
      {actionNotice ? <p className="mail-view-success">{actionNotice}</p> : null}
      <div className="accounting-tool-layout accounting-tool-layout--split">
        <section className="accounting-command-panel">
          <div className="accounting-section-head">
            <span>01</span>
            <div>
              <h3>Client intake</h3>
              <p>Create the contact record used by document requests.</p>
            </div>
          </div>
          <input placeholder="First name" value={contactForm.firstName} onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })} />
          <input placeholder="Last name" value={contactForm.lastName} onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })} />
          <input type="email" placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
          <select value={contactForm.role} onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}>
            <option value="client">Client</option>
            <option value="partner">Partner</option>
            <option value="staff">Staff</option>
          </select>
          <button type="button" className="mail-toolbar-btn" onClick={() => void createContact()}>Add contact</button>
        </section>
        <section className="accounting-command-panel accounting-command-panel--primary">
          <div className="accounting-section-head">
            <span>02</span>
            <div>
              <h3>Open vault request</h3>
              <p>Track category, fiscal year, due date, and client ownership.</p>
            </div>
          </div>
          <input placeholder="Title" value={requestForm.title} onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })} />
          <input placeholder="Description" value={requestForm.description} onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })} />
          <input placeholder="Reference code" value={requestForm.referenceCode} onChange={(e) => setRequestForm({ ...requestForm, referenceCode: e.target.value })} />
          <select value={requestForm.category} onChange={(e) => setRequestForm({ ...requestForm, category: e.target.value })}>
            {DOCUMENT_CATEGORIES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <input placeholder="Fiscal year (e.g. 2024)" value={requestForm.fiscalYear} onChange={(e) => setRequestForm({ ...requestForm, fiscalYear: e.target.value })} />
          <input type="date" aria-label="Due date" value={requestForm.dueAt} onChange={(e) => setRequestForm({ ...requestForm, dueAt: e.target.value })} />
          <select value={requestForm.clientContactId} onChange={(e) => setRequestForm({ ...requestForm, clientContactId: e.target.value })}>
            <option value="">Client (optional)</option>
            {(contacts ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
            ))}
          </select>
          <button type="button" className="mail-toolbar-btn" onClick={() => void createRequest()}>Open vault request</button>
        </section>
      </div>
      {contactsLoading || requestsLoading ? <p className="mail-view-empty">Loading…</p> : null}
      <section className="accounting-record-panel">
        <div className="accounting-section-head">
          <span>Queue</span>
          <div>
            <h3>Vault queue</h3>
            <p>Review each request and move it through the document lifecycle.</p>
          </div>
        </div>
        {requestRows.length ? (
          <div className="accounting-record-grid">
            {requestRows.map((request) => (
              <article key={request.id} className="accounting-record-card">
                <div className="accounting-record-top">
                  <strong>{request.title}</strong>
                  <span>{request.status.replaceAll("_", " ")}</span>
                </div>
                <p>{request.referenceCode ? `Ref ${request.referenceCode}` : "No reference"} · {request.category.replaceAll("_", " ")}</p>
                <p>Vault: {request.vaultStatus.replaceAll("_", " ")}</p>
                {request.fiscalYear ? <p>Fiscal year {request.fiscalYear}</p> : null}
                {request.dueAt ? <p>Due {new Date(request.dueAt).toLocaleString()}</p> : null}
                {request.clientName ? <p>Client: {request.clientName}</p> : null}
                <select defaultValue={request.status} onChange={(e) => void updateStatus(request.id, e.target.value)}>
                  <option value="requested">Requested</option>
                  <option value="client_uploading">Client uploading</option>
                  <option value="review_needed">Review needed</option>
                  <option value="accepted">Accepted</option>
                  <option value="overdue">Overdue</option>
                  <option value="closed">Closed</option>
                </select>
                <code className="feature-id">{request.id}</code>
              </article>
            ))}
          </div>
        ) : (
          <AccountingEmptyState title="No vault requests yet" body="Open a document request to start tracking client source documents." />
        )}
      </section>
    </AccountingToolShell>
  );
}

export function FilingCalendarPanel() {
  const { data: entities } = useLoad(() => api.acClientEntities().then((r) => r.entities));
  const { data: deadlines, loading, error, refresh } = useLoad(() => api.acFilingDeadlines().then((r) => r.deadlines));
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [form, setForm] = useState({
    clientEntityId: "",
    newEntityName: "",
    entityType: "corporation",
    firstName: "",
    lastName: "",
    email: "",
    filingType: "corporate_tax",
    taxPeriod: "",
    dueAt: "",
    notes: "",
  });

  const scheduleDeadline = async () => {
    setActionError("");
    setActionNotice("");

    try {
      if (!form.clientEntityId && !form.newEntityName.trim()) {
        throw new Error("Select an entity or enter a new entity name.");
      }
      if (!form.firstName.trim() || !form.lastName.trim()) {
        throw new Error("Contact first and last name are required.");
      }
      if (!form.dueAt) {
        throw new Error("Due date is required.");
      }

      let clientEntityId = form.clientEntityId;
      if (!clientEntityId) {
        const created = await api.createAcClientEntity({
          name: form.newEntityName,
          entityType: form.entityType,
          engagementType: "year_end",
        });
        clientEntityId = (created.entity as { id: string }).id;
      }

      await api.createAcFilingDeadline({
        clientEntityId,
        contact: { firstName: form.firstName, lastName: form.lastName, email: form.email || undefined },
        dueAt: new Date(form.dueAt).toISOString(),
        filingType: form.filingType,
        taxPeriod: form.taxPeriod || undefined,
        notes: form.notes || undefined,
      });
      setForm({
        clientEntityId: "",
        newEntityName: "",
        entityType: "corporation",
        firstName: "",
        lastName: "",
        email: "",
        filingType: "corporate_tax",
        taxPeriod: "",
        dueAt: "",
        notes: "",
      });
      setActionNotice("Filing deadline added.");
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to add filing deadline.");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await api.updateAcFilingDeadlineStatus(id, status);
    await refresh();
  };

  const deadlineRows = deadlines ?? [];
  const entityRows = entities ?? [];
  const upcomingCount = deadlineRows.filter((deadline) => ["open", "collecting_docs", "ready_to_file"].includes(deadline.status)).length;

  return (
    <AccountingToolShell
      eyebrow="Filing operations"
      title="Tax Filing Calendar"
      description="Schedule tax obligations with a single due date and a clear filing status lane."
      stats={[
        { label: "Client entities", value: entityRows.length },
        { label: "Deadlines", value: deadlineRows.length, tone: "accent" },
        { label: "Upcoming", value: upcomingCount, tone: upcomingCount > 0 ? "warn" : "ok" },
      ]}
    >
      {error ? <p className="mail-view-error">{error}</p> : null}
      {actionError ? <p className="mail-view-error">{actionError}</p> : null}
      {actionNotice ? <p className="mail-view-success">{actionNotice}</p> : null}
      <div className="accounting-tool-layout accounting-tool-layout--calendar">
        <section className="accounting-command-panel accounting-command-panel--primary">
          <div className="accounting-section-head">
            <span>Due</span>
            <div>
              <h3>Add filing deadline</h3>
              <p>Choose an entity or create one inline, then set the filing due date.</p>
            </div>
          </div>
          <select value={form.clientEntityId} onChange={(e) => setForm({ ...form, clientEntityId: e.target.value })}>
            <option value="">Create/select client entity</option>
            {entityRows.map((entity) => (
              <option key={entity.id} value={entity.id}>{entity.name} ({entity.entityType})</option>
            ))}
          </select>
          {!form.clientEntityId ? (
            <div className="accounting-inline-grid">
              <input placeholder="New entity name" value={form.newEntityName} onChange={(e) => setForm({ ...form, newEntityName: e.target.value })} />
              <select value={form.entityType} onChange={(e) => setForm({ ...form, entityType: e.target.value })}>
                <option value="corporation">Corporation</option>
                <option value="partnership">Partnership</option>
                <option value="sole_proprietor">Sole proprietor</option>
                <option value="trust">Trust</option>
                <option value="non_profit">Non-profit</option>
                <option value="estate">Estate</option>
              </select>
            </div>
          ) : null}
          <div className="accounting-inline-grid">
            <input placeholder="Contact first name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <input placeholder="Contact last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <input type="email" placeholder="Contact email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="accounting-inline-grid">
            <select value={form.filingType} onChange={(e) => setForm({ ...form, filingType: e.target.value })}>
              {FILING_TYPES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <input placeholder="Tax period (e.g. FY2024, Q2 2025)" value={form.taxPeriod} onChange={(e) => setForm({ ...form, taxPeriod: e.target.value })} />
          </div>
          <div className="accounting-inline-grid">
            <input type="date" aria-label="Due date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
            <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button type="button" className="mail-toolbar-btn" onClick={() => void scheduleDeadline()}>Add deadline</button>
        </section>
        <section className="accounting-record-panel">
          <div className="accounting-section-head">
            <span>Lane</span>
            <div>
              <h3>Filing status lane</h3>
              <p>Update each deadline as documents move toward filing.</p>
            </div>
          </div>
          {loading ? <p className="mail-view-empty">Loading deadlines…</p> : null}
          {deadlineRows.length ? (
            <div className="accounting-timeline-list">
              {deadlineRows.map((deadline) => (
                <article key={deadline.id} className="accounting-timeline-card">
                  <div>
                    <strong>{deadline.clientEntity.name}</strong>
                    <p>{deadline.filingType.replaceAll("_", " ")} · {deadline.taxPeriod || "No period"} · Due {new Date(deadline.dueAt).toLocaleString()}</p>
                    <p>{deadline.contactName}</p>
                    {deadline.reminderAt ? <p>Reminder {new Date(deadline.reminderAt).toLocaleString()}</p> : null}
                  </div>
                  <select defaultValue={deadline.status} onChange={(e) => void updateStatus(deadline.id, e.target.value)}>
                    <option value="open">Open</option>
                    <option value="collecting_docs">Collecting docs</option>
                    <option value="ready_to_file">Ready to file</option>
                    <option value="filed">Filed</option>
                    <option value="extended">Extended</option>
                    <option value="missed">Missed</option>
                  </select>
                </article>
              ))}
            </div>
          ) : (
            <AccountingEmptyState title="No filing deadlines yet" body="Add a tax deadline to populate the calendar lane." />
          )}
        </section>
      </div>
    </AccountingToolShell>
  );
}

export function SecureExchangePanel({ onUseTemplate }: { onUseTemplate: (t: { subject: string; html: string }) => void }) {
  const { data, loading, error } = useLoad(() => api.acTemplates().then((r) => r.templates));
  const { data: requests } = useLoad(() => api.acDocumentRequests().then((r) => r.requests));
  const { data: entities } = useLoad(() => api.acClientEntities().then((r) => r.entities));
  const { data: exchangeRecords, refresh: refreshExchangeRecords } = useLoad(() =>
    api.acExchangeRecords().then((r) => r.exchangeRecords),
  );
  const [recordForm, setRecordForm] = useState({
    documentName: "",
    documentRequestId: "",
    clientEntityId: "",
    direction: "inbound",
    action: "uploaded",
    category: "source_document",
    status: "received",
    notes: "",
  });
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");

  const createRecord = async () => {
    setActionError("");
    setActionNotice("");
    try {
      if (!recordForm.documentName.trim()) throw new Error("Document name is required.");
      await api.createAcExchangeRecord({
        documentName: recordForm.documentName,
        documentRequestId: recordForm.documentRequestId || undefined,
        clientEntityId: recordForm.clientEntityId || undefined,
        direction: recordForm.direction,
        action: recordForm.action,
        category: recordForm.category,
        status: recordForm.status,
        notes: recordForm.notes || undefined,
      });
      setRecordForm({
        documentName: "",
        documentRequestId: "",
        clientEntityId: "",
        direction: "inbound",
        action: "uploaded",
        category: "source_document",
        status: "received",
        notes: "",
      });
      setActionNotice("Exchange event recorded.");
      await refreshExchangeRecords();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to record exchange event.");
    }
  };

  const templateRows = data ?? [];
  const requestRows = requests ?? [];
  const entityRows = entities ?? [];
  const exchangeRows = exchangeRecords ?? [];

  return (
    <AccountingToolShell
      eyebrow="Secure document exchange"
      title="Secure Exchange Ledger"
      description="Record exchange events, tie them to requests or entities, and launch secure client templates."
      stats={[
        { label: "Templates", value: templateRows.length },
        { label: "Audit events", value: exchangeRows.length, tone: "accent" },
        { label: "Linked requests", value: requestRows.length },
      ]}
    >
      {loading ? <p className="mail-view-empty">Loading templates…</p> : null}
      {error ? <p className="mail-view-error">{error}</p> : null}
      {actionError ? <p className="mail-view-error">{actionError}</p> : null}
      {actionNotice ? <p className="mail-view-success">{actionNotice}</p> : null}
      <div className="accounting-tool-layout accounting-tool-layout--split">
        <section className="accounting-command-panel accounting-command-panel--primary">
          <div className="accounting-section-head">
            <span>Audit</span>
            <div>
              <h3>Record exchange event</h3>
              <p>Capture the document, direction, action, status, and ledger context.</p>
            </div>
          </div>
          <input placeholder="Document name" value={recordForm.documentName} onChange={(e) => setRecordForm({ ...recordForm, documentName: e.target.value })} />
          <select value={recordForm.documentRequestId} onChange={(e) => setRecordForm({ ...recordForm, documentRequestId: e.target.value })}>
            <option value="">Document request (optional)</option>
            {requestRows.map((request) => (
              <option key={request.id} value={request.id}>{request.title}</option>
            ))}
          </select>
          <select value={recordForm.clientEntityId} onChange={(e) => setRecordForm({ ...recordForm, clientEntityId: e.target.value })}>
            <option value="">Client entity (optional)</option>
            {entityRows.map((entity) => (
              <option key={entity.id} value={entity.id}>{entity.name}</option>
            ))}
          </select>
          <div className="accounting-inline-grid">
            <select value={recordForm.direction} onChange={(e) => setRecordForm({ ...recordForm, direction: e.target.value })}>
              <option value="inbound">Inbound from client</option>
              <option value="outbound">Outbound to client</option>
            </select>
            <select value={recordForm.action} onChange={(e) => setRecordForm({ ...recordForm, action: e.target.value })}>
              <option value="uploaded">Uploaded</option>
              <option value="downloaded">Downloaded</option>
              <option value="reviewed">Reviewed</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="reminder_sent">Reminder sent</option>
            </select>
          </div>
          <div className="accounting-inline-grid">
            <select value={recordForm.category} onChange={(e) => setRecordForm({ ...recordForm, category: e.target.value })}>
              {DOCUMENT_CATEGORIES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <select value={recordForm.status} onChange={(e) => setRecordForm({ ...recordForm, status: e.target.value })}>
              <option value="pending">Pending</option>
              <option value="received">Received</option>
              <option value="in_review">In review</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <input placeholder="Audit note" value={recordForm.notes} onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })} />
          <button type="button" className="mail-toolbar-btn" onClick={() => void createRecord()}>Record exchange</button>
        </section>
        <section className="accounting-record-panel">
          <div className="accounting-section-head">
            <span>Log</span>
            <div>
              <h3>Exchange audit trail</h3>
              <p>Immutable-style activity records for document handling.</p>
            </div>
          </div>
          {exchangeRows.length ? (
            <div className="accounting-timeline-list">
              {exchangeRows.map((record) => (
                <article key={record.id} className="accounting-timeline-card">
                  <div>
                    <strong>{record.documentName}</strong>
                    <p>{record.direction} · {record.action.replaceAll("_", " ")} · {record.status}</p>
                    {record.documentRequest ? <p>Request: {record.documentRequest.title}</p> : null}
                    {record.clientEntity ? <p>Entity: {record.clientEntity.name}</p> : null}
                    <small>{new Date(record.occurredAt).toLocaleString()}</small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <AccountingEmptyState title="No exchange events yet" body="Record a secure exchange event to populate the audit trail." />
          )}
        </section>
      </div>
      <section className="accounting-record-panel">
        <div className="accounting-section-head">
          <span>Templates</span>
          <div>
            <h3>Secure message templates</h3>
            <p>Load a vetted client communication template into New Mail.</p>
          </div>
        </div>
        <div className="accounting-template-grid">
          {templateRows.map((template) => (
            <article key={template.id} className="accounting-record-card">
              <strong>{template.name}</strong>
              <p>{template.description}</p>
              <p><strong>Subject:</strong> {template.subject}</p>
              <button
                type="button"
                className="mail-toolbar-btn"
                onClick={() => onUseTemplate({ subject: template.subject, html: template.bodyHtml })}
              >
                Use template
              </button>
            </article>
          ))}
        </div>
      </section>
    </AccountingToolShell>
  );
}

export function ClientEntitiesPanel() {
  const { data: contacts } = useLoad(() => api.acContacts().then((r) => r.contacts));
  const { data: entities, loading, error, refresh } = useLoad(() => api.acClientEntities().then((r) => r.entities));
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const { data: notes, refresh: refreshNotes } = useLoad(
    () => (selectedEntityId ? api.acEntityNotes(selectedEntityId).then((r) => r.notes) : Promise.resolve([])),
    [selectedEntityId],
  );
  const [entityForm, setEntityForm] = useState({
    name: "",
    entityType: "corporation",
    taxIdentifierType: "business_number",
    taxIdentifier: "",
    jurisdiction: "",
    fiscalYearEnd: "",
    engagementType: "year_end",
    parentEntityId: "",
    primaryContactId: "",
  });
  const [noteBody, setNoteBody] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");

  const createEntity = async () => {
    setActionError("");
    setActionNotice("");
    try {
      if (!entityForm.name.trim()) throw new Error("Entity name is required.");
      await api.createAcClientEntity({
        name: entityForm.name,
        entityType: entityForm.entityType,
        taxIdentifierType: entityForm.taxIdentifierType,
        taxIdentifier: entityForm.taxIdentifier || undefined,
        taxId: entityForm.taxIdentifier || undefined,
        jurisdiction: entityForm.jurisdiction || undefined,
        fiscalYearEnd: entityForm.fiscalYearEnd || undefined,
        engagementType: entityForm.engagementType,
        parentEntityId: entityForm.parentEntityId || undefined,
        primaryContactId: entityForm.primaryContactId || undefined,
      });
      setEntityForm({
        name: "",
        entityType: "corporation",
        taxIdentifierType: "business_number",
        taxIdentifier: "",
        jurisdiction: "",
        fiscalYearEnd: "",
        engagementType: "year_end",
        parentEntityId: "",
        primaryContactId: "",
      });
      setActionNotice("Client entity added.");
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to add client entity.");
    }
  };

  const addNote = async () => {
    if (!selectedEntityId || !noteBody.trim()) return;
    setActionError("");
    setActionNotice("");
    try {
      await api.createAcEntityNote(selectedEntityId, noteBody);
      setNoteBody("");
      setActionNotice("Entity note added.");
      await refreshNotes();
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to add entity note.");
    }
  };

  const entityRows = entities ?? [];
  const contactRows = contacts ?? [];
  const selectedEntity = entityRows.find((entity) => entity.id === selectedEntityId);

  return (
    <AccountingToolShell
      eyebrow="Entity registry"
      title="Client Entity Ledger"
      description="Maintain entity hierarchy, tax identifiers, engagement metadata, filing rollups, and team notes."
      stats={[
        { label: "Entities", value: entityRows.length, tone: "accent" },
        { label: "Contacts", value: contactRows.length },
        { label: "Selected notes", value: selectedEntity?.noteCount ?? 0 },
      ]}
    >
      {error ? <p className="mail-view-error">{error}</p> : null}
      {actionError ? <p className="mail-view-error">{actionError}</p> : null}
      {actionNotice ? <p className="mail-view-success">{actionNotice}</p> : null}
      <div className="accounting-tool-layout accounting-tool-layout--registry">
        <section className="accounting-command-panel accounting-command-panel--primary">
          <div className="accounting-section-head">
            <span>Entity</span>
            <div>
              <h3>Create entity record</h3>
              <p>Capture structure, tax ID, engagement type, and hierarchy in one place.</p>
            </div>
          </div>
          <input placeholder="Entity name" value={entityForm.name} onChange={(e) => setEntityForm({ ...entityForm, name: e.target.value })} />
          <div className="accounting-inline-grid">
            <select value={entityForm.entityType} onChange={(e) => setEntityForm({ ...entityForm, entityType: e.target.value })}>
              <option value="corporation">Corporation</option>
              <option value="partnership">Partnership</option>
              <option value="sole_proprietor">Sole proprietor</option>
              <option value="trust">Trust</option>
              <option value="non_profit">Non-profit</option>
              <option value="estate">Estate</option>
            </select>
            <select value={entityForm.engagementType} onChange={(e) => setEntityForm({ ...entityForm, engagementType: e.target.value })}>
              <option value="year_end">Year-end</option>
              <option value="bookkeeping">Bookkeeping</option>
              <option value="payroll">Payroll</option>
              <option value="sales_tax">Sales tax</option>
              <option value="advisory">Advisory</option>
            </select>
          </div>
          <div className="accounting-inline-grid">
            <select value={entityForm.taxIdentifierType} onChange={(e) => setEntityForm({ ...entityForm, taxIdentifierType: e.target.value })}>
              <option value="business_number">Business number</option>
              <option value="sin">SIN</option>
              <option value="ein">EIN</option>
              <option value="vat">VAT</option>
              <option value="trust_account">Trust account</option>
              <option value="other">Other</option>
            </select>
            <input placeholder="Tax identifier" value={entityForm.taxIdentifier} onChange={(e) => setEntityForm({ ...entityForm, taxIdentifier: e.target.value })} />
          </div>
          <div className="accounting-inline-grid">
            <input placeholder="Jurisdiction" value={entityForm.jurisdiction} onChange={(e) => setEntityForm({ ...entityForm, jurisdiction: e.target.value })} />
            <input placeholder="Fiscal year end (e.g. Dec 31)" value={entityForm.fiscalYearEnd} onChange={(e) => setEntityForm({ ...entityForm, fiscalYearEnd: e.target.value })} />
          </div>
          <select value={entityForm.parentEntityId} onChange={(e) => setEntityForm({ ...entityForm, parentEntityId: e.target.value })}>
            <option value="">Parent entity (optional)</option>
            {entityRows.map((entity) => (
              <option key={entity.id} value={entity.id}>{entity.name}</option>
            ))}
          </select>
          <select value={entityForm.primaryContactId} onChange={(e) => setEntityForm({ ...entityForm, primaryContactId: e.target.value })}>
            <option value="">Primary contact (optional)</option>
            {contactRows.map((c) => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
            ))}
          </select>
          <button type="button" className="mail-toolbar-btn" onClick={() => void createEntity()}>Add entity</button>
        </section>
        <section className="accounting-record-panel">
          <div className="accounting-section-head">
            <span>Ledger</span>
            <div>
              <h3>Entity register</h3>
              <p>Select an entity to open notes and operational context.</p>
            </div>
          </div>
          {loading ? <p className="mail-view-empty">Loading entities…</p> : null}
          {entityRows.length ? (
            <div className="accounting-record-grid accounting-record-grid--compact">
              {entityRows.map((entity) => (
                <article
                  key={entity.id}
                  className={`accounting-record-card${selectedEntityId === entity.id ? " accounting-record-card--active" : ""}`}
                >
                  <div className="accounting-record-top">
                    <strong>{entity.name}</strong>
                    <span>{entity.status}</span>
                  </div>
                  <p>{entity.entityType} · {entity.engagementType.replaceAll("_", " ")}</p>
                  <p>{entity.taxIdentifierType.replaceAll("_", " ")}: {entity.taxIdentifier ?? "Not set"}</p>
                  {entity.parentEntity ? <p>Parent: {entity.parentEntity.name}</p> : null}
                  <p>{entity.childEntityCount} child · {entity.filingDeadlineCount} deadlines · {entity.exchangeRecordCount} exchanges</p>
                  {entity.primaryContactName ? <p>Primary: {entity.primaryContactName}</p> : null}
                  <button type="button" className="mail-toolbar-btn" onClick={() => setSelectedEntityId(entity.id)}>Open notes</button>
                </article>
              ))}
            </div>
          ) : (
            <AccountingEmptyState title="No entities yet" body="Create a client entity to start the ledger." />
          )}
        </section>
      </div>
      {selectedEntityId ? (
        <section className="accounting-record-panel">
          <div className="accounting-section-head">
            <span>Notes</span>
            <div>
              <h3>{selectedEntity?.name ?? "Team notes"}</h3>
              <p>Add accountant notes and review entity history.</p>
            </div>
          </div>
          <div className="accounting-command-panel">
            <textarea placeholder="Add a note…" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} rows={3} />
            <button type="button" className="mail-toolbar-btn" onClick={() => void addNote()}>Add note</button>
          </div>
          <ul className="accounting-note-list">
            {(notes ?? []).map((note) => (
              <li key={note.id}>
                <strong>{note.author.displayName ?? note.author.email}</strong>
                <p>{note.body}</p>
                <small>{new Date(note.createdAt).toLocaleString()}</small>
              </li>
            ))}
          </ul>
          {(notes ?? []).length === 0 ? (
            <AccountingEmptyState title="No notes for this entity" body="Add the first internal note for this accounting record." />
          ) : null}
        </section>
      ) : null}
    </AccountingToolShell>
  );
}
