import { prisma } from "../lib/prisma.js";
import { logComplianceEvent } from "./compliance.service.js";

const ROLE_STATUSES = new Set(["open", "interviewing", "filled", "on_hold", "cancelled"]);
const ROLE_PRIORITIES = new Set(["low", "medium", "high", "urgent"]);
const EMPLOYMENT_TYPES = new Set(["full_time", "part_time", "contract", "temporary", "internship"]);
const REMOTE_POLICIES = new Set(["onsite", "hybrid", "remote"]);
const PIPELINE_STAGES = new Set(["intake", "sourcing", "screening", "interviewing", "offer", "closed"]);
const INTERVIEW_STATUSES = new Set(["scheduled", "completed", "cancelled", "no_show"]);
const INTERVIEW_TYPES = new Set(["phone_screen", "technical", "panel", "client", "final"]);
const FEEDBACK_STATUSES = new Set(["pending", "submitted", "needs_followup"]);
const PLACEMENT_STATUSES = new Set(["open", "offer", "accepted", "placed", "withdrawn"]);
const CANDIDATE_STAGES = new Set(["sourced", "screening", "submitted", "interviewing", "offer", "placed", "rejected"]);
const SUBMISSION_STAGES = new Set(["submitted", "shortlisted", "interviewing", "offer", "rejected", "hired"]);
const OUTREACH_STATUSES = new Set(["draft", "scheduled", "sent", "paused", "completed"]);
const OUTREACH_CHANNELS = new Set(["email", "linkedin", "sms", "phone"]);
const ONBOARDING_STATUSES = new Set(["not_started", "background_check", "contract_sent", "started", "completed"]);
const REFERENCE_STATUSES = new Set(["requested", "in_progress", "completed", "failed"]);
const CONTACT_ROLES = new Set(["candidate", "client", "hiring_manager"]);

