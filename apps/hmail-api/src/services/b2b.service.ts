import { prisma } from "../lib/prisma.js";
import { logComplianceEvent } from "./compliance.service.js";
import { provisionB2bRouting } from "./b2b-routing.service.js";

const WORKSPACE_STATUSES = new Set(["active", "paused", "archived", "onboarding"]);
const ACCOUNT_TIERS = new Set(["standard", "premium", "enterprise", "strategic"]);
const ONBOARDING_STAGES = new Set(["kickoff", "discovery", "implementation", "launch", "steady_state"]);
const MILESTONE_STATUSES = new Set(["scheduled", "completed", "missed", "cancelled"]);
const MILESTONE_TYPES = new Set(["kickoff", "delivery", "review", "approval", "renewal"]);
const DELIVERABLE_STATUSES = new Set(["planned", "in_progress", "sent", "approved", "blocked"]);
const DELIVERABLE_KINDS = new Set(["deliverable", "asset", "report", "implementation", "training"]);
const PROPOSAL_STATUSES = new Set(["draft", "sent", "revision_requested", "approved", "declined", "expired"]);
const SLA_CASE_STATUSES = new Set(["open", "at_risk", "breached", "resolved", "escalated"]);
const SLA_SEVERITIES = new Set(["p1", "p2", "p3", "p4"]);
const SLA_CATEGORIES = new Set(["support", "delivery", "security", "billing", "integration"]);
const SLA_EVENT_TYPES = new Set(["created", "comment", "escalated", "breached", "resolved"]);
const CONTACT_ROLES = new Set(["client", "stakeholder", "vendor"]);

