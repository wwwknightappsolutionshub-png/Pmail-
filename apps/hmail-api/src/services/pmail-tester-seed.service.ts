import { prisma } from "../lib/prisma.js";

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
