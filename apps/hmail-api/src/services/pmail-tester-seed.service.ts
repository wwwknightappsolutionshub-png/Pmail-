import { ACCOUNTING_PHASE_1_SLUGS } from "../data/addon-catalog.js";
import { JOB_HUNTER_TIER_B_VERSION } from "../lib/job-hunter.js";
import { prisma } from "../lib/prisma.js";
import { recordCareerUnlockedIfNeeded } from "./job-hunter-entitlement.service.js";

const PMAIL_TESTER_ACCOUNTING_TRIAL_DAYS = 30;

export async function grantPmailTesterAccountingAddonTrials(tenantId: string): Promise<void> {
  const addons = await prisma.addon.findMany({
    where: { slug: { in: [...ACCOUNTING_PHASE_1_SLUGS] }, isActive: true },
    select: { id: true, slug: true },
  });

  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + PMAIL_TESTER_ACCOUNTING_TRIAL_DAYS);

  for (const addon of addons) {
    await prisma.tenantAddonTrial.upsert({
      where: { tenantId_addonId: { tenantId, addonId: addon.id } },
      create: {
        tenantId,
        addonId: addon.id,
        endsAt,
        status: "active",
        trialSource: "pmail_tester_seed",
      },
      update: {
        endsAt,
        status: "active",
        trialSource: "pmail_tester_seed",
      },
    });
  }
}

/** Seed accounting desk sample data for PMail+ tester QA. */
export async function seedPmailTesterAccountingWorkspace(tenantId: string, userId: string) {
  await clearPmailTesterVerticalData(tenantId);

  const client = await prisma.acContact.create({
    data: {
      tenantId,
      firstName: "Jordan",
      lastName: "Lee",
      email: "jordan.lee@blueledger.example",
      phone: "+14165550142",
      role: "client",
    },
  });

  const partnerContact = await prisma.acContact.create({
    data: {
      tenantId,
      firstName: "Sam",
      lastName: "Nguyen",
      email: "sam.nguyen@mapletax.example",
      phone: "+14165550208",
      role: "client",
    },
  });

  const parentEntity = await prisma.acClientEntity.create({
    data: {
      tenantId,
      name: "Maple Tax Partners LLP",
      entityType: "partnership",
      taxIdentifierType: "business_number",
      taxIdentifier: "111222333RC0001",
      jurisdiction: "ON",
      fiscalYearEnd: "Dec 31",
      engagementType: "year_end",
      primaryContactId: partnerContact.id,
      status: "active",
    },
  });

  const clientEntity = await prisma.acClientEntity.create({
    data: {
      tenantId,
      name: "Blue Ledger Inc.",
      entityType: "corporation",
      taxIdentifierType: "business_number",
      taxIdentifier: "765432109RC0001",
      jurisdiction: "ON",
      fiscalYearEnd: "Dec 31",
      engagementType: "year_end",
      primaryContactId: client.id,
      parentEntityId: parentEntity.id,
      status: "active",
    },
  });

  await prisma.acEntityNote.create({
    data: {
      entityId: clientEntity.id,
      userId,
      body: "2024 corporate engagement letter signed — T2 and HST filings in scope.",
    },
  });

  const documentDueAt = new Date();
  documentDueAt.setDate(documentDueAt.getDate() + 10);

  const documentRequest = await prisma.acDocumentRequest.create({
    data: {
      tenantId,
      title: "2024 T1 return source documents",
      referenceCode: "DOC-2024-001",
      category: "tax_slip",
      fiscalYear: "2024",
      status: "requested",
      vaultStatus: "requested",
      dueAt: documentDueAt,
      assignedUserId: userId,
      clientContactId: client.id,
    },
  });

  const signatureRequest = await prisma.acDocumentRequest.create({
    data: {
      tenantId,
      title: "Signed T2 authorization",
      referenceCode: "DOC-2024-AUTH",
      category: "signature",
      fiscalYear: "2024",
      status: "review_needed",
      vaultStatus: "in_review",
      assignedUserId: userId,
      clientContactId: client.id,
    },
  });

  const filingDueAt = new Date();
  filingDueAt.setDate(filingDueAt.getDate() + 30);
  const filingReminderAt = new Date();
  filingReminderAt.setDate(filingReminderAt.getDate() + 15);

  await prisma.acFilingDeadline.create({
    data: {
      tenantId,
      clientEntityId: clientEntity.id,
      contactId: client.id,
      dueAt: filingDueAt,
      status: "open",
      filingType: "corporate_tax",
      taxPeriod: "FY2024",
      reminderAt: filingReminderAt,
      notes: "Corporate T2 filing — gather signed financials and source slips.",
    },
  });

  await prisma.acDocumentExchangeRecord.create({
    data: {
      tenantId,
      documentRequestId: signatureRequest.id,
      clientEntityId: clientEntity.id,
      contactId: client.id,
      userId,
      documentName: "t2-authorization.pdf",
      category: "signature",
      action: "uploaded",
      status: "accepted",
      notes: "Client uploaded signed authorization via secure exchange.",
    },
  });

  await prisma.acDocumentExchangeRecord.create({
    data: {
      tenantId,
      documentRequestId: documentRequest.id,
      clientEntityId: clientEntity.id,
      contactId: client.id,
      userId,
      documentName: "t4-summary.pdf",
      category: "tax_slip",
      action: "received",
      status: "received",
      notes: "T4 package received for 2024 personal return prep.",
    },
  });

  await prisma.mailContact.upsert({
    where: { userId_email: { userId, email: client.email! } },
    create: {
      userId,
      email: client.email!,
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone,
      company: "Blue Ledger Inc.",
      notes: "Seeded PMail+ accounting client contact for workspace testing.",
    },
    update: {
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone,
      company: "Blue Ledger Inc.",
      notes: "Seeded PMail+ accounting client contact for workspace testing.",
    },
  });

  return { client, partnerContact, parentEntity, clientEntity, documentRequest, signatureRequest };
}

