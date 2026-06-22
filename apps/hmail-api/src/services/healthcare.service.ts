import { prisma } from "../lib/prisma.js";
import { logComplianceEvent } from "./compliance.service.js";

const CHART_STATUSES = new Set(["active", "inactive", "transferred", "discharged"]);
const CARE_STAGES = new Set(["intake", "active_care", "follow_up", "closed"]);
const REFERRAL_STATUSES = new Set(["none", "received", "triaged", "scheduled", "completed", "declined"]);
const AUTHORIZATION_STATUSES = new Set(["not_required", "pending", "approved", "denied", "expired"]);
const APPOINTMENT_STATUSES = new Set(["scheduled", "completed", "cancelled", "no_show"]);
const APPOINTMENT_TYPES = new Set(["consult", "follow_up", "procedure", "telehealth", "callback"]);
const CALLBACK_STATUSES = new Set(["not_required", "queued", "completed", "failed"]);
const AUDIT_CASE_STATUSES = new Set(["open", "under_review", "closed", "escalated"]);
const REFERRAL_DIRECTIONS = new Set(["inbound", "outbound"]);
const REFERRAL_TYPES = new Set(["specialist", "diagnostic", "insurance", "community"]);
const REFERRAL_PRIORITIES = new Set(["routine", "urgent", "stat"]);
const REFERRAL_RECORD_STATUSES = new Set(["received", "triaged", "scheduled", "completed", "declined", "cancelled"]);
const ACCESS_LOG_ACTIONS = new Set(["viewed", "exported", "printed", "shared"]);
const CONTACT_ROLES = new Set(["patient", "referral", "provider"]);

