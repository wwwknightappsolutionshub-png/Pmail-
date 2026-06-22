import { prisma } from "../lib/prisma.js";
import { logComplianceEvent } from "./compliance.service.js";

const CONTACT_ROLES = new Set(["client", "partner", "staff"]);
const DOCUMENT_REQUEST_STATUSES = new Set(["open", "requested", "client_uploading", "review_needed", "accepted", "overdue", "closed"]);
const DOCUMENT_CATEGORIES = new Set(["source_document", "tax_slip", "bank_statement", "payroll", "receipt", "entity_record", "signature", "notice"]);
const VAULT_STATUSES = new Set(["requested", "partially_received", "received", "in_review", "accepted", "rejected"]);
const FILING_DEADLINE_STATUSES = new Set(["open", "collecting_docs", "ready_to_file", "filed", "extended", "missed"]);
const FILING_TYPES = new Set(["corporate_tax", "personal_tax", "sales_tax", "payroll", "installment", "annual_return", "trust_return"]);
const CLIENT_ENTITY_STATUSES = new Set(["active", "pending", "inactive", "dissolved"]);
const ENTITY_TYPES = new Set(["corporation", "partnership", "sole_proprietor", "trust", "non_profit", "estate"]);
const TAX_IDENTIFIER_TYPES = new Set(["business_number", "sin", "ein", "vat", "trust_account", "other"]);
const EXCHANGE_DIRECTIONS = new Set(["inbound", "outbound"]);
const EXCHANGE_ACTIONS = new Set(["requested", "uploaded", "downloaded", "reviewed", "accepted", "rejected", "reminder_sent"]);
const EXCHANGE_STATUSES = new Set(["pending", "received", "in_review", "accepted", "rejected"]);