/** Point PMail+ tester at the accounting vertical with trials and sample desk data. */
export async function ensurePmailTesterAccountingWorkspace(tenantId: string, userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { businessVertical: "accounting" },
  });

  await prisma.tenantBranding.updateMany({
    where: { tenantId },
    data: {
      industryProfile: "accounting",
      loginTagline: "Local PMail+ tester — accounting workspace",
    },
  });

  await grantPmailTesterAccountingAddonTrials(tenantId);
  await seedPmailTesterAccountingWorkspace(tenantId, userId);
}

/** PMail+ tester should land in an unlocked career workspace without manual setup. */
export async function ensurePmailTesterCareerReady(tenantId: string, userId: string) {
  const now = new Date();
  const existing = await prisma.userJobHunterSettings.findUnique({ where: { userId } });

  if (
    existing?.manualJobHuntingOverride &&
    existing.tierBDisclosureAcceptedAt &&
    existing.careerUnlockedAt
  ) {
    return;
  }

  await prisma.userJobHunterSettings.upsert({
    where: { userId },
    create: {
      tenantId,
      userId,
      regionCode: "US",
      enabled: true,
      manualJobHuntingOverride: true,
      careerScore: 50,
      tierBDisclosureAcceptedAt: now,
      tierBDisclosureVersion: JOB_HUNTER_TIER_B_VERSION,
      careerUnlockedAt: now,
    },
    update: {
      enabled: true,
      manualJobHuntingOverride: true,
      tierBDisclosureAcceptedAt: existing?.tierBDisclosureAcceptedAt ?? now,
      tierBDisclosureVersion: JOB_HUNTER_TIER_B_VERSION,
      careerUnlockedAt: existing?.careerUnlockedAt ?? now,
    },
  });

  await recordCareerUnlockedIfNeeded(tenantId, userId);
}

/** Keep PMail+ tester career hidden until real inbox/sent job-search signals unlock it. */
export async function resetPmailTesterCareerState(userId: string): Promise<void> {
  await prisma.jobApplication.deleteMany({ where: { userId, source: "mail_inferred" } });
  await prisma.userJobHunterSettings.upsert({
    where: { userId },
    create: {
      userId,
      tenantId: (await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { tenantId: true } }))
        .tenantId,
      enabled: true,
      manualJobHuntingOverride: false,
      careerScore: 0,
      careerUnlockedAt: null,
      tierBDisclosureAcceptedAt: null,
      tierBDisclosureVersion: null,
    },
    update: {
      manualJobHuntingOverride: false,
      careerScore: 0,
      careerUnlockedAt: null,
    },
  });
}