export async function listHcContacts(tenantId: string, role?: string) {
  const contacts = await prisma.hcContact.findMany({
    where: {
      tenantId,
      ...(role ? { role } : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return contacts.map(formatContact);
}

export async function createHcContact(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    role?: string;
    dateOfBirth?: string;
    medicalRecordNumber?: string;
    preferredProvider?: string;
  },
) {
  if (!input.firstName.trim() || !input.lastName.trim()) {
    throw new Error("First and last name are required");
  }
  const role = input.role ?? "patient";
  if (!CONTACT_ROLES.has(role)) throw new Error("Invalid contact role");
  const dateOfBirth = input.dateOfBirth ? new Date(input.dateOfBirth) : null;
  if (dateOfBirth && Number.isNaN(dateOfBirth.getTime())) throw new Error("Invalid date of birth");

  const contact = await prisma.hcContact.create({
    data: {
      tenantId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      role,
      dateOfBirth,
      medicalRecordNumber: input.medicalRecordNumber?.trim() || null,
      preferredProvider: input.preferredProvider?.trim() || null,
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "hc_contact.created",
    entityType: "hc_contact",
    entityId: contact.id,
    metadata: { role, medicalRecordNumber: contact.medicalRecordNumber },
  });

  return formatContact(contact);
}

export async function listHcPatientCharts(tenantId: string, status?: string) {
  const charts = await prisma.hcPatientChart.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: {
      patientContact: true,
      assignedUser: { select: { id: true, email: true, displayName: true } },
      _count: { select: { appointments: true, referrals: true, auditCases: true, accessLogs: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return charts.map(formatPatientChart);
}

export async function createHcPatientChart(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    chartNumber: string;
    status?: string;
    careStage?: string;
    referralStatus?: string;
    authorizationStatus?: string;
    callbackRequired?: boolean;
    lastContactAt?: string;
    assignedUserId?: string;
    patientContactId?: string;
  },
) {
  if (!input.chartNumber.trim()) throw new Error("Chart number is required");
  const status = input.status ?? "active";
  if (!CHART_STATUSES.has(status)) throw new Error("Invalid patient chart status");
  const careStage = input.careStage ?? "intake";
  if (!CARE_STAGES.has(careStage)) throw new Error("Invalid care stage");
  const referralStatus = input.referralStatus ?? "none";
  if (!REFERRAL_STATUSES.has(referralStatus)) throw new Error("Invalid referral status");
  const authorizationStatus = input.authorizationStatus ?? "not_required";
  if (!AUTHORIZATION_STATUSES.has(authorizationStatus)) throw new Error("Invalid authorization status");
  const lastContactAt = input.lastContactAt ? new Date(input.lastContactAt) : null;
  if (lastContactAt && Number.isNaN(lastContactAt.getTime())) throw new Error("Invalid last contact date");

  if (input.patientContactId) {
    const patient = await prisma.hcContact.findFirst({
      where: { id: input.patientContactId, tenantId },
    });
    if (!patient) throw new Error("Patient contact not found");
  }

  const chart = await prisma.hcPatientChart.create({
    data: {
      tenantId,
      chartNumber: input.chartNumber.trim(),
      status,
      careStage,
      referralStatus,
      authorizationStatus,
      callbackRequired: input.callbackRequired ?? false,
      lastContactAt,
      assignedUserId: input.assignedUserId || userId,
      patientContactId: input.patientContactId || null,
    },
    include: {
      patientContact: true,
      assignedUser: { select: { id: true, email: true, displayName: true } },
      _count: { select: { appointments: true, referrals: true, auditCases: true, accessLogs: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "hc_patient_chart.created",
    entityType: "hc_patient_chart",
    entityId: chart.id,
    metadata: { chartNumber: chart.chartNumber, status, careStage, referralStatus, authorizationStatus },
  });

  return formatPatientChart(chart);
}

export async function updateHcPatientChartStatus(
  tenantId: string,
  userId: string,
  userEmail: string,
  chartId: string,
  input: {
    status?: string;
    careStage?: string;
    referralStatus?: string;
    authorizationStatus?: string;
    callbackRequired?: boolean;
    lastContactAt?: string;
  },
) {
  if (input.status && !CHART_STATUSES.has(input.status)) throw new Error("Invalid patient chart status");
  if (input.careStage && !CARE_STAGES.has(input.careStage)) throw new Error("Invalid care stage");
  if (input.referralStatus && !REFERRAL_STATUSES.has(input.referralStatus)) throw new Error("Invalid referral status");
  if (input.authorizationStatus && !AUTHORIZATION_STATUSES.has(input.authorizationStatus)) {
    throw new Error("Invalid authorization status");
  }
  const lastContactAt = input.lastContactAt ? new Date(input.lastContactAt) : undefined;
  if (lastContactAt && Number.isNaN(lastContactAt.getTime())) throw new Error("Invalid last contact date");

  const existing = await prisma.hcPatientChart.findFirst({ where: { id: chartId, tenantId } });
  if (!existing) throw new Error("Patient chart not found");

  const chart = await prisma.hcPatientChart.update({
    where: { id: chartId },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.careStage ? { careStage: input.careStage } : {}),
      ...(input.referralStatus ? { referralStatus: input.referralStatus } : {}),
      ...(input.authorizationStatus ? { authorizationStatus: input.authorizationStatus } : {}),
      ...(typeof input.callbackRequired === "boolean" ? { callbackRequired: input.callbackRequired } : {}),
      ...(lastContactAt ? { lastContactAt } : {}),
    },
    include: {
      patientContact: true,
      assignedUser: { select: { id: true, email: true, displayName: true } },
      _count: { select: { appointments: true, referrals: true, auditCases: true, accessLogs: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "hc_patient_chart.status_updated",
    entityType: "hc_patient_chart",
    entityId: chartId,
    metadata: input,
  });

  return formatPatientChart(chart);
}

export async function listHcAppointments(tenantId: string, status?: string) {
  const appointments = await prisma.hcAppointment.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: {
      chart: true,
      contact: true,
    },
    orderBy: { scheduledAt: "asc" },
  });

  return appointments.map(formatAppointment);
}

export async function createHcAppointment(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    chartId: string;
    contactId?: string;
    contact?: { firstName: string; lastName: string; email?: string; phone?: string };
    scheduledAt: string;
    appointmentType?: string;
    callbackStatus?: string;
    noShowReason?: string;
    notes?: string;
  },
) {
  const chart = await prisma.hcPatientChart.findFirst({
    where: { id: input.chartId, tenantId },
  });
  if (!chart) throw new Error("Patient chart not found");

  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error("Invalid scheduled date");
  if (scheduledAt.getTime() <= Date.now()) throw new Error("Appointment must be scheduled in the future");
  const appointmentType = input.appointmentType ?? "consult";
  if (!APPOINTMENT_TYPES.has(appointmentType)) throw new Error("Invalid appointment type");
  const callbackStatus = input.callbackStatus ?? "not_required";
  if (!CALLBACK_STATUSES.has(callbackStatus)) throw new Error("Invalid callback status");

  let contactId = input.contactId;
  if (!contactId) {
    if (!input.contact?.firstName?.trim() || !input.contact?.lastName?.trim()) {
      throw new Error("Contact ID or contact name is required");
    }
    const created = await createHcContact(tenantId, userId, userEmail, {
      firstName: input.contact.firstName,
      lastName: input.contact.lastName,
      email: input.contact.email,
      phone: input.contact.phone,
      role: "patient",
    });
    contactId = created.id;
  } else {
    const contact = await prisma.hcContact.findFirst({ where: { id: contactId, tenantId } });
    if (!contact) throw new Error("Contact not found");
  }

  const appointment = await prisma.hcAppointment.create({
    data: {
      tenantId,
      chartId: input.chartId,
      contactId,
      scheduledAt,
      appointmentType,
      callbackStatus,
      noShowReason: input.noShowReason?.trim() || null,
      notes: input.notes?.trim() || null,
      status: "scheduled",
    },
    include: { chart: true, contact: true },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "hc_appointment.created",
    entityType: "hc_appointment",
    entityId: appointment.id,
    metadata: { chartId: input.chartId, scheduledAt: scheduledAt.toISOString(), appointmentType, callbackStatus },
  });

  return formatAppointment(appointment);
}

export async function updateHcAppointmentStatus(
  tenantId: string,
  userId: string,
  userEmail: string,
  appointmentId: string,
  input: { status?: string; callbackStatus?: string; noShowReason?: string },
) {
  if (input.status && !APPOINTMENT_STATUSES.has(input.status)) throw new Error("Invalid appointment status");
  if (input.callbackStatus && !CALLBACK_STATUSES.has(input.callbackStatus)) throw new Error("Invalid callback status");

  const existing = await prisma.hcAppointment.findFirst({ where: { id: appointmentId, tenantId } });
  if (!existing) throw new Error("Appointment not found");

  const appointment = await prisma.hcAppointment.update({
    where: { id: appointmentId },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.callbackStatus ? { callbackStatus: input.callbackStatus } : {}),
      ...(input.noShowReason !== undefined ? { noShowReason: input.noShowReason.trim() || null } : {}),
    },
    include: { chart: true, contact: true },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "hc_appointment.status_updated",
    entityType: "hc_appointment",
    entityId: appointmentId,
    metadata: input,
  });

  return formatAppointment(appointment);
}

export async function listHcAuditCases(tenantId: string, status?: string) {
  const cases = await prisma.hcAuditCase.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: {
      chart: true,
      _count: { select: { notes: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return cases.map(formatAuditCase);
}

export async function createHcAuditCase(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    chartId: string;
    title: string;
    status?: string;
    severity?: string;
    accessReason?: string;
    roleScope?: string;
  },
) {
  const chart = await prisma.hcPatientChart.findFirst({
    where: { id: input.chartId, tenantId },
  });
  if (!chart) throw new Error("Patient chart not found");
  if (!input.title.trim()) throw new Error("Audit case title is required");

  const status = input.status ?? "open";
  if (!AUDIT_CASE_STATUSES.has(status)) throw new Error("Invalid audit case status");

  const auditCase = await prisma.hcAuditCase.create({
    data: {
      tenantId,
      chartId: input.chartId,
      title: input.title.trim(),
      status,
      severity: input.severity?.trim() || null,
      accessReason: input.accessReason?.trim() || null,
      roleScope: input.roleScope?.trim() || null,
    },
    include: {
      chart: true,
      _count: { select: { notes: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "hc_audit_case.created",
    entityType: "hc_audit_case",
    entityId: auditCase.id,
    metadata: { chartId: input.chartId, status, severity: auditCase.severity, roleScope: auditCase.roleScope },
  });

  return formatAuditCase(auditCase);
}

export async function updateHcAuditCaseStatus(
  tenantId: string,
  userId: string,
  userEmail: string,
  caseId: string,
  input: { status?: string; exportRequested?: boolean; resolved?: boolean },
) {
  if (input.status && !AUDIT_CASE_STATUSES.has(input.status)) throw new Error("Invalid audit case status");

  const existing = await prisma.hcAuditCase.findFirst({ where: { id: caseId, tenantId } });
  if (!existing) throw new Error("Audit case not found");
  const now = new Date();

  const auditCase = await prisma.hcAuditCase.update({
    where: { id: caseId },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.exportRequested ? { exportRequestedAt: now } : {}),
      ...(input.resolved ? { resolvedAt: now } : {}),
    },
    include: {
      chart: true,
      _count: { select: { notes: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "hc_audit_case.status_updated",
    entityType: "hc_audit_case",
    entityId: caseId,
    metadata: input,
  });

  return formatAuditCase(auditCase);
}

export async function listHcReferrals(tenantId: string, status?: string) {
  const referrals = await prisma.hcReferral.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: {
      chart: true,
      patientContact: true,
      providerContact: true,
    },
    orderBy: [{ priority: "desc" }, { dueAt: "asc" }, { receivedAt: "desc" }],
  });

  return referrals.map(formatReferral);
}

export async function createHcReferral(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    chartId: string;
    patientContactId?: string;
    providerContactId?: string;
    direction?: string;
    referralType?: string;
    specialty?: string;
    status?: string;
    priority?: string;
    receivedAt?: string;
    dueAt?: string;
    notes?: string;
  },
) {
  const chart = await prisma.hcPatientChart.findFirst({ where: { id: input.chartId, tenantId } });
  if (!chart) throw new Error("Patient chart not found");

  const direction = input.direction ?? "inbound";
  if (!REFERRAL_DIRECTIONS.has(direction)) throw new Error("Invalid referral direction");
  const referralType = input.referralType ?? "specialist";
  if (!REFERRAL_TYPES.has(referralType)) throw new Error("Invalid referral type");
  const status = input.status ?? "received";
  if (!REFERRAL_RECORD_STATUSES.has(status)) throw new Error("Invalid referral status");
  const priority = input.priority ?? "routine";
  if (!REFERRAL_PRIORITIES.has(priority)) throw new Error("Invalid referral priority");

  const receivedAt = input.receivedAt ? new Date(input.receivedAt) : new Date();
  if (Number.isNaN(receivedAt.getTime())) throw new Error("Invalid received date");
  const dueAt = input.dueAt ? new Date(input.dueAt) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) throw new Error("Invalid due date");

  for (const contactId of [input.patientContactId, input.providerContactId].filter(Boolean)) {
    const contact = await prisma.hcContact.findFirst({ where: { id: contactId, tenantId } });
    if (!contact) throw new Error("Referral contact not found");
  }

  const referral = await prisma.hcReferral.create({
    data: {
      tenantId,
      chartId: input.chartId,
      patientContactId: input.patientContactId || null,
      providerContactId: input.providerContactId || null,
      direction,
      referralType,
      specialty: input.specialty?.trim() || null,
      status,
      priority,
      receivedAt,
      dueAt,
      notes: input.notes?.trim() || null,
    },
    include: { chart: true, patientContact: true, providerContact: true },
  });

  await prisma.hcPatientChart.update({
    where: { id: input.chartId },
    data: { referralStatus: status, lastContactAt: receivedAt },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "hc_referral.created",
    entityType: "hc_referral",
    entityId: referral.id,
    metadata: { chartId: input.chartId, direction, referralType, status, priority },
  });

  return formatReferral(referral);
}

export async function updateHcReferralStatus(
  tenantId: string,
  userId: string,
  userEmail: string,
  referralId: string,
  status: string,
) {
  if (!REFERRAL_RECORD_STATUSES.has(status)) throw new Error("Invalid referral status");

  const existing = await prisma.hcReferral.findFirst({ where: { id: referralId, tenantId } });
  if (!existing) throw new Error("Referral not found");

  const referral = await prisma.hcReferral.update({
    where: { id: referralId },
    data: { status },
    include: { chart: true, patientContact: true, providerContact: true },
  });

  await prisma.hcPatientChart.update({
    where: { id: referral.chart.id },
    data: { referralStatus: status, lastContactAt: new Date() },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "hc_referral.status_updated",
    entityType: "hc_referral",
    entityId: referralId,
    metadata: { status },
  });

  return formatReferral(referral);
}

export async function listHcAccessLogs(tenantId: string, chartId?: string) {
  const logs = await prisma.hcAccessLog.findMany({
    where: {
      tenantId,
      ...(chartId ? { chartId } : {}),
    },
    include: {
      chart: true,
      user: { select: { id: true, email: true, displayName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return logs.map(formatAccessLog);
}

export async function createHcAccessLog(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: { chartId: string; action: string; reason: string; roleScope: string; ipAddress?: string },
) {
  const chart = await prisma.hcPatientChart.findFirst({ where: { id: input.chartId, tenantId } });
  if (!chart) throw new Error("Patient chart not found");
  if (!ACCESS_LOG_ACTIONS.has(input.action)) throw new Error("Invalid access log action");
  if (!input.reason.trim()) throw new Error("Access reason is required");
  if (!input.roleScope.trim()) throw new Error("Role scope is required");

  const log = await prisma.hcAccessLog.create({
    data: {
      tenantId,
      chartId: input.chartId,
      userId,
      action: input.action,
      reason: input.reason.trim(),
      roleScope: input.roleScope.trim(),
      ipAddress: input.ipAddress?.trim() || null,
      exportedAt: input.action === "exported" ? new Date() : null,
    },
    include: { chart: true, user: { select: { id: true, email: true, displayName: true } } },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "hc_access_log.created",
    entityType: "hc_access_log",
    entityId: log.id,
    metadata: { chartId: input.chartId, accessAction: input.action, roleScope: input.roleScope },
  });

  return formatAccessLog(log);
}

export async function listHcAuditNotes(tenantId: string, caseId: string) {
  const auditCase = await prisma.hcAuditCase.findFirst({ where: { id: caseId, tenantId } });
  if (!auditCase) throw new Error("Audit case not found");

  const notes = await prisma.hcAuditNote.findMany({
    where: { caseId },
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

export async function createHcAuditNote(
  tenantId: string,
  userId: string,
  userEmail: string,
  caseId: string,
  body: string,
) {
  const auditCase = await prisma.hcAuditCase.findFirst({ where: { id: caseId, tenantId } });
  if (!auditCase) throw new Error("Audit case not found");
  if (!body.trim()) throw new Error("Note body is required");

  const note = await prisma.hcAuditNote.create({
    data: { caseId, userId, body: body.trim() },
    include: { user: { select: { id: true, email: true, displayName: true } } },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "hc_audit_case.note_added",
    entityType: "hc_audit_note",
    entityId: note.id,
    metadata: { caseId },
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

function formatContact(contact: {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: string;
  dateOfBirth: Date | null;
  medicalRecordNumber: string | null;
  preferredProvider: string | null;
  createdAt: Date;
}) {
  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    role: contact.role,
    dateOfBirth: contact.dateOfBirth?.toISOString() ?? null,
    medicalRecordNumber: contact.medicalRecordNumber,
    preferredProvider: contact.preferredProvider,
    createdAt: contact.createdAt.toISOString(),
  };
}

function formatPatientChart(chart: {
  id: string;
  chartNumber: string;
  status: string;
  careStage: string;
  referralStatus: string;
  authorizationStatus: string;
  lastContactAt: Date | null;
  callbackRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
  patientContact?: { firstName: string; lastName: string } | null;
  assignedUser?: { id: string; email: string; displayName: string | null } | null;
  _count?: { appointments: number; auditCases: number; referrals?: number; accessLogs?: number };
}) {
  return {
    id: chart.id,
    chartNumber: chart.chartNumber,
    status: chart.status,
    careStage: chart.careStage,
    referralStatus: chart.referralStatus,
    authorizationStatus: chart.authorizationStatus,
    lastContactAt: chart.lastContactAt?.toISOString() ?? null,
    callbackRequired: chart.callbackRequired,
    patientName: chart.patientContact
      ? `${chart.patientContact.firstName} ${chart.patientContact.lastName}`
      : null,
    assignedUser: chart.assignedUser
      ? {
          id: chart.assignedUser.id,
          email: chart.assignedUser.email,
          displayName: chart.assignedUser.displayName,
        }
      : null,
    appointmentCount: chart._count?.appointments ?? 0,
    auditCaseCount: chart._count?.auditCases ?? 0,
    referralCount: chart._count?.referrals ?? 0,
    accessLogCount: chart._count?.accessLogs ?? 0,
    createdAt: chart.createdAt.toISOString(),
    updatedAt: chart.updatedAt.toISOString(),
  };
}

function formatAppointment(appointment: {
  id: string;
  scheduledAt: Date;
  status: string;
  appointmentType: string;
  callbackStatus: string;
  noShowReason: string | null;
  notes: string | null;
  chart: { id: string; chartNumber: string };
  contact: { firstName: string; lastName: string; email: string | null };
}) {
  return {
    id: appointment.id,
    scheduledAt: appointment.scheduledAt.toISOString(),
    status: appointment.status,
    appointmentType: appointment.appointmentType,
    callbackStatus: appointment.callbackStatus,
    noShowReason: appointment.noShowReason,
    notes: appointment.notes,
    chart: {
      id: appointment.chart.id,
      chartNumber: appointment.chart.chartNumber,
    },
    contactName: `${appointment.contact.firstName} ${appointment.contact.lastName}`,
    contactEmail: appointment.contact.email,
  };
}

function formatAuditCase(auditCase: {
  id: string;
  title: string;
  status: string;
  severity: string | null;
  accessReason: string | null;
  roleScope: string | null;
  exportRequestedAt: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  chart: { id: string; chartNumber: string };
  _count?: { notes: number };
}) {
  return {
    id: auditCase.id,
    title: auditCase.title,
    status: auditCase.status,
    severity: auditCase.severity,
    accessReason: auditCase.accessReason,
    roleScope: auditCase.roleScope,
    exportRequestedAt: auditCase.exportRequestedAt?.toISOString() ?? null,
    resolvedAt: auditCase.resolvedAt?.toISOString() ?? null,
    chart: {
      id: auditCase.chart.id,
      chartNumber: auditCase.chart.chartNumber,
    },
    noteCount: auditCase._count?.notes ?? 0,
    createdAt: auditCase.createdAt.toISOString(),
    updatedAt: auditCase.updatedAt.toISOString(),
  };
}

function formatReferral(referral: {
  id: string;
  direction: string;
  referralType: string;
  specialty: string | null;
  status: string;
  priority: string;
  receivedAt: Date;
  dueAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  chart: { id: string; chartNumber: string };
  patientContact?: { firstName: string; lastName: string } | null;
  providerContact?: { firstName: string; lastName: string } | null;
}) {
  return {
    id: referral.id,
    direction: referral.direction,
    referralType: referral.referralType,
    specialty: referral.specialty,
    status: referral.status,
    priority: referral.priority,
    receivedAt: referral.receivedAt.toISOString(),
    dueAt: referral.dueAt?.toISOString() ?? null,
    notes: referral.notes,
    chart: {
      id: referral.chart.id,
      chartNumber: referral.chart.chartNumber,
    },
    patientName: referral.patientContact
      ? `${referral.patientContact.firstName} ${referral.patientContact.lastName}`
      : null,
    providerName: referral.providerContact
      ? `${referral.providerContact.firstName} ${referral.providerContact.lastName}`
      : null,
    createdAt: referral.createdAt.toISOString(),
    updatedAt: referral.updatedAt.toISOString(),
  };
}

function formatAccessLog(log: {
  id: string;
  action: string;
  reason: string;
  roleScope: string;
  ipAddress: string | null;
  exportedAt: Date | null;
  createdAt: Date;
  chart: { id: string; chartNumber: string };
  user: { id: string; email: string; displayName: string | null };
}) {
  return {
    id: log.id,
    action: log.action,
    reason: log.reason,
    roleScope: log.roleScope,
    ipAddress: log.ipAddress,
    exportedAt: log.exportedAt?.toISOString() ?? null,
    createdAt: log.createdAt.toISOString(),
    chart: {
      id: log.chart.id,
      chartNumber: log.chart.chartNumber,
    },
    user: {
      id: log.user.id,
      email: log.user.email,
      displayName: log.user.displayName,
    },
  };
}