export async function listB2bContacts(tenantId: string, role?: string) {
  const contacts = await prisma.b2bContact.findMany({
    where: {
      tenantId,
      ...(role ? { role } : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return contacts.map(formatContact);
}

export async function createB2bContact(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    role?: string;
    company?: string;
    title?: string;
    decisionRole?: string;
  },
) {
  if (!input.firstName.trim() || !input.lastName.trim()) {
    throw new Error("First and last name are required");
  }
  const role = input.role ?? "client";
  if (!CONTACT_ROLES.has(role)) throw new Error("Invalid contact role");

  const contact = await prisma.b2bContact.create({
    data: {
      tenantId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      role,
      company: input.company?.trim() || null,
      title: input.title?.trim() || null,
      decisionRole: input.decisionRole?.trim() || null,
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "b2b_contact.created",
    entityType: "b2b_contact",
    entityId: contact.id,
    metadata: { role, company: contact.company, decisionRole: contact.decisionRole },
  });

  return formatContact(contact);
}

export async function listB2bWorkspaces(tenantId: string, status?: string) {
  const workspaces = await prisma.b2bWorkspace.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: {
      clientContact: true,
      assignedUser: { select: { id: true, email: true, displayName: true } },
      _count: { select: { milestones: true, deliverables: true, proposals: true, slaCases: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return workspaces.map(formatWorkspace);
}

export async function createB2bWorkspace(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    name: string;
    clientDomain?: string;
    status?: string;
    accountTier?: string;
    arrCents?: number;
    healthScore?: number;
    brandColor?: string;
    routingDomain?: string;
    onboardingStage?: string;
    renewalDate?: string;
    assignedUserId?: string;
    clientContactId?: string;
  },
) {
  if (!input.name.trim()) throw new Error("Workspace name is required");
  const status = input.status ?? "active";
  if (!WORKSPACE_STATUSES.has(status)) throw new Error("Invalid workspace status");
  const accountTier = input.accountTier ?? "standard";
  if (!ACCOUNT_TIERS.has(accountTier)) throw new Error("Invalid account tier");
  const onboardingStage = input.onboardingStage ?? "kickoff";
  if (!ONBOARDING_STAGES.has(onboardingStage)) throw new Error("Invalid onboarding stage");
  const healthScore = input.healthScore ?? 75;
  if (!Number.isInteger(healthScore) || healthScore < 0 || healthScore > 100) {
    throw new Error("Health score must be between 0 and 100");
  }
  const renewalDate = input.renewalDate ? new Date(input.renewalDate) : null;
  if (renewalDate && Number.isNaN(renewalDate.getTime())) throw new Error("Invalid renewal date");

  if (input.clientContactId) {
    const client = await prisma.b2bContact.findFirst({
      where: { id: input.clientContactId, tenantId },
    });
    if (!client) throw new Error("Client contact not found");
  }

  const workspace = await prisma.b2bWorkspace.create({
    data: {
      tenantId,
      name: input.name.trim(),
      clientDomain: input.clientDomain?.trim() || null,
      status,
      accountTier,
      arrCents: input.arrCents ?? null,
      healthScore,
      brandColor: input.brandColor?.trim() || null,
      routingDomain: input.routingDomain?.trim() || null,
      onboardingStage,
      renewalDate,
      assignedUserId: input.assignedUserId || userId,
      clientContactId: input.clientContactId || null,
    },
    include: {
      clientContact: true,
      assignedUser: { select: { id: true, email: true, displayName: true } },
      _count: { select: { milestones: true, deliverables: true, proposals: true, slaCases: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "b2b_workspace.created",
    entityType: "b2b_workspace",
    entityId: workspace.id,
    metadata: { clientDomain: workspace.clientDomain, status, accountTier, arrCents: workspace.arrCents },
  });

  await provisionB2bRouting(workspace.id, tenantId);

  return formatWorkspace(workspace);
}

export async function updateB2bWorkspaceStatus(
  tenantId: string,
  userId: string,
  userEmail: string,
  workspaceId: string,
  input: {
    status?: string;
    accountTier?: string;
    healthScore?: number;
    onboardingStage?: string;
    renewalDate?: string;
  },
) {
  if (input.status && !WORKSPACE_STATUSES.has(input.status)) throw new Error("Invalid workspace status");
  if (input.accountTier && !ACCOUNT_TIERS.has(input.accountTier)) throw new Error("Invalid account tier");
  if (input.onboardingStage && !ONBOARDING_STAGES.has(input.onboardingStage)) throw new Error("Invalid onboarding stage");
  if (input.healthScore !== undefined && (!Number.isInteger(input.healthScore) || input.healthScore < 0 || input.healthScore > 100)) {
    throw new Error("Health score must be between 0 and 100");
  }
  const renewalDate = input.renewalDate ? new Date(input.renewalDate) : undefined;
  if (renewalDate && Number.isNaN(renewalDate.getTime())) throw new Error("Invalid renewal date");

  const existing = await prisma.b2bWorkspace.findFirst({ where: { id: workspaceId, tenantId } });
  if (!existing) throw new Error("Workspace not found");

  const workspace = await prisma.b2bWorkspace.update({
    where: { id: workspaceId },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.accountTier ? { accountTier: input.accountTier } : {}),
      ...(input.healthScore !== undefined ? { healthScore: input.healthScore } : {}),
      ...(input.onboardingStage ? { onboardingStage: input.onboardingStage } : {}),
      ...(renewalDate ? { renewalDate } : {}),
    },
    include: {
      clientContact: true,
      assignedUser: { select: { id: true, email: true, displayName: true } },
      _count: { select: { milestones: true, deliverables: true, proposals: true, slaCases: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "b2b_workspace.status_updated",
    entityType: "b2b_workspace",
    entityId: workspaceId,
    metadata: input,
  });

  return formatWorkspace(workspace);
}

export async function listB2bMilestones(tenantId: string, status?: string) {
  const milestones = await prisma.b2bMilestone.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: {
      workspace: true,
      contact: true,
    },
    orderBy: { scheduledAt: "asc" },
  });

  return milestones.map(formatMilestone);
}

export async function createB2bMilestone(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    workspaceId: string;
    title: string;
    contactId?: string;
    contact?: { firstName: string; lastName: string; email?: string; phone?: string };
    scheduledAt: string;
    milestoneType?: string;
    phase?: string;
    ownerRole?: string;
    deliverableUrl?: string;
    notes?: string;
  },
) {
  const workspace = await prisma.b2bWorkspace.findFirst({
    where: { id: input.workspaceId, tenantId },
  });
  if (!workspace) throw new Error("Workspace not found");
  if (!input.title.trim()) throw new Error("Milestone title is required");

  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error("Invalid scheduled date");
  if (scheduledAt.getTime() <= Date.now()) throw new Error("Milestone must be scheduled in the future");
  const milestoneType = input.milestoneType ?? "delivery";
  if (!MILESTONE_TYPES.has(milestoneType)) throw new Error("Invalid milestone type");

  let contactId = input.contactId;
  if (!contactId) {
    if (!input.contact?.firstName?.trim() || !input.contact?.lastName?.trim()) {
      throw new Error("Contact ID or contact name is required");
    }
    const created = await createB2bContact(tenantId, userId, userEmail, {
      firstName: input.contact.firstName,
      lastName: input.contact.lastName,
      email: input.contact.email,
      phone: input.contact.phone,
      role: "client",
    });
    contactId = created.id;
  } else {
    const contact = await prisma.b2bContact.findFirst({ where: { id: contactId, tenantId } });
    if (!contact) throw new Error("Contact not found");
  }

  const milestone = await prisma.b2bMilestone.create({
    data: {
      tenantId,
      workspaceId: input.workspaceId,
      contactId,
      title: input.title.trim(),
      scheduledAt,
      milestoneType,
      phase: input.phase?.trim() || "implementation",
      ownerRole: input.ownerRole?.trim() || null,
      deliverableUrl: input.deliverableUrl?.trim() || null,
      notes: input.notes?.trim() || null,
      status: "scheduled",
    },
    include: { workspace: true, contact: true },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "b2b_milestone.created",
    entityType: "b2b_milestone",
    entityId: milestone.id,
    metadata: { workspaceId: input.workspaceId, scheduledAt: scheduledAt.toISOString(), milestoneType },
  });

  return formatMilestone(milestone);
}

export async function updateB2bMilestoneStatus(
  tenantId: string,
  userId: string,
  userEmail: string,
  milestoneId: string,
  status: string,
) {
  if (!MILESTONE_STATUSES.has(status)) throw new Error("Invalid milestone status");

  const existing = await prisma.b2bMilestone.findFirst({ where: { id: milestoneId, tenantId } });
  if (!existing) throw new Error("Milestone not found");

  const milestone = await prisma.b2bMilestone.update({
    where: { id: milestoneId },
    data: { status },
    include: { workspace: true, contact: true },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "b2b_milestone.status_updated",
    entityType: "b2b_milestone",
    entityId: milestoneId,
    metadata: { status },
  });

  return formatMilestone(milestone);
}

export async function listB2bDeliverables(tenantId: string, status?: string) {
  const deliverables = await prisma.b2bDeliverable.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: { workspace: true },
    orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
  });

  return deliverables.map(formatDeliverable);
}

export async function createB2bDeliverable(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: { workspaceId: string; title: string; kind?: string; dueAt?: string; url?: string; status?: string },
) {
  const workspace = await prisma.b2bWorkspace.findFirst({ where: { id: input.workspaceId, tenantId } });
  if (!workspace) throw new Error("Workspace not found");
  if (!input.title.trim()) throw new Error("Deliverable title is required");
  const kind = input.kind ?? "deliverable";
  if (!DELIVERABLE_KINDS.has(kind)) throw new Error("Invalid deliverable kind");
  const status = input.status ?? "planned";
  if (!DELIVERABLE_STATUSES.has(status)) throw new Error("Invalid deliverable status");
  const dueAt = input.dueAt ? new Date(input.dueAt) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) throw new Error("Invalid due date");

  const deliverable = await prisma.b2bDeliverable.create({
    data: {
      tenantId,
      workspaceId: input.workspaceId,
      title: input.title.trim(),
      kind,
      status,
      dueAt,
      url: input.url?.trim() || null,
      approvedAt: status === "approved" ? new Date() : null,
    },
    include: { workspace: true },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "b2b_deliverable.created",
    entityType: "b2b_deliverable",
    entityId: deliverable.id,
    metadata: { workspaceId: input.workspaceId, kind, status },
  });

  return formatDeliverable(deliverable);
}

export async function updateB2bDeliverableStatus(
  tenantId: string,
  userId: string,
  userEmail: string,
  deliverableId: string,
  status: string,
) {
  if (!DELIVERABLE_STATUSES.has(status)) throw new Error("Invalid deliverable status");
  const existing = await prisma.b2bDeliverable.findFirst({ where: { id: deliverableId, tenantId } });
  if (!existing) throw new Error("Deliverable not found");

  const deliverable = await prisma.b2bDeliverable.update({
    where: { id: deliverableId },
    data: { status, approvedAt: status === "approved" ? new Date() : null },
    include: { workspace: true },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "b2b_deliverable.status_updated",
    entityType: "b2b_deliverable",
    entityId: deliverableId,
    metadata: { status },
  });

  return formatDeliverable(deliverable);
}

export async function listB2bProposals(tenantId: string, status?: string) {
  const proposals = await prisma.b2bProposal.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: {
      workspace: true,
      createdByUser: { select: { id: true, email: true, displayName: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { version: "desc" }],
  });

  return proposals.map(formatProposal);
}

export async function createB2bProposal(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    workspaceId: string;
    title: string;
    version?: number;
    status?: string;
    sowUrl?: string;
    amountCents?: number;
    validUntil?: string;
  },
) {
  const workspace = await prisma.b2bWorkspace.findFirst({ where: { id: input.workspaceId, tenantId } });
  if (!workspace) throw new Error("Workspace not found");
  if (!input.title.trim()) throw new Error("Proposal title is required");
  const status = input.status ?? "draft";
  if (!PROPOSAL_STATUSES.has(status)) throw new Error("Invalid proposal status");
  const validUntil = input.validUntil ? new Date(input.validUntil) : null;
  if (validUntil && Number.isNaN(validUntil.getTime())) throw new Error("Invalid valid until date");

  const proposal = await prisma.b2bProposal.create({
    data: {
      tenantId,
      workspaceId: input.workspaceId,
      title: input.title.trim(),
      version: input.version ?? 1,
      status,
      sowUrl: input.sowUrl?.trim() || null,
      amountCents: input.amountCents ?? null,
      validUntil,
      approvedAt: status === "approved" ? new Date() : null,
      createdByUserId: userId,
    },
    include: {
      workspace: true,
      createdByUser: { select: { id: true, email: true, displayName: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "b2b_proposal.created",
    entityType: "b2b_proposal",
    entityId: proposal.id,
    metadata: { workspaceId: input.workspaceId, version: proposal.version, status, amountCents: proposal.amountCents },
  });

  return formatProposal(proposal);
}

export async function updateB2bProposalStatus(
  tenantId: string,
  userId: string,
  userEmail: string,
  proposalId: string,
  status: string,
) {
  if (!PROPOSAL_STATUSES.has(status)) throw new Error("Invalid proposal status");
  const existing = await prisma.b2bProposal.findFirst({ where: { id: proposalId, tenantId } });
  if (!existing) throw new Error("Proposal not found");

  const proposal = await prisma.b2bProposal.update({
    where: { id: proposalId },
    data: { status, approvedAt: status === "approved" ? new Date() : null },
    include: {
      workspace: true,
      createdByUser: { select: { id: true, email: true, displayName: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "b2b_proposal.status_updated",
    entityType: "b2b_proposal",
    entityId: proposalId,
    metadata: { status },
  });

  return formatProposal(proposal);
}

export async function listB2bSlaCases(tenantId: string, status?: string) {
  const cases = await prisma.b2bSlaCase.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: {
      workspace: true,
      _count: { select: { notes: true, events: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return cases.map(formatSlaCase);
}

export async function createB2bSlaCase(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    workspaceId: string;
    title: string;
    status?: string;
    severity?: string;
    category?: string;
    responseTargetMinutes?: number;
    resolutionTargetMinutes?: number;
    responseDueAt?: string;
    breachAt?: string;
  },
) {
  const workspace = await prisma.b2bWorkspace.findFirst({
    where: { id: input.workspaceId, tenantId },
  });
  if (!workspace) throw new Error("Workspace not found");
  if (!input.title.trim()) throw new Error("SLA case title is required");

  const status = input.status ?? "open";
  if (!SLA_CASE_STATUSES.has(status)) throw new Error("Invalid SLA case status");
  const severity = input.severity ?? "p3";
  if (!SLA_SEVERITIES.has(severity)) throw new Error("Invalid SLA severity");
  const category = input.category ?? "support";
  if (!SLA_CATEGORIES.has(category)) throw new Error("Invalid SLA category");

  const responseDueAt = input.responseDueAt ? new Date(input.responseDueAt) : null;
  if (responseDueAt && Number.isNaN(responseDueAt.getTime())) {
    throw new Error("Invalid response due date");
  }

  const breachAt = input.breachAt ? new Date(input.breachAt) : null;
  if (breachAt && Number.isNaN(breachAt.getTime())) {
    throw new Error("Invalid breach date");
  }

  const slaCase = await prisma.b2bSlaCase.create({
    data: {
      tenantId,
      workspaceId: input.workspaceId,
      title: input.title.trim(),
      status,
      severity,
      category,
      responseTargetMinutes: input.responseTargetMinutes ?? 240,
      resolutionTargetMinutes: input.resolutionTargetMinutes ?? 1440,
      responseDueAt,
      breachAt,
    },
    include: {
      workspace: true,
      _count: { select: { notes: true, events: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "b2b_sla_case.created",
    entityType: "b2b_sla_case",
    entityId: slaCase.id,
    metadata: { workspaceId: input.workspaceId, status, severity, category },
  });

  return formatSlaCase(slaCase);
}

export async function updateB2bSlaCaseStatus(
  tenantId: string,
  userId: string,
  userEmail: string,
  caseId: string,
  input: { status?: string; escalated?: boolean; resolved?: boolean },
) {
  if (input.status && !SLA_CASE_STATUSES.has(input.status)) throw new Error("Invalid SLA case status");

  const existing = await prisma.b2bSlaCase.findFirst({ where: { id: caseId, tenantId } });
  if (!existing) throw new Error("SLA case not found");

  const slaCase = await prisma.b2bSlaCase.update({
    where: { id: caseId },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.escalated ? { escalatedAt: new Date() } : {}),
      ...(input.resolved ? { resolvedAt: new Date() } : {}),
    },
    include: {
      workspace: true,
      _count: { select: { notes: true, events: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "b2b_sla_case.status_updated",
    entityType: "b2b_sla_case",
    entityId: caseId,
    metadata: input,
  });

  return formatSlaCase(slaCase);
}

export async function listB2bSlaEvents(tenantId: string, caseId: string) {
  const slaCase = await prisma.b2bSlaCase.findFirst({ where: { id: caseId, tenantId } });
  if (!slaCase) throw new Error("SLA case not found");

  const events = await prisma.b2bSlaEvent.findMany({
    where: { tenantId, caseId },
    include: { user: { select: { id: true, email: true, displayName: true } } },
    orderBy: { createdAt: "desc" },
  });

  return events.map(formatSlaEvent);
}

export async function createB2bSlaEvent(
  tenantId: string,
  userId: string,
  userEmail: string,
  caseId: string,
  input: { eventType: string; message: string },
) {
  const slaCase = await prisma.b2bSlaCase.findFirst({ where: { id: caseId, tenantId } });
  if (!slaCase) throw new Error("SLA case not found");
  if (!SLA_EVENT_TYPES.has(input.eventType)) throw new Error("Invalid SLA event type");
  if (!input.message.trim()) throw new Error("SLA event message is required");

  const event = await prisma.b2bSlaEvent.create({
    data: {
      tenantId,
      caseId,
      userId,
      eventType: input.eventType,
      message: input.message.trim(),
    },
    include: { user: { select: { id: true, email: true, displayName: true } } },
  });

  if (input.eventType === "escalated" || input.eventType === "breached" || input.eventType === "resolved") {
    await prisma.b2bSlaCase.update({
      where: { id: caseId },
      data: {
        ...(input.eventType === "escalated" ? { status: "escalated", escalatedAt: new Date() } : {}),
        ...(input.eventType === "breached" ? { status: "breached", breachAt: new Date() } : {}),
        ...(input.eventType === "resolved" ? { status: "resolved", resolvedAt: new Date() } : {}),
      },
    });
  }

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "b2b_sla_event.created",
    entityType: "b2b_sla_event",
    entityId: event.id,
    metadata: { caseId, eventType: input.eventType },
  });

  return formatSlaEvent(event);
}

export async function listB2bSlaNotes(tenantId: string, caseId: string) {
  const slaCase = await prisma.b2bSlaCase.findFirst({ where: { id: caseId, tenantId } });
  if (!slaCase) throw new Error("SLA case not found");

  const notes = await prisma.b2bSlaNote.findMany({
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

export async function createB2bSlaNote(
  tenantId: string,
  userId: string,
  userEmail: string,
  caseId: string,
  body: string,
) {
  const slaCase = await prisma.b2bSlaCase.findFirst({ where: { id: caseId, tenantId } });
  if (!slaCase) throw new Error("SLA case not found");
  if (!body.trim()) throw new Error("Note body is required");

  const note = await prisma.b2bSlaNote.create({
    data: { caseId, userId, body: body.trim() },
    include: { user: { select: { id: true, email: true, displayName: true } } },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "b2b_sla_case.note_added",
    entityType: "b2b_sla_note",
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
  company: string | null;
  title: string | null;
  decisionRole: string | null;
  createdAt: Date;
}) {
  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    role: contact.role,
    company: contact.company,
    title: contact.title,
    decisionRole: contact.decisionRole,
    createdAt: contact.createdAt.toISOString(),
  };
}

function formatWorkspace(workspace: {
  id: string;
  name: string;
  clientDomain: string | null;
  status: string;
  accountTier: string;
  arrCents: number | null;
  healthScore: number;
  brandColor: string | null;
  routingDomain: string | null;
  routingStatus?: string;
  routingMailbox?: string | null;
  routingActivatedAt?: Date | null;
  onboardingStage: string;
  renewalDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  clientContact?: { firstName: string; lastName: string } | null;
  assignedUser?: { id: string; email: string; displayName: string | null } | null;
  _count?: { milestones: number; deliverables?: number; proposals?: number; slaCases: number };
}) {
  return {
    id: workspace.id,
    name: workspace.name,
    clientDomain: workspace.clientDomain,
    status: workspace.status,
    accountTier: workspace.accountTier,
    arrCents: workspace.arrCents,
    healthScore: workspace.healthScore,
    brandColor: workspace.brandColor,
    routingDomain: workspace.routingDomain,
    routingStatus: workspace.routingStatus ?? "pending",
    routingMailbox: workspace.routingMailbox ?? null,
    routingActivatedAt: workspace.routingActivatedAt?.toISOString() ?? null,
    onboardingStage: workspace.onboardingStage,
    renewalDate: workspace.renewalDate?.toISOString() ?? null,
    clientName: workspace.clientContact
      ? `${workspace.clientContact.firstName} ${workspace.clientContact.lastName}`
      : null,
    assignedUser: workspace.assignedUser
      ? {
          id: workspace.assignedUser.id,
          email: workspace.assignedUser.email,
          displayName: workspace.assignedUser.displayName,
        }
      : null,
    milestoneCount: workspace._count?.milestones ?? 0,
    deliverableCount: workspace._count?.deliverables ?? 0,
    proposalCount: workspace._count?.proposals ?? 0,
    slaCaseCount: workspace._count?.slaCases ?? 0,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  };
}

function formatMilestone(milestone: {
  id: string;
  title: string;
  scheduledAt: Date;
  status: string;
  milestoneType: string;
  phase: string;
  ownerRole: string | null;
  deliverableUrl: string | null;
  notes: string | null;
  workspace: { id: string; name: string; clientDomain: string | null };
  contact: { firstName: string; lastName: string; email: string | null };
}) {
  return {
    id: milestone.id,
    title: milestone.title,
    scheduledAt: milestone.scheduledAt.toISOString(),
    status: milestone.status,
    milestoneType: milestone.milestoneType,
    phase: milestone.phase,
    ownerRole: milestone.ownerRole,
    deliverableUrl: milestone.deliverableUrl,
    notes: milestone.notes,
    workspace: {
      id: milestone.workspace.id,
      name: milestone.workspace.name,
      clientDomain: milestone.workspace.clientDomain,
    },
    contactName: `${milestone.contact.firstName} ${milestone.contact.lastName}`,
    contactEmail: milestone.contact.email,
  };
}

function formatDeliverable(deliverable: {
  id: string;
  title: string;
  kind: string;
  status: string;
  dueAt: Date | null;
  url: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  workspace: { id: string; name: string; clientDomain: string | null };
}) {
  return {
    id: deliverable.id,
    title: deliverable.title,
    kind: deliverable.kind,
    status: deliverable.status,
    dueAt: deliverable.dueAt?.toISOString() ?? null,
    url: deliverable.url,
    approvedAt: deliverable.approvedAt?.toISOString() ?? null,
    workspace: {
      id: deliverable.workspace.id,
      name: deliverable.workspace.name,
      clientDomain: deliverable.workspace.clientDomain,
    },
    createdAt: deliverable.createdAt.toISOString(),
    updatedAt: deliverable.updatedAt.toISOString(),
  };
}

function formatProposal(proposal: {
  id: string;
  title: string;
  version: number;
  status: string;
  sowUrl: string | null;
  amountCents: number | null;
  validUntil: Date | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  workspace: { id: string; name: string; clientDomain: string | null };
  createdByUser?: { id: string; email: string; displayName: string | null } | null;
}) {
  return {
    id: proposal.id,
    title: proposal.title,
    version: proposal.version,
    status: proposal.status,
    sowUrl: proposal.sowUrl,
    amountCents: proposal.amountCents,
    validUntil: proposal.validUntil?.toISOString() ?? null,
    approvedAt: proposal.approvedAt?.toISOString() ?? null,
    workspace: {
      id: proposal.workspace.id,
      name: proposal.workspace.name,
      clientDomain: proposal.workspace.clientDomain,
    },
    createdByUser: proposal.createdByUser
      ? {
          id: proposal.createdByUser.id,
          email: proposal.createdByUser.email,
          displayName: proposal.createdByUser.displayName,
        }
      : null,
    createdAt: proposal.createdAt.toISOString(),
    updatedAt: proposal.updatedAt.toISOString(),
  };
}

function formatSlaCase(slaCase: {
  id: string;
  title: string;
  status: string;
  severity: string;
  category: string;
  responseTargetMinutes: number;
  resolutionTargetMinutes: number;
  responseDueAt: Date | null;
  breachAt: Date | null;
  escalatedAt: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  workspace: { id: string; name: string; clientDomain: string | null };
  _count?: { notes: number; events?: number };
}) {
  return {
    id: slaCase.id,
    title: slaCase.title,
    status: slaCase.status,
    severity: slaCase.severity,
    category: slaCase.category,
    responseTargetMinutes: slaCase.responseTargetMinutes,
    resolutionTargetMinutes: slaCase.resolutionTargetMinutes,
    responseDueAt: slaCase.responseDueAt?.toISOString() ?? null,
    breachAt: slaCase.breachAt?.toISOString() ?? null,
    escalatedAt: slaCase.escalatedAt?.toISOString() ?? null,
    resolvedAt: slaCase.resolvedAt?.toISOString() ?? null,
    workspace: {
      id: slaCase.workspace.id,
      name: slaCase.workspace.name,
      clientDomain: slaCase.workspace.clientDomain,
    },
    noteCount: slaCase._count?.notes ?? 0,
    eventCount: slaCase._count?.events ?? 0,
    createdAt: slaCase.createdAt.toISOString(),
    updatedAt: slaCase.updatedAt.toISOString(),
  };
}

function formatSlaEvent(event: {
  id: string;
  eventType: string;
  message: string;
  createdAt: Date;
  user: { id: string; email: string; displayName: string | null };
}) {
  return {
    id: event.id,
    eventType: event.eventType,
    message: event.message,
    createdAt: event.createdAt.toISOString(),
    user: {
      id: event.user.id,
      email: event.user.email,
      displayName: event.user.displayName,
    },
  };
}