export async function clearPmailTesterVerticalData(tenantId: string) {
  await prisma.b2bSlaNote.deleteMany({ where: { case: { tenantId } } });
  await prisma.b2bSlaEvent.deleteMany({ where: { tenantId } });
  await prisma.b2bSlaCase.deleteMany({ where: { tenantId } });
  await prisma.b2bProposal.deleteMany({ where: { tenantId } });
  await prisma.b2bDeliverable.deleteMany({ where: { tenantId } });
  await prisma.b2bMilestone.deleteMany({ where: { tenantId } });
  await prisma.b2bWorkspace.deleteMany({ where: { tenantId } });
  await prisma.b2bContact.deleteMany({ where: { tenantId } });

  await prisma.acDocumentExchangeRecord.deleteMany({ where: { tenantId } });
  await prisma.acFilingDeadline.deleteMany({ where: { tenantId } });
  await prisma.acDocumentRequest.deleteMany({ where: { tenantId } });
  await prisma.acClientEntity.deleteMany({ where: { tenantId } });
  await prisma.acContact.deleteMany({ where: { tenantId } });

  await prisma.hcAccessLog.deleteMany({ where: { tenantId } });
  await prisma.hcReferral.deleteMany({ where: { tenantId } });
  await prisma.hcAppointment.deleteMany({ where: { tenantId } });
  await prisma.hcAuditCase.deleteMany({ where: { tenantId } });
  await prisma.hcPatientChart.deleteMany({ where: { tenantId } });
  await prisma.hcContact.deleteMany({ where: { tenantId } });
}

export async function seedPmailTesterHealthcareWorkspace(tenantId: string, userId: string) {
  await clearPmailTesterVerticalData(tenantId);

  const patient = await prisma.hcContact.create({
    data: {
      tenantId,
      firstName: "Morgan",
      lastName: "Patterson",
      email: "m.patterson@patientmail.com",
      phone: "+16175550128",
      role: "patient",
      medicalRecordNumber: "MRN-88421",
      preferredProvider: "Dr. S. Okoro",
    },
  });

  const provider = await prisma.hcContact.create({
    data: {
      tenantId,
      firstName: "Samuel",
      lastName: "Okoro",
      email: "s.okoro@riverside.med",
      phone: "+16175550164",
      role: "provider",
      preferredProvider: "Riverside Medical",
    },
  });

  const payer = await prisma.hcContact.create({
    data: {
      tenantId,
      firstName: "CareFirst",
      lastName: "Prior Auth",
      email: "priorauth@carefirst.ins",
      phone: "+18005550199",
      role: "referral",
    },
  });

  const chart = await prisma.hcPatientChart.create({
    data: {
      tenantId,
      chartNumber: "SCP-10241",
      status: "active",
      careStage: "active_care",
      referralStatus: "scheduled",
      authorizationStatus: "pending",
      callbackRequired: true,
      lastContactAt: new Date(),
      assignedUserId: userId,
      patientContactId: patient.id,
    },
  });

  const followUpAt = new Date();
  followUpAt.setDate(followUpAt.getDate() + 3);
  followUpAt.setHours(15, 0, 0, 0);

  await prisma.hcAppointment.create({
    data: {
      tenantId,
      chartId: chart.id,
      contactId: patient.id,
      scheduledAt: followUpAt,
      status: "scheduled",
      appointmentType: "follow_up",
      callbackStatus: "queued",
      notes: "Cardiology follow-up — review post-discharge medication and dizziness symptoms.",
    },
  });

  const referralDueAt = new Date();
  referralDueAt.setDate(referralDueAt.getDate() + 7);

  await prisma.hcReferral.create({
    data: {
      tenantId,
      chartId: chart.id,
      patientContactId: patient.id,
      providerContactId: provider.id,
      direction: "inbound",
      referralType: "specialist",
      specialty: "Cardiac rehabilitation",
      status: "triaged",
      priority: "urgent",
      dueAt: referralDueAt,
      notes: "Outpatient cardiac rehab consult following recent hospitalization.",
    },
  });

  await prisma.hcAuditCase.create({
    data: {
      tenantId,
      chartId: chart.id,
      title: "Chart access review — prior auth packet",
      status: "open",
      severity: "medium",
      accessReason: "Payer documentation request for MRI PA-88421",
      roleScope: "care_coordinator",
    },
  });

  await prisma.hcAccessLog.create({
    data: {
      tenantId,
      chartId: chart.id,
      userId,
      action: "viewed",
      reason: "Care coordinator reviewed chart before payer follow-up",
      roleScope: "care_coordinator",
    },
  });

  await prisma.mailContact.upsert({
    where: { userId_email: { userId, email: patient.email! } },
    create: {
      userId,
      email: patient.email!,
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone,
      company: "Summit Care Partners — patient",
      notes: "Seeded PMail+ healthcare contact with WhatsApp-capable phone number.",
    },
    update: {
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone,
      company: "Summit Care Partners — patient",
      notes: "Seeded PMail+ healthcare contact with WhatsApp-capable phone number.",
    },
  });

  return { patient, provider, payer, chart };
}