export async function listAcContacts(tenantId: string, role?: string) {
  const contacts = await prisma.acContact.findMany({
    where: {
      tenantId,
      ...(role ? { role } : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return contacts.map(formatContact);
}

export async function createAcContact(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: { firstName: string; lastName: string; email?: string; phone?: string; role?: string },
) {
  if (!input.firstName.trim() || !input.lastName.trim()) {
    throw new Error("First and last name are required");
  }
  const role = input.role ?? "client";
  if (!CONTACT_ROLES.has(role)) throw new Error("Invalid contact role");

  const contact = await prisma.acContact.create({
    data: {
      tenantId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      role,
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "ac_contact.created",
    entityType: "ac_contact",
    entityId: contact.id,
    metadata: { role },
  });

  return formatContact(contact);
}

export async function listAcDocumentRequests(tenantId: string, status?: string) {
  const requests = await prisma.acDocumentRequest.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: {
      clientContact: true,
      assignedUser: { select: { id: true, email: true, displayName: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return requests.map(formatDocumentRequest);
}

export async function createAcDocumentRequest(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    title: string;
    description?: string;
    referenceCode?: string;
    status?: string;
    category?: string;
    vaultStatus?: string;
    fiscalYear?: string;
    periodStart?: string;
    periodEnd?: string;
    dueAt?: string;
    reminderAt?: string;
    assignedUserId?: string;
    clientContactId?: string;
  },
) {
  if (!input.title.trim()) throw new Error("Document request title is required");
  const status = input.status ?? "requested";
  if (!DOCUMENT_REQUEST_STATUSES.has(status)) throw new Error("Invalid document request status");
  const category = input.category ?? "source_document";
  if (!DOCUMENT_CATEGORIES.has(category)) throw new Error("Invalid document category");
  const vaultStatus = input.vaultStatus ?? "requested";
  if (!VAULT_STATUSES.has(vaultStatus)) throw new Error("Invalid vault status");
  const periodStart = parseOptionalDate(input.periodStart, "Invalid period start");
  const periodEnd = parseOptionalDate(input.periodEnd, "Invalid period end");
  const dueAt = parseOptionalDate(input.dueAt, "Invalid request due date");
  const reminderAt = parseOptionalDate(input.reminderAt, "Invalid reminder date");

  if (input.clientContactId) {
    const client = await prisma.acContact.findFirst({
      where: { id: input.clientContactId, tenantId },
    });
    if (!client) throw new Error("Client contact not found");
  }

  const request = await prisma.acDocumentRequest.create({
    data: {
      tenantId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      referenceCode: input.referenceCode?.trim() || null,
      status,
      category,
      vaultStatus,
      fiscalYear: input.fiscalYear?.trim() || null,
      periodStart,
      periodEnd,
      dueAt,
      reminderAt,
      assignedUserId: input.assignedUserId || userId,
      clientContactId: input.clientContactId || null,
    },
    include: {
      clientContact: true,
      assignedUser: { select: { id: true, email: true, displayName: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "ac_document_request.created",
    entityType: "ac_document_request",
    entityId: request.id,
    metadata: { referenceCode: request.referenceCode, status, category, vaultStatus },
  });

  return formatDocumentRequest(request);
}

export async function updateAcDocumentRequestStatus(
  tenantId: string,
  userId: string,
  userEmail: string,
  requestId: string,
  status: string,
) {
  if (!DOCUMENT_REQUEST_STATUSES.has(status)) throw new Error("Invalid document request status");

  const existing = await prisma.acDocumentRequest.findFirst({ where: { id: requestId, tenantId } });
  if (!existing) throw new Error("Document request not found");

  const request = await prisma.acDocumentRequest.update({
    where: { id: requestId },
    data: {
      status,
      vaultStatus: documentStatusToVaultStatus(status),
      receivedAt: ["review_needed", "accepted"].includes(status) ? new Date() : existing.receivedAt,
    },
    include: {
      clientContact: true,
      assignedUser: { select: { id: true, email: true, displayName: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "ac_document_request.status_updated",
    entityType: "ac_document_request",
    entityId: requestId,
    metadata: { status },
  });

  return formatDocumentRequest(request);
}

export async function listAcFilingDeadlines(tenantId: string, status?: string) {
  const deadlines = await prisma.acFilingDeadline.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: {
      clientEntity: true,
      contact: true,
    },
    orderBy: { dueAt: "asc" },
  });

  return deadlines.map(formatFilingDeadline);
}

export async function createAcFilingDeadline(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    clientEntityId: string;
    contactId?: string;
    contact?: { firstName: string; lastName: string; email?: string; phone?: string };
    dueAt: string;
    filingType?: string;
    taxPeriod?: string;
    periodStart?: string;
    periodEnd?: string;
    reminderAt?: string;
    status?: string;
    notes?: string;
  },
) {
  const clientEntity = await prisma.acClientEntity.findFirst({
    where: { id: input.clientEntityId, tenantId },
  });
  if (!clientEntity) throw new Error("Client entity not found");

  const dueAt = new Date(input.dueAt);
  if (Number.isNaN(dueAt.getTime())) throw new Error("Invalid due date");
  const filingType = input.filingType ?? "corporate_tax";
  if (!FILING_TYPES.has(filingType)) throw new Error("Invalid filing type");
  const status = input.status ?? "open";
  if (!FILING_DEADLINE_STATUSES.has(status)) throw new Error("Invalid filing deadline status");
  const periodStart = parseOptionalDate(input.periodStart, "Invalid period start");
  const periodEnd = parseOptionalDate(input.periodEnd, "Invalid period end");
  const reminderAt = parseOptionalDate(input.reminderAt, "Invalid reminder date");

  let contactId = input.contactId;
  if (!contactId) {
    if (!input.contact?.firstName?.trim() || !input.contact?.lastName?.trim()) {
      throw new Error("Contact ID or contact name is required");
    }
    const created = await createAcContact(tenantId, userId, userEmail, {
      firstName: input.contact.firstName,
      lastName: input.contact.lastName,
      email: input.contact.email,
      phone: input.contact.phone,
      role: "client",
    });
    contactId = created.id;
  } else {
    const contact = await prisma.acContact.findFirst({ where: { id: contactId, tenantId } });
    if (!contact) throw new Error("Contact not found");
  }

  const deadline = await prisma.acFilingDeadline.create({
    data: {
      tenantId,
      clientEntityId: input.clientEntityId,
      contactId,
      dueAt,
      filingType,
      taxPeriod: input.taxPeriod?.trim() || "current",
      periodStart,
      periodEnd,
      reminderAt,
      notes: input.notes?.trim() || null,
      status,
    },
    include: { clientEntity: true, contact: true },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "ac_filing_deadline.created",
    entityType: "ac_filing_deadline",
    entityId: deadline.id,
    metadata: { clientEntityId: input.clientEntityId, dueAt: dueAt.toISOString(), filingType, taxPeriod: deadline.taxPeriod },
  });

  return formatFilingDeadline(deadline);
}

export async function updateAcFilingDeadlineStatus(
  tenantId: string,
  userId: string,
  userEmail: string,
  deadlineId: string,
  status: string,
) {
  if (!FILING_DEADLINE_STATUSES.has(status)) throw new Error("Invalid filing deadline status");

  const existing = await prisma.acFilingDeadline.findFirst({ where: { id: deadlineId, tenantId } });
  if (!existing) throw new Error("Filing deadline not found");

  const deadline = await prisma.acFilingDeadline.update({
    where: { id: deadlineId },
    data: { status, filedAt: status === "filed" ? new Date() : existing.filedAt },
    include: { clientEntity: true, contact: true },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "ac_filing_deadline.status_updated",
    entityType: "ac_filing_deadline",
    entityId: deadlineId,
    metadata: { status },
  });

  return formatFilingDeadline(deadline);
}

export async function listAcClientEntities(tenantId: string, status?: string) {
  const entities = await prisma.acClientEntity.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: {
      primaryContact: true,
      parentEntity: { select: { id: true, name: true } },
      _count: { select: { notes: true, filingDeadlines: true, childEntities: true, exchangeRecords: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return entities.map(formatClientEntity);
}

export async function createAcClientEntity(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    name: string;
    entityType: string;
    taxId?: string;
    taxIdentifierType?: string;
    taxIdentifier?: string;
    jurisdiction?: string;
    fiscalYearEnd?: string;
    engagementType?: string;
    status?: string;
    primaryContactId?: string;
    parentEntityId?: string;
  },
) {
  if (!input.name.trim()) throw new Error("Entity name is required");
  if (!input.entityType.trim()) throw new Error("Entity type is required");
  if (!ENTITY_TYPES.has(input.entityType)) throw new Error("Invalid entity type");

  const status = input.status ?? "active";
  if (!CLIENT_ENTITY_STATUSES.has(status)) throw new Error("Invalid client entity status");
  const taxIdentifierType = input.taxIdentifierType ?? "business_number";
  if (!TAX_IDENTIFIER_TYPES.has(taxIdentifierType)) throw new Error("Invalid tax identifier type");

  if (input.primaryContactId) {
    const contact = await prisma.acContact.findFirst({
      where: { id: input.primaryContactId, tenantId },
    });
    if (!contact) throw new Error("Primary contact not found");
  }
  if (input.parentEntityId) {
    const parent = await prisma.acClientEntity.findFirst({
      where: { id: input.parentEntityId, tenantId },
    });
    if (!parent) throw new Error("Parent entity not found");
  }

  const entity = await prisma.acClientEntity.create({
    data: {
      tenantId,
      name: input.name.trim(),
      entityType: input.entityType.trim(),
      taxId: input.taxId?.trim() || null,
      taxIdentifierType,
      taxIdentifier: input.taxIdentifier?.trim() || input.taxId?.trim() || null,
      jurisdiction: input.jurisdiction?.trim() || null,
      fiscalYearEnd: input.fiscalYearEnd?.trim() || null,
      engagementType: input.engagementType?.trim() || "year_end",
      status,
      primaryContactId: input.primaryContactId || null,
      parentEntityId: input.parentEntityId || null,
    },
    include: {
      primaryContact: true,
      parentEntity: { select: { id: true, name: true } },
      _count: { select: { notes: true, filingDeadlines: true, childEntities: true, exchangeRecords: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "ac_client_entity.created",
    entityType: "ac_client_entity",
    entityId: entity.id,
    metadata: { entityType: input.entityType, status, taxIdentifierType, parentEntityId: input.parentEntityId ?? null },
  });

  return formatClientEntity(entity);
}

export async function listAcEntityNotes(tenantId: string, entityId: string) {
  const entity = await prisma.acClientEntity.findFirst({ where: { id: entityId, tenantId } });
  if (!entity) throw new Error("Client entity not found");

  const notes = await prisma.acEntityNote.findMany({
    where: { entityId },
    include: { user: { select: { id: true, email: true, displayName: true } } },
    orderBy: { createdAt: "desc" },
  });

  return notes.map((n) => ({
    id: n.id,
    body: n.body,
    createdAt: n.createdAt.toISOString(),
    author: {
      id: n.user.id,
      email: n.user.email,
      displayName: n.user.displayName,
    },
  }));
}

export async function createAcEntityNote(
  tenantId: string,
  userId: string,
  userEmail: string,
  entityId: string,
  body: string,
) {
  const entity = await prisma.acClientEntity.findFirst({ where: { id: entityId, tenantId } });
  if (!entity) throw new Error("Client entity not found");
  if (!body.trim()) throw new Error("Note body is required");

  const note = await prisma.acEntityNote.create({
    data: { entityId, userId, body: body.trim() },
    include: { user: { select: { id: true, email: true, displayName: true } } },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "ac_entity.note_added",
    entityType: "ac_entity_note",
    entityId: note.id,
    metadata: { entityId },
  });

  return {
    id: note.id,
    body: note.body,
    createdAt: note.createdAt.toISOString(),
    author: {
      id: note.user.id,
      email: note.user.email,
      displayName: note.user.displayName,
    },
  };
}

export async function listAcDocumentExchangeRecords(
  tenantId: string,
  filter?: { status?: string; documentRequestId?: string; clientEntityId?: string },
) {
  const records = await prisma.acDocumentExchangeRecord.findMany({
    where: {
      tenantId,
      ...(filter?.status ? { status: filter.status } : {}),
      ...(filter?.documentRequestId ? { documentRequestId: filter.documentRequestId } : {}),
      ...(filter?.clientEntityId ? { clientEntityId: filter.clientEntityId } : {}),
    },
    include: {
      documentRequest: { select: { id: true, title: true, referenceCode: true } },
      clientEntity: { select: { id: true, name: true, entityType: true } },
      contact: { select: { firstName: true, lastName: true, email: true } },
      user: { select: { id: true, email: true, displayName: true } },
    },
    orderBy: { occurredAt: "desc" },
  });

  return records.map(formatExchangeRecord);
}

export async function createAcDocumentExchangeRecord(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    documentRequestId?: string;
    clientEntityId?: string;
    contactId?: string;
    direction?: string;
    action?: string;
    channel?: string;
    documentName: string;
    category?: string;
    status?: string;
    notes?: string;
    ipAddress?: string;
  },
) {
  if (!input.documentName.trim()) throw new Error("Document name is required");
  const direction = input.direction ?? "inbound";
  if (!EXCHANGE_DIRECTIONS.has(direction)) throw new Error("Invalid exchange direction");
  const action = input.action ?? "uploaded";
  if (!EXCHANGE_ACTIONS.has(action)) throw new Error("Invalid exchange action");
  const status = input.status ?? "received";
  if (!EXCHANGE_STATUSES.has(status)) throw new Error("Invalid exchange status");
  const category = input.category ?? "source_document";
  if (!DOCUMENT_CATEGORIES.has(category)) throw new Error("Invalid document category");

  await assertTenantRecord(input.documentRequestId, tenantId, "Document request not found", (id) =>
    prisma.acDocumentRequest.findFirst({ where: { id, tenantId } }),
  );
  await assertTenantRecord(input.clientEntityId, tenantId, "Client entity not found", (id) =>
    prisma.acClientEntity.findFirst({ where: { id, tenantId } }),
  );
  await assertTenantRecord(input.contactId, tenantId, "Contact not found", (id) =>
    prisma.acContact.findFirst({ where: { id, tenantId } }),
  );

  const record = await prisma.acDocumentExchangeRecord.create({
    data: {
      tenantId,
      documentRequestId: input.documentRequestId || null,
      clientEntityId: input.clientEntityId || null,
      contactId: input.contactId || null,
      userId,
      direction,
      action,
      channel: input.channel?.trim() || "secure_portal",
      documentName: input.documentName.trim(),
      category,
      status,
      notes: input.notes?.trim() || null,
      ipAddress: input.ipAddress || null,
    },
    include: {
      documentRequest: { select: { id: true, title: true, referenceCode: true } },
      clientEntity: { select: { id: true, name: true, entityType: true } },
      contact: { select: { firstName: true, lastName: true, email: true } },
      user: { select: { id: true, email: true, displayName: true } },
    },
  });

  if (input.documentRequestId && ["received", "in_review", "accepted"].includes(status)) {
    await prisma.acDocumentRequest.update({
      where: { id: input.documentRequestId },
      data: {
        vaultStatus: status === "accepted" ? "accepted" : status,
        receivedAt: new Date(),
        status: status === "accepted" ? "accepted" : "review_needed",
      },
    });
  }

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "ac_secure_exchange.recorded",
    entityType: "ac_document_exchange_record",
    entityId: record.id,
    metadata: { documentRequestId: input.documentRequestId ?? null, clientEntityId: input.clientEntityId ?? null, action, status },
  });

  return formatExchangeRecord(record);
}

function formatContact(contact: {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: string;
  createdAt: Date;
}) {
  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    role: contact.role,
    createdAt: contact.createdAt.toISOString(),
  };
}

function formatDocumentRequest(request: {
  id: string;
  title: string;
  description: string | null;
  referenceCode: string | null;
  status: string;
  category: string;
  vaultStatus: string;
  fiscalYear: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  dueAt: Date | null;
  reminderAt: Date | null;
  requestedAt: Date;
  receivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  clientContact?: { firstName: string; lastName: string } | null;
  assignedUser?: { id: string; email: string; displayName: string | null } | null;
}) {
  return {
    id: request.id,
    title: request.title,
    description: request.description,
    referenceCode: request.referenceCode,
    status: request.status,
    category: request.category,
    vaultStatus: request.vaultStatus,
    fiscalYear: request.fiscalYear,
    periodStart: request.periodStart?.toISOString() ?? null,
    periodEnd: request.periodEnd?.toISOString() ?? null,
    dueAt: request.dueAt?.toISOString() ?? null,
    reminderAt: request.reminderAt?.toISOString() ?? null,
    requestedAt: request.requestedAt.toISOString(),
    receivedAt: request.receivedAt?.toISOString() ?? null,
    clientName: request.clientContact
      ? `${request.clientContact.firstName} ${request.clientContact.lastName}`
      : null,
    assignedUser: request.assignedUser
      ? {
          id: request.assignedUser.id,
          email: request.assignedUser.email,
          displayName: request.assignedUser.displayName,
        }
      : null,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

function formatFilingDeadline(deadline: {
  id: string;
  dueAt: Date;
  status: string;
  filingType: string;
  taxPeriod: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  reminderAt: Date | null;
  filedAt: Date | null;
  notes: string | null;
  clientEntity: { id: string; name: string; entityType: string };
  contact: { firstName: string; lastName: string; email: string | null };
}) {
  return {
    id: deadline.id,
    dueAt: deadline.dueAt.toISOString(),
    status: deadline.status,
    filingType: deadline.filingType,
    taxPeriod: deadline.taxPeriod,
    periodStart: deadline.periodStart?.toISOString() ?? null,
    periodEnd: deadline.periodEnd?.toISOString() ?? null,
    reminderAt: deadline.reminderAt?.toISOString() ?? null,
    filedAt: deadline.filedAt?.toISOString() ?? null,
    notes: deadline.notes,
    clientEntity: {
      id: deadline.clientEntity.id,
      name: deadline.clientEntity.name,
      entityType: deadline.clientEntity.entityType,
    },
    contactName: `${deadline.contact.firstName} ${deadline.contact.lastName}`,
    contactEmail: deadline.contact.email,
  };
}

function formatClientEntity(entity: {
  id: string;
  name: string;
  entityType: string;
  taxId: string | null;
  taxIdentifierType: string;
  taxIdentifier: string | null;
  jurisdiction: string | null;
  fiscalYearEnd: string | null;
  engagementType: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  primaryContact?: { firstName: string; lastName: string } | null;
  parentEntity?: { id: string; name: string } | null;
  _count?: { notes: number; filingDeadlines: number; childEntities: number; exchangeRecords: number };
}) {
  return {
    id: entity.id,
    name: entity.name,
    entityType: entity.entityType,
    taxId: entity.taxId,
    taxIdentifierType: entity.taxIdentifierType,
    taxIdentifier: entity.taxIdentifier,
    jurisdiction: entity.jurisdiction,
    fiscalYearEnd: entity.fiscalYearEnd,
    engagementType: entity.engagementType,
    status: entity.status,
    primaryContactName: entity.primaryContact
      ? `${entity.primaryContact.firstName} ${entity.primaryContact.lastName}`
      : null,
    parentEntity: entity.parentEntity ? { id: entity.parentEntity.id, name: entity.parentEntity.name } : null,
    noteCount: entity._count?.notes ?? 0,
    filingDeadlineCount: entity._count?.filingDeadlines ?? 0,
    childEntityCount: entity._count?.childEntities ?? 0,
    exchangeRecordCount: entity._count?.exchangeRecords ?? 0,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

function formatExchangeRecord(record: {
  id: string;
  direction: string;
  action: string;
  channel: string;
  documentName: string;
  category: string;
  status: string;
  notes: string | null;
  ipAddress: string | null;
  occurredAt: Date;
  createdAt: Date;
  documentRequest?: { id: string; title: string; referenceCode: string | null } | null;
  clientEntity?: { id: string; name: string; entityType: string } | null;
  contact?: { firstName: string; lastName: string; email: string | null } | null;
  user?: { id: string; email: string; displayName: string | null } | null;
}) {
  return {
    id: record.id,
    direction: record.direction,
    action: record.action,
    channel: record.channel,
    documentName: record.documentName,
    category: record.category,
    status: record.status,
    notes: record.notes,
    ipAddress: record.ipAddress,
    occurredAt: record.occurredAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    documentRequest: record.documentRequest
      ? {
          id: record.documentRequest.id,
          title: record.documentRequest.title,
          referenceCode: record.documentRequest.referenceCode,
        }
      : null,
    clientEntity: record.clientEntity
      ? {
          id: record.clientEntity.id,
          name: record.clientEntity.name,
          entityType: record.clientEntity.entityType,
        }
      : null,
    contactName: record.contact ? `${record.contact.firstName} ${record.contact.lastName}` : null,
    contactEmail: record.contact?.email ?? null,
    user: record.user
      ? {
          id: record.user.id,
          email: record.user.email,
          displayName: record.user.displayName,
        }
      : null,
  };
}

function parseOptionalDate(value: string | undefined, message: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(message);
  return date;
}

function documentStatusToVaultStatus(status: string): string {
  if (status === "accepted" || status === "closed") return "accepted";
  if (status === "review_needed") return "in_review";
  if (status === "client_uploading") return "partially_received";
  return "requested";
}

async function assertTenantRecord<T>(
  id: string | undefined,
  _tenantId: string,
  message: string,
  loader: (id: string) => Promise<T | null>,
) {
  if (!id) return;
  const record = await loader(id);
  if (!record) throw new Error(message);
}