export async function listRcContacts(tenantId: string, role?: string) {
  const contacts = await prisma.rcContact.findMany({
    where: {
      tenantId,
      ...(role ? { role } : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return contacts.map(formatContact);
}

export async function createRcContact(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    role?: string;
    source?: string;
    currentCompany?: string;
    desiredRole?: string;
    salaryExpectationCents?: number;
    availabilityDate?: string;
    candidateStage?: string;
  },
) {
  if (!input.firstName.trim() || !input.lastName.trim()) {
    throw new Error("First and last name are required");
  }
  const role = input.role ?? "candidate";
  if (!CONTACT_ROLES.has(role)) throw new Error("Invalid contact role");
  const candidateStage = input.candidateStage ?? "sourced";
  if (!CANDIDATE_STAGES.has(candidateStage)) throw new Error("Invalid candidate stage");
  const availabilityDate = input.availabilityDate ? new Date(input.availabilityDate) : null;
  if (availabilityDate && Number.isNaN(availabilityDate.getTime())) throw new Error("Invalid availability date");

  const contact = await prisma.rcContact.create({
    data: {
      tenantId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      role,
      source: input.source?.trim() || null,
      currentCompany: input.currentCompany?.trim() || null,
      desiredRole: input.desiredRole?.trim() || null,
      salaryExpectationCents: input.salaryExpectationCents ?? null,
      availabilityDate,
      candidateStage,
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "rc_contact.created",
    entityType: "rc_contact",
    entityId: contact.id,
    metadata: { role, source: contact.source, candidateStage },
  });

  return formatContact(contact);
}

export async function listRcRoles(tenantId: string, status?: string) {
  const roles = await prisma.rcRole.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: {
      clientContact: true,
      assignedUser: { select: { id: true, email: true, displayName: true } },
      _count: { select: { interviews: true, placements: true, submissions: true, outreachCampaigns: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return roles.map(formatRole);
}

export async function createRcRole(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    title: string;
    clientCompany?: string;
    requisitionCode?: string;
    status?: string;
    priority?: string;
    employmentType?: string;
    location?: string;
    remotePolicy?: string;
    salaryMinCents?: number;
    salaryMaxCents?: number;
    targetStartDate?: string;
    pipelineStage?: string;
    assignedUserId?: string;
    clientContactId?: string;
  },
) {
  if (!input.title.trim()) throw new Error("Role title is required");
  const status = input.status ?? "open";
  if (!ROLE_STATUSES.has(status)) throw new Error("Invalid role status");
  const priority = input.priority ?? "medium";
  if (!ROLE_PRIORITIES.has(priority)) throw new Error("Invalid role priority");
  const employmentType = input.employmentType ?? "full_time";
  if (!EMPLOYMENT_TYPES.has(employmentType)) throw new Error("Invalid employment type");
  const remotePolicy = input.remotePolicy ?? "hybrid";
  if (!REMOTE_POLICIES.has(remotePolicy)) throw new Error("Invalid remote policy");
  const pipelineStage = input.pipelineStage ?? "intake";
  if (!PIPELINE_STAGES.has(pipelineStage)) throw new Error("Invalid pipeline stage");
  const targetStartDate = input.targetStartDate ? new Date(input.targetStartDate) : null;
  if (targetStartDate && Number.isNaN(targetStartDate.getTime())) throw new Error("Invalid target start date");

  if (input.clientContactId) {
    const client = await prisma.rcContact.findFirst({
      where: { id: input.clientContactId, tenantId },
    });
    if (!client) throw new Error("Client contact not found");
  }

  const role = await prisma.rcRole.create({
    data: {
      tenantId,
      title: input.title.trim(),
      clientCompany: input.clientCompany?.trim() || null,
      requisitionCode: input.requisitionCode?.trim() || null,
      status,
      priority,
      employmentType,
      location: input.location?.trim() || null,
      remotePolicy,
      salaryMinCents: input.salaryMinCents ?? null,
      salaryMaxCents: input.salaryMaxCents ?? null,
      targetStartDate,
      pipelineStage,
      assignedUserId: input.assignedUserId || userId,
      clientContactId: input.clientContactId || null,
    },
    include: {
      clientContact: true,
      assignedUser: { select: { id: true, email: true, displayName: true } },
      _count: { select: { interviews: true, placements: true, submissions: true, outreachCampaigns: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "rc_role.created",
    entityType: "rc_role",
    entityId: role.id,
    metadata: { requisitionCode: role.requisitionCode, status, priority, pipelineStage },
  });

  return formatRole(role);
}

export async function updateRcRoleStatus(
  tenantId: string,
  userId: string,
  userEmail: string,
  roleId: string,
  input: { status?: string; priority?: string; pipelineStage?: string; targetStartDate?: string },
) {
  if (input.status && !ROLE_STATUSES.has(input.status)) throw new Error("Invalid role status");
  if (input.priority && !ROLE_PRIORITIES.has(input.priority)) throw new Error("Invalid role priority");
  if (input.pipelineStage && !PIPELINE_STAGES.has(input.pipelineStage)) throw new Error("Invalid pipeline stage");
  const targetStartDate = input.targetStartDate ? new Date(input.targetStartDate) : undefined;
  if (targetStartDate && Number.isNaN(targetStartDate.getTime())) throw new Error("Invalid target start date");

  const existing = await prisma.rcRole.findFirst({ where: { id: roleId, tenantId } });
  if (!existing) throw new Error("Role not found");

  const role = await prisma.rcRole.update({
    where: { id: roleId },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
      ...(input.pipelineStage ? { pipelineStage: input.pipelineStage } : {}),
      ...(targetStartDate ? { targetStartDate } : {}),
    },
    include: {
      clientContact: true,
      assignedUser: { select: { id: true, email: true, displayName: true } },
      _count: { select: { interviews: true, placements: true, submissions: true, outreachCampaigns: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "rc_role.status_updated",
    entityType: "rc_role",
    entityId: roleId,
    metadata: input,
  });

  return formatRole(role);
}

export async function listRcInterviews(tenantId: string, status?: string) {
  const interviews = await prisma.rcInterview.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: {
      role: true,
      contact: true,
    },
    orderBy: { scheduledAt: "asc" },
  });

  return interviews.map(formatInterview);
}

export async function createRcInterview(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    roleId: string;
    contactId?: string;
    contact?: { firstName: string; lastName: string; email?: string; phone?: string };
    scheduledAt: string;
    interviewType?: string;
    roundNumber?: number;
    interviewerName?: string;
    feedbackStatus?: string;
    score?: number;
    outcomeReason?: string;
    notes?: string;
  },
) {
  const role = await prisma.rcRole.findFirst({
    where: { id: input.roleId, tenantId },
  });
  if (!role) throw new Error("Role not found");

  const scheduledAt = new Date(input.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error("Invalid scheduled date");
  if (scheduledAt.getTime() <= Date.now()) throw new Error("Interview must be scheduled in the future");
  const interviewType = input.interviewType ?? "phone_screen";
  if (!INTERVIEW_TYPES.has(interviewType)) throw new Error("Invalid interview type");
  const feedbackStatus = input.feedbackStatus ?? "pending";
  if (!FEEDBACK_STATUSES.has(feedbackStatus)) throw new Error("Invalid feedback status");
  if (input.score !== undefined && (!Number.isInteger(input.score) || input.score < 0 || input.score > 100)) {
    throw new Error("Interview score must be between 0 and 100");
  }

  let contactId = input.contactId;
  if (!contactId) {
    if (!input.contact?.firstName?.trim() || !input.contact?.lastName?.trim()) {
      throw new Error("Contact ID or contact name is required");
    }
    const created = await createRcContact(tenantId, userId, userEmail, {
      firstName: input.contact.firstName,
      lastName: input.contact.lastName,
      email: input.contact.email,
      phone: input.contact.phone,
      role: "candidate",
    });
    contactId = created.id;
  } else {
    const contact = await prisma.rcContact.findFirst({ where: { id: contactId, tenantId } });
    if (!contact) throw new Error("Contact not found");
  }

  const interview = await prisma.rcInterview.create({
    data: {
      tenantId,
      roleId: input.roleId,
      contactId,
      scheduledAt,
      interviewType,
      roundNumber: input.roundNumber ?? 1,
      interviewerName: input.interviewerName?.trim() || null,
      feedbackStatus,
      score: input.score ?? null,
      outcomeReason: input.outcomeReason?.trim() || null,
      notes: input.notes?.trim() || null,
      status: "scheduled",
    },
    include: { role: true, contact: true },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "rc_interview.created",
    entityType: "rc_interview",
    entityId: interview.id,
    metadata: { roleId: input.roleId, scheduledAt: scheduledAt.toISOString(), interviewType, feedbackStatus },
  });

  return formatInterview(interview);
}

export async function updateRcInterviewStatus(
  tenantId: string,
  userId: string,
  userEmail: string,
  interviewId: string,
  input: { status?: string; feedbackStatus?: string; score?: number; outcomeReason?: string },
) {
  if (input.status && !INTERVIEW_STATUSES.has(input.status)) throw new Error("Invalid interview status");
  if (input.feedbackStatus && !FEEDBACK_STATUSES.has(input.feedbackStatus)) throw new Error("Invalid feedback status");
  if (input.score !== undefined && (!Number.isInteger(input.score) || input.score < 0 || input.score > 100)) {
    throw new Error("Interview score must be between 0 and 100");
  }

  const existing = await prisma.rcInterview.findFirst({ where: { id: interviewId, tenantId } });
  if (!existing) throw new Error("Interview not found");

  const interview = await prisma.rcInterview.update({
    where: { id: interviewId },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.feedbackStatus ? { feedbackStatus: input.feedbackStatus } : {}),
      ...(input.score !== undefined ? { score: input.score } : {}),
      ...(input.outcomeReason ? { outcomeReason: input.outcomeReason.trim() } : {}),
    },
    include: { role: true, contact: true },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "rc_interview.status_updated",
    entityType: "rc_interview",
    entityId: interviewId,
    metadata: input,
  });

  return formatInterview(interview);
}

export async function listRcCandidateSubmissions(tenantId: string, stage?: string) {
  const submissions = await prisma.rcCandidateSubmission.findMany({
    where: {
      tenantId,
      ...(stage ? { stage } : {}),
    },
    include: { role: true, contact: true },
    orderBy: { updatedAt: "desc" },
  });

  return submissions.map(formatSubmission);
}

export async function createRcCandidateSubmission(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: { roleId: string; contactId: string; stage?: string; source?: string; score?: number; notes?: string },
) {
  const role = await prisma.rcRole.findFirst({ where: { id: input.roleId, tenantId } });
  if (!role) throw new Error("Role not found");
  const contact = await prisma.rcContact.findFirst({ where: { id: input.contactId, tenantId } });
  if (!contact) throw new Error("Candidate contact not found");
  const stage = input.stage ?? "submitted";
  if (!SUBMISSION_STAGES.has(stage)) throw new Error("Invalid submission stage");
  if (input.score !== undefined && (!Number.isInteger(input.score) || input.score < 0 || input.score > 100)) {
    throw new Error("Submission score must be between 0 and 100");
  }

  const submission = await prisma.rcCandidateSubmission.create({
    data: {
      tenantId,
      roleId: input.roleId,
      contactId: input.contactId,
      stage,
      source: input.source?.trim() || null,
      score: input.score ?? null,
      notes: input.notes?.trim() || null,
    },
    include: { role: true, contact: true },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "rc_candidate_submission.created",
    entityType: "rc_candidate_submission",
    entityId: submission.id,
    metadata: { roleId: input.roleId, contactId: input.contactId, stage },
  });

  return formatSubmission(submission);
}

export async function updateRcCandidateSubmissionStage(
  tenantId: string,
  userId: string,
  userEmail: string,
  submissionId: string,
  stage: string,
) {
  if (!SUBMISSION_STAGES.has(stage)) throw new Error("Invalid submission stage");
  const existing = await prisma.rcCandidateSubmission.findFirst({ where: { id: submissionId, tenantId } });
  if (!existing) throw new Error("Candidate submission not found");

  const submission = await prisma.rcCandidateSubmission.update({
    where: { id: submissionId },
    data: { stage },
    include: { role: true, contact: true },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "rc_candidate_submission.stage_updated",
    entityType: "rc_candidate_submission",
    entityId: submissionId,
    metadata: { stage },
  });

  return formatSubmission(submission);
}

export async function listRcOutreachCampaigns(tenantId: string, status?: string) {
  const campaigns = await prisma.rcOutreachCampaign.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: {
      role: true,
      user: { select: { id: true, email: true, displayName: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return campaigns.map(formatCampaign);
}

export async function createRcOutreachCampaign(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: { name: string; roleId?: string; channel?: string; status?: string; audience?: string },
) {
  if (!input.name.trim()) throw new Error("Campaign name is required");
  if (input.roleId) {
    const role = await prisma.rcRole.findFirst({ where: { id: input.roleId, tenantId } });
    if (!role) throw new Error("Role not found");
  }
  const channel = input.channel ?? "email";
  if (!OUTREACH_CHANNELS.has(channel)) throw new Error("Invalid outreach channel");
  const status = input.status ?? "draft";
  if (!OUTREACH_STATUSES.has(status)) throw new Error("Invalid campaign status");

  const campaign = await prisma.rcOutreachCampaign.create({
    data: {
      tenantId,
      roleId: input.roleId || null,
      userId,
      name: input.name.trim(),
      channel,
      status,
      audience: input.audience?.trim() || "sourced_candidates",
      launchedAt: status === "sent" ? new Date() : null,
    },
    include: {
      role: true,
      user: { select: { id: true, email: true, displayName: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "rc_outreach_campaign.created",
    entityType: "rc_outreach_campaign",
    entityId: campaign.id,
    metadata: { roleId: input.roleId, status, channel },
  });

  return formatCampaign(campaign);
}

export async function updateRcOutreachCampaignStatus(
  tenantId: string,
  userId: string,
  userEmail: string,
  campaignId: string,
  status: string,
) {
  if (!OUTREACH_STATUSES.has(status)) throw new Error("Invalid campaign status");
  const existing = await prisma.rcOutreachCampaign.findFirst({ where: { id: campaignId, tenantId } });
  if (!existing) throw new Error("Outreach campaign not found");

  const campaign = await prisma.rcOutreachCampaign.update({
    where: { id: campaignId },
    data: { status, launchedAt: status === "sent" ? new Date() : existing.launchedAt },
    include: {
      role: true,
      user: { select: { id: true, email: true, displayName: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "rc_outreach_campaign.status_updated",
    entityType: "rc_outreach_campaign",
    entityId: campaignId,
    metadata: { status },
  });

  return formatCampaign(campaign);
}

export async function listRcPlacements(tenantId: string, status?: string) {
  const placements = await prisma.rcPlacement.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: {
      role: true,
      candidateContact: true,
      _count: { select: { notes: true, referenceChecks: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return placements.map(formatPlacement);
}

export async function createRcPlacement(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    roleId: string;
    title: string;
    status?: string;
    compensationCents?: number;
    candidateContactId?: string;
    startDate?: string;
    recruiterFeeCents?: number;
    guaranteeEndDate?: string;
    onboardingStatus?: string;
  },
) {
  const role = await prisma.rcRole.findFirst({
    where: { id: input.roleId, tenantId },
  });
  if (!role) throw new Error("Role not found");
  if (!input.title.trim()) throw new Error("Placement title is required");

  const status = input.status ?? "open";
  if (!PLACEMENT_STATUSES.has(status)) throw new Error("Invalid placement status");
  const onboardingStatus = input.onboardingStatus ?? "not_started";
  if (!ONBOARDING_STATUSES.has(onboardingStatus)) throw new Error("Invalid onboarding status");
  const startDate = input.startDate ? new Date(input.startDate) : null;
  if (startDate && Number.isNaN(startDate.getTime())) throw new Error("Invalid start date");
  const guaranteeEndDate = input.guaranteeEndDate ? new Date(input.guaranteeEndDate) : null;
  if (guaranteeEndDate && Number.isNaN(guaranteeEndDate.getTime())) throw new Error("Invalid guarantee end date");

  if (input.candidateContactId) {
    const candidate = await prisma.rcContact.findFirst({
      where: { id: input.candidateContactId, tenantId },
    });
    if (!candidate) throw new Error("Candidate contact not found");
  }

  const placement = await prisma.rcPlacement.create({
    data: {
      tenantId,
      roleId: input.roleId,
      title: input.title.trim(),
      status,
      compensationCents: input.compensationCents ?? null,
      candidateContactId: input.candidateContactId || null,
      startDate,
      recruiterFeeCents: input.recruiterFeeCents ?? null,
      guaranteeEndDate,
      onboardingStatus,
      offerAcceptedAt: status === "accepted" || status === "placed" ? new Date() : null,
    },
    include: {
      role: true,
      candidateContact: true,
      _count: { select: { notes: true, referenceChecks: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "rc_placement.created",
    entityType: "rc_placement",
    entityId: placement.id,
    metadata: { roleId: input.roleId, status, onboardingStatus },
  });

  return formatPlacement(placement);
}

export async function updateRcPlacementStatus(
  tenantId: string,
  userId: string,
  userEmail: string,
  placementId: string,
  input: { status?: string; onboardingStatus?: string; startDate?: string },
) {
  if (input.status && !PLACEMENT_STATUSES.has(input.status)) throw new Error("Invalid placement status");
  if (input.onboardingStatus && !ONBOARDING_STATUSES.has(input.onboardingStatus)) throw new Error("Invalid onboarding status");
  const startDate = input.startDate ? new Date(input.startDate) : undefined;
  if (startDate && Number.isNaN(startDate.getTime())) throw new Error("Invalid start date");

  const existing = await prisma.rcPlacement.findFirst({ where: { id: placementId, tenantId } });
  if (!existing) throw new Error("Placement not found");

  const placement = await prisma.rcPlacement.update({
    where: { id: placementId },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.onboardingStatus ? { onboardingStatus: input.onboardingStatus } : {}),
      ...(startDate ? { startDate } : {}),
      ...(input.status === "accepted" || input.status === "placed" ? { offerAcceptedAt: new Date() } : {}),
    },
    include: {
      role: true,
      candidateContact: true,
      _count: { select: { notes: true, referenceChecks: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "rc_placement.status_updated",
    entityType: "rc_placement",
    entityId: placementId,
    metadata: input,
  });

  return formatPlacement(placement);
}

export async function listRcPlacementNotes(tenantId: string, placementId: string) {
  const placement = await prisma.rcPlacement.findFirst({ where: { id: placementId, tenantId } });
  if (!placement) throw new Error("Placement not found");

  const notes = await prisma.rcPlacementNote.findMany({
    where: { placementId },
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

export async function createRcPlacementNote(
  tenantId: string,
  userId: string,
  userEmail: string,
  placementId: string,
  body: string,
) {
  const placement = await prisma.rcPlacement.findFirst({ where: { id: placementId, tenantId } });
  if (!placement) throw new Error("Placement not found");
  if (!body.trim()) throw new Error("Note body is required");

  const note = await prisma.rcPlacementNote.create({
    data: { placementId, userId, body: body.trim() },
    include: { user: { select: { id: true, email: true, displayName: true } } },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "rc_placement.note_added",
    entityType: "rc_placement_note",
    entityId: note.id,
    metadata: { placementId },
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

export async function listRcReferenceChecks(tenantId: string, status?: string) {
  const checks = await prisma.rcReferenceCheck.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: {
      contact: true,
      placement: true,
      user: { select: { id: true, email: true, displayName: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return checks.map(formatReferenceCheck);
}

export async function createRcReferenceCheck(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: {
    contactId: string;
    placementId?: string;
    refereeName: string;
    refereeEmail?: string;
    relationship?: string;
    status?: string;
    notes?: string;
  },
) {
  const contact = await prisma.rcContact.findFirst({ where: { id: input.contactId, tenantId } });
  if (!contact) throw new Error("Candidate contact not found");
  if (input.placementId) {
    const placement = await prisma.rcPlacement.findFirst({ where: { id: input.placementId, tenantId } });
    if (!placement) throw new Error("Placement not found");
  }
  if (!input.refereeName.trim()) throw new Error("Referee name is required");
  const status = input.status ?? "requested";
  if (!REFERENCE_STATUSES.has(status)) throw new Error("Invalid reference status");

  const check = await prisma.rcReferenceCheck.create({
    data: {
      tenantId,
      contactId: input.contactId,
      placementId: input.placementId || null,
      userId,
      refereeName: input.refereeName.trim(),
      refereeEmail: input.refereeEmail?.trim() || null,
      relationship: input.relationship?.trim() || null,
      status,
      completedAt: status === "completed" ? new Date() : null,
      notes: input.notes?.trim() || null,
    },
    include: {
      contact: true,
      placement: true,
      user: { select: { id: true, email: true, displayName: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "rc_reference_check.created",
    entityType: "rc_reference_check",
    entityId: check.id,
    metadata: { contactId: input.contactId, placementId: input.placementId, status },
  });

  return formatReferenceCheck(check);
}

export async function updateRcReferenceCheckStatus(
  tenantId: string,
  userId: string,
  userEmail: string,
  checkId: string,
  status: string,
) {
  if (!REFERENCE_STATUSES.has(status)) throw new Error("Invalid reference status");
  const existing = await prisma.rcReferenceCheck.findFirst({ where: { id: checkId, tenantId } });
  if (!existing) throw new Error("Reference check not found");

  const check = await prisma.rcReferenceCheck.update({
    where: { id: checkId },
    data: { status, completedAt: status === "completed" ? new Date() : null },
    include: {
      contact: true,
      placement: true,
      user: { select: { id: true, email: true, displayName: true } },
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "rc_reference_check.status_updated",
    entityType: "rc_reference_check",
    entityId: checkId,
    metadata: { status },
  });

  return formatReferenceCheck(check);
}

function formatContact(contact: {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: string;
  source: string | null;
  currentCompany: string | null;
  desiredRole: string | null;
  salaryExpectationCents: number | null;
  availabilityDate: Date | null;
  candidateStage: string;
  lastContactedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    role: contact.role,
    source: contact.source,
    currentCompany: contact.currentCompany,
    desiredRole: contact.desiredRole,
    salaryExpectationCents: contact.salaryExpectationCents,
    availabilityDate: contact.availabilityDate?.toISOString() ?? null,
    candidateStage: contact.candidateStage,
    lastContactedAt: contact.lastContactedAt?.toISOString() ?? null,
    createdAt: contact.createdAt.toISOString(),
  };
}

function formatRole(role: {
  id: string;
  title: string;
  clientCompany: string | null;
  requisitionCode: string | null;
  status: string;
  priority: string;
  employmentType: string;
  location: string | null;
  remotePolicy: string;
  salaryMinCents: number | null;
  salaryMaxCents: number | null;
  targetStartDate: Date | null;
  pipelineStage: string;
  createdAt: Date;
  updatedAt: Date;
  clientContact?: { firstName: string; lastName: string } | null;
  assignedUser?: { id: string; email: string; displayName: string | null } | null;
  _count?: { interviews: number; placements: number; submissions?: number; outreachCampaigns?: number };
}) {
  return {
    id: role.id,
    title: role.title,
    clientCompany: role.clientCompany,
    requisitionCode: role.requisitionCode,
    status: role.status,
    priority: role.priority,
    employmentType: role.employmentType,
    location: role.location,
    remotePolicy: role.remotePolicy,
    salaryMinCents: role.salaryMinCents,
    salaryMaxCents: role.salaryMaxCents,
    targetStartDate: role.targetStartDate?.toISOString() ?? null,
    pipelineStage: role.pipelineStage,
    clientName: role.clientContact
      ? `${role.clientContact.firstName} ${role.clientContact.lastName}`
      : null,
    assignedUser: role.assignedUser
      ? {
          id: role.assignedUser.id,
          email: role.assignedUser.email,
          displayName: role.assignedUser.displayName,
        }
      : null,
    interviewCount: role._count?.interviews ?? 0,
    placementCount: role._count?.placements ?? 0,
    submissionCount: role._count?.submissions ?? 0,
    campaignCount: role._count?.outreachCampaigns ?? 0,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
}

function formatInterview(interview: {
  id: string;
  scheduledAt: Date;
  status: string;
  interviewType: string;
  roundNumber: number;
  interviewerName: string | null;
  feedbackStatus: string;
  score: number | null;
  outcomeReason: string | null;
  notes: string | null;
  role: { id: string; title: string; clientCompany: string | null };
  contact: { firstName: string; lastName: string; email: string | null };
}) {
  return {
    id: interview.id,
    scheduledAt: interview.scheduledAt.toISOString(),
    status: interview.status,
    interviewType: interview.interviewType,
    roundNumber: interview.roundNumber,
    interviewerName: interview.interviewerName,
    feedbackStatus: interview.feedbackStatus,
    score: interview.score,
    outcomeReason: interview.outcomeReason,
    notes: interview.notes,
    role: {
      id: interview.role.id,
      title: interview.role.title,
      clientCompany: interview.role.clientCompany,
    },
    contactName: `${interview.contact.firstName} ${interview.contact.lastName}`,
    contactEmail: interview.contact.email,
  };
}

function formatSubmission(submission: {
  id: string;
  stage: string;
  source: string | null;
  score: number | null;
  submittedAt: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  role: { id: string; title: string; clientCompany: string | null };
  contact: { firstName: string; lastName: string; email: string | null };
}) {
  return {
    id: submission.id,
    stage: submission.stage,
    source: submission.source,
    score: submission.score,
    submittedAt: submission.submittedAt.toISOString(),
    notes: submission.notes,
    role: {
      id: submission.role.id,
      title: submission.role.title,
      clientCompany: submission.role.clientCompany,
    },
    candidateName: `${submission.contact.firstName} ${submission.contact.lastName}`,
    candidateEmail: submission.contact.email,
    createdAt: submission.createdAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
  };
}

function formatCampaign(campaign: {
  id: string;
  name: string;
  channel: string;
  status: string;
  audience: string;
  sentCount: number;
  replyCount: number;
  launchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  role?: { id: string; title: string; clientCompany: string | null } | null;
  user: { id: string; email: string; displayName: string | null };
}) {
  return {
    id: campaign.id,
    name: campaign.name,
    channel: campaign.channel,
    status: campaign.status,
    audience: campaign.audience,
    sentCount: campaign.sentCount,
    replyCount: campaign.replyCount,
    launchedAt: campaign.launchedAt?.toISOString() ?? null,
    role: campaign.role
      ? {
          id: campaign.role.id,
          title: campaign.role.title,
          clientCompany: campaign.role.clientCompany,
        }
      : null,
    owner: {
      id: campaign.user.id,
      email: campaign.user.email,
      displayName: campaign.user.displayName,
    },
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

function formatPlacement(placement: {
  id: string;
  title: string;
  status: string;
  compensationCents: number | null;
  startDate: Date | null;
  offerAcceptedAt: Date | null;
  recruiterFeeCents: number | null;
  guaranteeEndDate: Date | null;
  onboardingStatus: string;
  createdAt: Date;
  updatedAt: Date;
  role: { id: string; title: string; clientCompany: string | null };
  candidateContact?: { firstName: string; lastName: string } | null;
  _count?: { notes: number; referenceChecks?: number };
}) {
  return {
    id: placement.id,
    title: placement.title,
    status: placement.status,
    compensationCents: placement.compensationCents,
    startDate: placement.startDate?.toISOString() ?? null,
    offerAcceptedAt: placement.offerAcceptedAt?.toISOString() ?? null,
    recruiterFeeCents: placement.recruiterFeeCents,
    guaranteeEndDate: placement.guaranteeEndDate?.toISOString() ?? null,
    onboardingStatus: placement.onboardingStatus,
    role: {
      id: placement.role.id,
      title: placement.role.title,
      clientCompany: placement.role.clientCompany,
    },
    candidateName: placement.candidateContact
      ? `${placement.candidateContact.firstName} ${placement.candidateContact.lastName}`
      : null,
    noteCount: placement._count?.notes ?? 0,
    referenceCheckCount: placement._count?.referenceChecks ?? 0,
    createdAt: placement.createdAt.toISOString(),
    updatedAt: placement.updatedAt.toISOString(),
  };
}

function formatReferenceCheck(check: {
  id: string;
  refereeName: string;
  refereeEmail: string | null;
  relationship: string | null;
  status: string;
  completedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  contact: { firstName: string; lastName: string; email: string | null };
  placement?: { id: string; title: string } | null;
  user: { id: string; email: string; displayName: string | null };
}) {
  return {
    id: check.id,
    refereeName: check.refereeName,
    refereeEmail: check.refereeEmail,
    relationship: check.relationship,
    status: check.status,
    completedAt: check.completedAt?.toISOString() ?? null,
    notes: check.notes,
    candidateName: `${check.contact.firstName} ${check.contact.lastName}`,
    candidateEmail: check.contact.email,
    placement: check.placement ? { id: check.placement.id, title: check.placement.title } : null,
    owner: {
      id: check.user.id,
      email: check.user.email,
      displayName: check.user.displayName,
    },
    createdAt: check.createdAt.toISOString(),
    updatedAt: check.updatedAt.toISOString(),
  };
}