export async function seedPmailTesterB2bWorkspace(tenantId: string, userId: string) {
  await clearPmailTesterVerticalData(tenantId);

  const client = await prisma.b2bContact.create({
    data: {
      tenantId,
      firstName: "Chris",
      lastName: "Morgan",
      email: "chris@acmecorp.com",
      phone: "+14165550188",
      role: "client",
      company: "Acme Corp",
      title: "VP Operations",
      decisionRole: "economic_buyer",
    },
  });

  const stakeholder = await prisma.b2bContact.create({
    data: {
      tenantId,
      firstName: "Taylor",
      lastName: "Reed",
      email: "taylor@beta.io",
      phone: "+14165550214",
      role: "stakeholder",
      company: "Beta Launch Co",
      title: "Program Director",
      decisionRole: "technical_evaluator",
    },
  });

  const renewalDate = new Date();
  renewalDate.setDate(renewalDate.getDate() + 90);

  const workspace = await prisma.b2bWorkspace.create({
    data: {
      tenantId,
      name: "Acme Corp — Q2 Retainer",
      clientDomain: "acmecorp.com",
      status: "active",
      accountTier: "enterprise",
      arrCents: 24000000,
      healthScore: 88,
      routingDomain: "support.acmecorp.com",
      onboardingStage: "implementation",
      renewalDate,
      clientContactId: client.id,
      assignedUserId: userId,
    },
  });

  const betaWorkspace = await prisma.b2bWorkspace.create({
    data: {
      tenantId,
      name: "Beta Launch Workspace",
      clientDomain: "beta.io",
      status: "active",
      accountTier: "premium",
      healthScore: 76,
      onboardingStage: "discovery",
      clientContactId: stakeholder.id,
      assignedUserId: userId,
    },
  });

  const kickoffAt = new Date();
  kickoffAt.setDate(kickoffAt.getDate() + 2);
  kickoffAt.setHours(14, 0, 0, 0);

  await prisma.b2bMilestone.create({
    data: {
      tenantId,
      workspaceId: betaWorkspace.id,
      contactId: stakeholder.id,
      title: "Kickoff call",
      status: "scheduled",
      milestoneType: "kickoff",
      phase: "discovery",
      ownerRole: "client_success",
      scheduledAt: kickoffAt,
      deliverableUrl: "https://beta.io/kickoff",
    },
  });

  const deliverableDue = new Date();
  deliverableDue.setDate(deliverableDue.getDate() + 5);

  await prisma.b2bDeliverable.create({
    data: {
      tenantId,
      workspaceId: betaWorkspace.id,
      title: "Implementation plan",
      kind: "implementation",
      status: "in_progress",
      dueAt: deliverableDue,
      url: "https://beta.io/plan",
    },
  });

  const proposalValidUntil = new Date();
  proposalValidUntil.setDate(proposalValidUntil.getDate() + 30);

  await prisma.b2bProposal.create({
    data: {
      tenantId,
      workspaceId: workspace.id,
      title: "Acme Corp SOW — Platform rollout",
      status: "sent",
      version: 2,
      amountCents: 8500000,
      validUntil: proposalValidUntil,
      sowUrl: "https://acmecorp.com/sow-v2",
      createdByUserId: userId,
    },
  });

  const responseDue = new Date();
  responseDue.setHours(responseDue.getHours() + 2);

  const slaCase = await prisma.b2bSlaCase.create({
    data: {
      tenantId,
      workspaceId: workspace.id,
      title: "P1 — API outage response",
      status: "at_risk",
      severity: "p1",
      category: "integration",
      responseTargetMinutes: 15,
      resolutionTargetMinutes: 120,
      responseDueAt: responseDue,
    },
  });

  await prisma.b2bSlaNote.create({
    data: {
      caseId: slaCase.id,
      userId,
      body: "Escalated to on-call engineer — monitoring webhook retries.",
    },
  });

  await prisma.b2bSlaEvent.create({
    data: {
      tenantId,
      caseId: slaCase.id,
      userId,
      eventType: "escalated",
      message: "Escalated to enterprise incident commander",
    },
  });

  await prisma.mailContact.upsert({
    where: { userId_email: { userId, email: client.email! } },
    create: {
      userId,
      email: client.email!,
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone,
      company: client.company,
      notes: "Seeded PMail+ B2B client contact for workspace testing.",
    },
    update: {
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone,
      company: client.company,
      notes: "Seeded PMail+ B2B client contact for workspace testing.",
    },
  });

  return { client, stakeholder, workspace, betaWorkspace, slaCase };
}
