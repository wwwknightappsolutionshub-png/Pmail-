import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import {
  createAuthenticatedAgent,
  grantAddonTrial,
  resetTestDatabase,
  testPrisma,
} from "./helpers.js";

describe("accounting addons e2e", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("returns 403 for accounting routes without addon trial", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/features/accounting/contacts");
    expect(res.status).toBe(403);
  });

  it("starts trial for ac-document-intake and exposes entitlements", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const start = await agent.post("/api/addons/ac-document-intake/trial");
    expect(start.status).toBe(201);
    expect(start.body.addon.accessStatus).toBe("trial");

    const ent = await agent.get("/api/addons/entitlements");
    expect(ent.body.slugs).toContain("ac-document-intake");
  });

  it("accounting: document vault contact, request category, and review flow", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "ac-document-intake");

    const contactRes = await agent.post("/api/features/accounting/contacts").send({
      firstName: "Jordan",
      lastName: "Lee",
      email: "jordan@example.com",
      role: "client",
    });
    expect(contactRes.status).toBe(201);
    const contactId = contactRes.body.contact.id;

    const requestRes = await agent.post("/api/features/accounting/document-requests").send({
      title: "2024 T1 return documents",
      referenceCode: "DOC-2024-001",
      category: "tax_slip",
      fiscalYear: "2024",
      dueAt: new Date(Date.now() + 86400000 * 10).toISOString(),
      clientContactId: contactId,
    });
    expect(requestRes.status).toBe(201);
    expect(requestRes.body.documentRequest.status).toBe("requested");
    expect(requestRes.body.documentRequest.category).toBe("tax_slip");
    expect(requestRes.body.documentRequest.vaultStatus).toBe("requested");
    const requestId = requestRes.body.documentRequest.id;

    const list = await agent.get("/api/features/accounting/document-requests");
    expect(list.status).toBe(200);
    expect(list.body.documentRequests).toHaveLength(1);
    expect(list.body.documentRequests[0].clientName).toBe("Jordan Lee");
    expect(list.body.documentRequests[0].fiscalYear).toBe("2024");

    const updated = await agent
      .patch(`/api/features/accounting/document-requests/${requestId}`)
      .send({ status: "review_needed" });
    expect(updated.status).toBe(200);
    expect(updated.body.documentRequest.status).toBe("review_needed");
    expect(updated.body.documentRequest.vaultStatus).toBe("in_review");
  });

  it("phase 1: filing calendar flow", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "ac-client-entities");
    await grantAddonTrial(tenant.id, "ac-filing-calendar");

    const contactRes = await agent.post("/api/features/accounting/contacts").send({
      firstName: "Sam",
      lastName: "Nguyen",
      email: "sam@example.com",
    });
    expect(contactRes.status).toBe(403);

    const entityRes = await agent.post("/api/features/accounting/client-entities").send({
      name: "Nguyen Holdings Inc.",
      entityType: "corporation",
      taxId: "123456789RC0001",
    });
    expect(entityRes.status).toBe(201);
    const entityId = entityRes.body.clientEntity.id;

    const deadlineRes = await agent.post("/api/features/accounting/filing-deadlines").send({
      clientEntityId: entityId,
      contact: { firstName: "Sam", lastName: "Nguyen", email: "sam@example.com" },
      dueAt: new Date(Date.now() + 86400000 * 30).toISOString(),
      filingType: "corporate_tax",
      taxPeriod: "FY2024",
      reminderAt: new Date(Date.now() + 86400000 * 15).toISOString(),
      notes: "Corporate tax filing",
    });
    expect(deadlineRes.status).toBe(201);
    expect(deadlineRes.body.filingDeadline.status).toBe("open");
    expect(deadlineRes.body.filingDeadline.filingType).toBe("corporate_tax");
    expect(deadlineRes.body.filingDeadline.taxPeriod).toBe("FY2024");

    const filed = await agent
      .patch(`/api/features/accounting/filing-deadlines/${deadlineRes.body.filingDeadline.id}`)
      .send({ status: "filed" });
    expect(filed.status).toBe(200);
    expect(filed.body.filingDeadline.status).toBe("filed");
    expect(filed.body.filingDeadline.filedAt).toBeTruthy();
  });

  it("accounting: secure exchange templates and audit trail records", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "ac-document-intake");
    await grantAddonTrial(tenant.id, "ac-client-entities");
    await grantAddonTrial(tenant.id, "ac-secure-exchange");

    const templates = await agent.get("/api/features/accounting/templates");
    expect(templates.status).toBe(200);
    expect(templates.body.templates.length).toBeGreaterThan(0);
    expect(templates.body.templates[0].subject).toBeTruthy();

    const requestRes = await agent.post("/api/features/accounting/document-requests").send({
      title: "Signed T2 authorization",
      category: "signature",
    });
    expect(requestRes.status).toBe(201);

    const entityRes = await agent.post("/api/features/accounting/client-entities").send({
      name: "Blue Ledger Inc.",
      entityType: "corporation",
      taxIdentifierType: "business_number",
      taxIdentifier: "765432109RC0001",
    });
    expect(entityRes.status).toBe(201);

    const exchangeRes = await agent.post("/api/features/accounting/exchange-records").send({
      documentRequestId: requestRes.body.documentRequest.id,
      clientEntityId: entityRes.body.clientEntity.id,
      documentName: "authorization-form.pdf",
      category: "signature",
      action: "uploaded",
      status: "accepted",
      notes: "Client uploaded signed authorization",
    });
    expect(exchangeRes.status).toBe(201);
    expect(exchangeRes.body.exchangeRecord.documentRequest.title).toBe("Signed T2 authorization");
    expect(exchangeRes.body.exchangeRecord.clientEntity.name).toBe("Blue Ledger Inc.");

    const records = await agent.get("/api/features/accounting/exchange-records");
    expect(records.status).toBe(200);
    expect(records.body.exchangeRecords).toHaveLength(1);
    expect(records.body.exchangeRecords[0].action).toBe("uploaded");
  });

  it("accounting: client entity hierarchy, tax identifiers, and notes", async () => {
    const { agent, tenant, user } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "ac-client-entities");

    const parentRes = await agent.post("/api/features/accounting/client-entities").send({
      name: "Maple Tax Partners LLP",
      entityType: "partnership",
      taxIdentifierType: "business_number",
      taxIdentifier: "111222333RC0001",
      jurisdiction: "ON",
      fiscalYearEnd: "Dec 31",
      engagementType: "year_end",
    });
    expect(parentRes.status).toBe(201);

    const entityRes = await agent.post("/api/features/accounting/client-entities").send({
      name: "Maple Advisory Trust",
      entityType: "trust",
      taxIdentifierType: "trust_account",
      taxIdentifier: "T12345678",
      parentEntityId: parentRes.body.clientEntity.id,
      engagementType: "advisory",
    });
    expect(entityRes.status).toBe(201);
    const entityId = entityRes.body.clientEntity.id;
    expect(entityRes.body.clientEntity.parentEntity.name).toBe("Maple Tax Partners LLP");
    expect(entityRes.body.clientEntity.taxIdentifierType).toBe("trust_account");

    const noteRes = await agent.post(`/api/features/accounting/client-entities/${entityId}/notes`).send({
      body: "Annual engagement letter signed",
    });
    expect(noteRes.status).toBe(201);
    expect(noteRes.body.note.author.email).toBe(user.email);

    const notes = await agent.get(`/api/features/accounting/client-entities/${entityId}/notes`);
    expect(notes.body.notes).toHaveLength(1);

    const entities = await agent.get("/api/features/accounting/client-entities");
    expect(entities.body.clientEntities.find((e: { id: string }) => e.id === parentRes.body.clientEntity.id).childEntityCount).toBe(1);
  });

  it("rejects invalid client entity payload", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "ac-client-entities");

    const res = await agent.post("/api/features/accounting/client-entities").send({ name: "", entityType: "" });
    expect(res.status).toBe(400);
  });
});

describe("recruitment addons e2e", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("returns 403 for recruitment routes without addon trial", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/features/recruitment/contacts");
    expect(res.status).toBe(403);
  });

  it("starts trial for rc-role-pipeline and exposes entitlements", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const start = await agent.post("/api/addons/rc-role-pipeline/trial");
    expect(start.status).toBe(201);
    expect(start.body.addon.accessStatus).toBe("trial");

    const ent = await agent.get("/api/addons/entitlements");
    expect(ent.body.slugs).toContain("rc-role-pipeline");
  });

  it("phase 1: role pipeline contact and role flow", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "rc-role-pipeline");

    const contactRes = await agent.post("/api/features/recruitment/contacts").send({
      firstName: "Priya",
      lastName: "Sharma",
      email: "priya@clientco.com",
      role: "client",
      source: "referral",
      currentCompany: "ClientCo",
      desiredRole: "VP Engineering",
      candidateStage: "screening",
    });
    expect(contactRes.status).toBe(201);
    expect(contactRes.body.contact.candidateStage).toBe("screening");
    const contactId = contactRes.body.contact.id;

    const roleRes = await agent.post("/api/features/recruitment/roles").send({
      title: "Senior Backend Engineer",
      clientCompany: "ClientCo",
      requisitionCode: "REQ-1001",
      priority: "urgent",
      employmentType: "full_time",
      location: "Toronto",
      remotePolicy: "remote",
      salaryMinCents: 14000000,
      salaryMaxCents: 18000000,
      targetStartDate: new Date(Date.now() + 45 * 86400000).toISOString(),
      pipelineStage: "sourcing",
      clientContactId: contactId,
    });
    expect(roleRes.status).toBe(201);
    expect(roleRes.body.role.status).toBe("open");
    expect(roleRes.body.role.priority).toBe("urgent");
    expect(roleRes.body.role.remotePolicy).toBe("remote");
    const roleId = roleRes.body.role.id;

    const list = await agent.get("/api/features/recruitment/roles");
    expect(list.status).toBe(200);
    expect(list.body.roles).toHaveLength(1);
    expect(list.body.roles[0].clientName).toBe("Priya Sharma");

    const updated = await agent.patch(`/api/features/recruitment/roles/${roleId}`).send({
      status: "interviewing",
      pipelineStage: "interviewing",
    });
    expect(updated.status).toBe(200);
    expect(updated.body.role.status).toBe("interviewing");
    expect(updated.body.role.pipelineStage).toBe("interviewing");
  });

  it("phase 1: interview desk flow", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "rc-role-pipeline");
    await grantAddonTrial(tenant.id, "rc-interview-desk");

    const roleRes = await agent.post("/api/features/recruitment/roles").send({
      title: "Product Designer",
      clientCompany: "DesignHub",
    });
    const roleId = roleRes.body.role.id;

    const bad = await agent.post("/api/features/recruitment/interviews").send({
      roleId,
      contact: { firstName: "Alex", lastName: "Kim" },
      scheduledAt: new Date(Date.now() - 60000).toISOString(),
    });
    expect(bad.status).toBe(400);

    const interviewRes = await agent.post("/api/features/recruitment/interviews").send({
      roleId,
      contact: { firstName: "Alex", lastName: "Kim", email: "alex@example.com" },
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      interviewType: "technical",
      roundNumber: 2,
      interviewerName: "Morgan Lee",
      notes: "Panel round 1",
    });
    expect(interviewRes.status).toBe(201);
    expect(interviewRes.body.interview.status).toBe("scheduled");
    expect(interviewRes.body.interview.interviewType).toBe("technical");
    expect(interviewRes.body.interview.roundNumber).toBe(2);

    const candidateRes = await agent.post("/api/features/recruitment/contacts").send({
      firstName: "Nia",
      lastName: "Patel",
      email: "nia@example.com",
      role: "candidate",
      source: "linkedin",
      desiredRole: "Product Designer",
    });
    expect(candidateRes.status).toBe(201);

    const submissionRes = await agent.post("/api/features/recruitment/submissions").send({
      roleId,
      contactId: candidateRes.body.contact.id,
      source: "direct_sourcing",
      score: 91,
      notes: "Strong portfolio",
    });
    expect(submissionRes.status).toBe(201);
    expect(submissionRes.body.submission.score).toBe(91);

    const shortlisted = await agent
      .patch(`/api/features/recruitment/submissions/${submissionRes.body.submission.id}`)
      .send({ stage: "shortlisted" });
    expect(shortlisted.status).toBe(200);
    expect(shortlisted.body.submission.stage).toBe("shortlisted");

    const completed = await agent
      .patch(`/api/features/recruitment/interviews/${interviewRes.body.interview.id}`)
      .send({ status: "completed", feedbackStatus: "submitted", score: 88, outcomeReason: "Advance to client" });
    expect(completed.status).toBe(200);
    expect(completed.body.interview.status).toBe("completed");
    expect(completed.body.interview.feedbackStatus).toBe("submitted");
    expect(completed.body.interview.score).toBe(88);
  });

  it("phase 1: bulk outreach templates and campaigns", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "rc-role-pipeline");
    await grantAddonTrial(tenant.id, "rc-bulk-outreach");

    const templates = await agent.get("/api/features/recruitment/templates");
    expect(templates.status).toBe(200);
    expect(templates.body.templates.length).toBeGreaterThan(0);
    expect(templates.body.templates[0].subject).toBeTruthy();

    const roleRes = await agent.post("/api/features/recruitment/roles").send({
      title: "Data Engineer",
      clientCompany: "DataCo",
    });

    const campaignRes = await agent.post("/api/features/recruitment/campaigns").send({
      roleId: roleRes.body.role.id,
      name: "Data engineer sourcing",
      channel: "linkedin",
      audience: "senior_data_candidates",
    });
    expect(campaignRes.status).toBe(201);
    expect(campaignRes.body.campaign.channel).toBe("linkedin");

    const sent = await agent
      .patch(`/api/features/recruitment/campaigns/${campaignRes.body.campaign.id}`)
      .send({ status: "sent" });
    expect(sent.status).toBe(200);
    expect(sent.body.campaign.status).toBe("sent");
    expect(sent.body.campaign.launchedAt).toBeTruthy();
  });

  it("phase 1: talent search placements with notes", async () => {
    const { agent, tenant, user } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "rc-role-pipeline");
    await grantAddonTrial(tenant.id, "rc-talent-search");

    const roleRes = await agent.post("/api/features/recruitment/roles").send({
      title: "DevOps Lead",
      clientCompany: "CloudOps",
    });
    const roleId = roleRes.body.role.id;

    const candidateRes = await agent.post("/api/features/recruitment/contacts").send({
      firstName: "Dev",
      lastName: "Ops",
      email: "devops@example.com",
      role: "candidate",
      candidateStage: "offer",
    });

    const placementRes = await agent.post("/api/features/recruitment/placements").send({
      roleId,
      title: "DevOps Lead — CloudOps",
      compensationCents: 14500000,
      candidateContactId: candidateRes.body.contact.id,
      startDate: new Date(Date.now() + 21 * 86400000).toISOString(),
      recruiterFeeCents: 2900000,
      guaranteeEndDate: new Date(Date.now() + 111 * 86400000).toISOString(),
      onboardingStatus: "contract_sent",
    });
    expect(placementRes.status).toBe(201);
    expect(placementRes.body.placement.onboardingStatus).toBe("contract_sent");
    expect(placementRes.body.placement.recruiterFeeCents).toBe(2900000);
    const placementId = placementRes.body.placement.id;

    const noteRes = await agent.post(`/api/features/recruitment/placements/${placementId}/notes`).send({
      body: "Candidate accepted verbal offer",
    });
    expect(noteRes.status).toBe(201);
    expect(noteRes.body.note.author.email).toBe(user.email);

    const referenceRes = await agent.post("/api/features/recruitment/reference-checks").send({
      contactId: candidateRes.body.contact.id,
      placementId,
      refereeName: "Former Manager",
      refereeEmail: "manager@example.com",
      relationship: "manager",
    });
    expect(referenceRes.status).toBe(201);
    expect(referenceRes.body.referenceCheck.status).toBe("requested");

    const completedReference = await agent
      .patch(`/api/features/recruitment/reference-checks/${referenceRes.body.referenceCheck.id}`)
      .send({ status: "completed" });
    expect(completedReference.status).toBe(200);
    expect(completedReference.body.referenceCheck.completedAt).toBeTruthy();

    const placed = await agent.patch(`/api/features/recruitment/placements/${placementId}`).send({
      status: "placed",
      onboardingStatus: "started",
    });
    expect(placed.status).toBe(200);
    expect(placed.body.placement.status).toBe("placed");
    expect(placed.body.placement.onboardingStatus).toBe("started");
    expect(placed.body.placement.offerAcceptedAt).toBeTruthy();
  });

  it("rejects invalid role payload", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "rc-role-pipeline");

    const res = await agent.post("/api/features/recruitment/roles").send({ title: "" });
    expect(res.status).toBe(400);
  });
});

describe("b2b addons e2e", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("returns 403 for b2b routes without addon trial", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/features/b2b/contacts");
    expect(res.status).toBe(403);
  });

  it("starts trial for b2b-client-workspaces and exposes entitlements", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const start = await agent.post("/api/addons/b2b-client-workspaces/trial");
    expect(start.status).toBe(201);
    expect(start.body.addon.accessStatus).toBe("trial");

    const ent = await agent.get("/api/addons/entitlements");
    expect(ent.body.slugs).toContain("b2b-client-workspaces");
  });

  it("phase 1: client workspace contact and workspace flow", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "b2b-client-workspaces");

    const contactRes = await agent.post("/api/features/b2b/contacts").send({
      firstName: "Chris",
      lastName: "Morgan",
      email: "chris@acmecorp.com",
      role: "client",
      company: "Acme Corp",
      title: "VP Operations",
      decisionRole: "economic_buyer",
    });
    expect(contactRes.status).toBe(201);
    expect(contactRes.body.contact.decisionRole).toBe("economic_buyer");
    const contactId = contactRes.body.contact.id;

    const workspaceRes = await agent.post("/api/features/b2b/workspaces").send({
      name: "Acme Corp — Q2 Retainer",
      clientDomain: "acmecorp.com",
      accountTier: "enterprise",
      arrCents: 24000000,
      healthScore: 88,
      routingDomain: "support.acmecorp.com",
      onboardingStage: "implementation",
      renewalDate: new Date(Date.now() + 90 * 86400000).toISOString(),
      clientContactId: contactId,
    });
    expect(workspaceRes.status).toBe(201);
    expect(workspaceRes.body.workspace.status).toBe("active");
    expect(workspaceRes.body.workspace.accountTier).toBe("enterprise");
    expect(workspaceRes.body.workspace.healthScore).toBe(88);
    expect(workspaceRes.body.workspace.routingDomain).toBe("support.acmecorp.com");
    const workspaceId = workspaceRes.body.workspace.id;

    const list = await agent.get("/api/features/b2b/workspaces");
    expect(list.status).toBe(200);
    expect(list.body.workspaces).toHaveLength(1);
    expect(list.body.workspaces[0].clientName).toBe("Chris Morgan");

    const paused = await agent.patch(`/api/features/b2b/workspaces/${workspaceId}`).send({ status: "paused" });
    expect(paused.status).toBe(200);
    expect(paused.body.workspace.status).toBe("paused");

    const healthier = await agent.patch(`/api/features/b2b/workspaces/${workspaceId}`).send({
      healthScore: 92,
      onboardingStage: "launch",
    });
    expect(healthier.status).toBe(200);
    expect(healthier.body.workspace.healthScore).toBe(92);
    expect(healthier.body.workspace.onboardingStage).toBe("launch");
  });

  it("phase 1: project tracker milestone flow", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "b2b-client-workspaces");
    await grantAddonTrial(tenant.id, "b2b-project-tracker");

    const workspaceRes = await agent.post("/api/features/b2b/workspaces").send({
      name: "Beta Launch Workspace",
      clientDomain: "beta.io",
    });
    const workspaceId = workspaceRes.body.workspace.id;

    const bad = await agent.post("/api/features/b2b/milestones").send({
      workspaceId,
      title: "Kickoff call",
      contact: { firstName: "Taylor", lastName: "Reed" },
      scheduledAt: new Date(Date.now() - 60000).toISOString(),
    });
    expect(bad.status).toBe(400);

    const milestoneRes = await agent.post("/api/features/b2b/milestones").send({
      workspaceId,
      title: "Kickoff call",
      contact: { firstName: "Taylor", lastName: "Reed", email: "taylor@beta.io" },
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      milestoneType: "kickoff",
      phase: "discovery",
      ownerRole: "client_success",
      deliverableUrl: "https://beta.io/kickoff",
    });
    expect(milestoneRes.status).toBe(201);
    expect(milestoneRes.body.milestone.status).toBe("scheduled");
    expect(milestoneRes.body.milestone.milestoneType).toBe("kickoff");
    expect(milestoneRes.body.milestone.phase).toBe("discovery");

    const completed = await agent
      .patch(`/api/features/b2b/milestones/${milestoneRes.body.milestone.id}`)
      .send({ status: "completed" });
    expect(completed.status).toBe(200);
    expect(completed.body.milestone.status).toBe("completed");

    const deliverableRes = await agent.post("/api/features/b2b/deliverables").send({
      workspaceId,
      title: "Implementation plan",
      kind: "implementation",
      dueAt: new Date(Date.now() + 172800000).toISOString(),
      url: "https://beta.io/plan",
    });
    expect(deliverableRes.status).toBe(201);
    expect(deliverableRes.body.deliverable.kind).toBe("implementation");

    const approved = await agent
      .patch(`/api/features/b2b/deliverables/${deliverableRes.body.deliverable.id}`)
      .send({ status: "approved" });
    expect(approved.status).toBe(200);
    expect(approved.body.deliverable.status).toBe("approved");
    expect(approved.body.deliverable.approvedAt).toBeTruthy();
  });

  it("phase 1: proposal desk templates and sow pipeline", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "b2b-client-workspaces");
    await grantAddonTrial(tenant.id, "b2b-proposal-desk");

    const templates = await agent.get("/api/features/b2b/templates");
    expect(templates.status).toBe(200);
    expect(templates.body.templates.length).toBeGreaterThan(0);
    expect(templates.body.templates[0].subject).toBeTruthy();

    const workspaceRes = await agent.post("/api/features/b2b/workspaces").send({
      name: "Gamma Expansion",
      clientDomain: "gamma.example",
      accountTier: "strategic",
    });
    const workspaceId = workspaceRes.body.workspace.id;

    const proposalRes = await agent.post("/api/features/b2b/proposals").send({
      workspaceId,
      title: "Gamma SOW",
      version: 2,
      amountCents: 8500000,
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
      sowUrl: "https://gamma.example/sow-v2",
    });
    expect(proposalRes.status).toBe(201);
    expect(proposalRes.body.proposal.version).toBe(2);
    expect(proposalRes.body.proposal.amountCents).toBe(8500000);

    const approved = await agent
      .patch(`/api/features/b2b/proposals/${proposalRes.body.proposal.id}`)
      .send({ status: "approved" });
    expect(approved.status).toBe(200);
    expect(approved.body.proposal.status).toBe("approved");
    expect(approved.body.proposal.approvedAt).toBeTruthy();
  });

  it("phase 1: sla monitor with notes", async () => {
    const { agent, tenant, user } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "b2b-client-workspaces");
    await grantAddonTrial(tenant.id, "b2b-sla-monitor");

    const workspaceRes = await agent.post("/api/features/b2b/workspaces").send({
      name: "Enterprise Support",
      clientDomain: "enterprise.com",
    });
    const workspaceId = workspaceRes.body.workspace.id;

    const caseRes = await agent.post("/api/features/b2b/sla-cases").send({
      workspaceId,
      title: "P1 — API outage response",
      severity: "p1",
      category: "integration",
      responseTargetMinutes: 15,
      resolutionTargetMinutes: 120,
      responseDueAt: new Date(Date.now() + 3600000).toISOString(),
    });
    expect(caseRes.status).toBe(201);
    expect(caseRes.body.slaCase.severity).toBe("p1");
    expect(caseRes.body.slaCase.responseTargetMinutes).toBe(15);
    const caseId = caseRes.body.slaCase.id;

    const noteRes = await agent.post(`/api/features/b2b/sla-cases/${caseId}/notes`).send({
      body: "Escalated to on-call engineer",
    });
    expect(noteRes.status).toBe(201);
    expect(noteRes.body.note.author.email).toBe(user.email);

    const eventRes = await agent.post(`/api/features/b2b/sla-cases/${caseId}/events`).send({
      eventType: "escalated",
      message: "Escalated to enterprise incident commander",
    });
    expect(eventRes.status).toBe(201);
    expect(eventRes.body.event.eventType).toBe("escalated");

    const events = await agent.get(`/api/features/b2b/sla-cases/${caseId}/events`);
    expect(events.status).toBe(200);
    expect(events.body.events).toHaveLength(1);

    const resolved = await agent.patch(`/api/features/b2b/sla-cases/${caseId}`).send({ status: "resolved", resolved: true });
    expect(resolved.status).toBe(200);
    expect(resolved.body.slaCase.status).toBe("resolved");
    expect(resolved.body.slaCase.resolvedAt).toBeTruthy();
  });

  it("rejects invalid workspace payload", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "b2b-client-workspaces");

    const res = await agent.post("/api/features/b2b/workspaces").send({ name: "" });
    expect(res.status).toBe(400);
  });
});

describe("healthcare addons e2e", () => {
  const app = createApp();

  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("returns 403 for healthcare routes without addon trial", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const res = await agent.get("/api/features/healthcare/contacts");
    expect(res.status).toBe(403);
  });

  it("starts trial for hc-patient-registry and exposes entitlements", async () => {
    const { agent } = await createAuthenticatedAgent(app);
    const start = await agent.post("/api/addons/hc-patient-registry/trial");
    expect(start.status).toBe(201);
    expect(start.body.addon.accessStatus).toBe("trial");

    const ent = await agent.get("/api/addons/entitlements");
    expect(ent.body.slugs).toContain("hc-patient-registry");
  });

  it("phase 1: patient registry contact and chart flow", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "hc-patient-registry");

    const contactRes = await agent.post("/api/features/healthcare/contacts").send({
      firstName: "Emily",
      lastName: "Chen",
      email: "emily@example.com",
      role: "patient",
      dateOfBirth: "1988-04-12",
      medicalRecordNumber: "MRN-0042",
      preferredProvider: "Dr. Singh",
    });
    expect(contactRes.status).toBe(201);
    expect(contactRes.body.contact.medicalRecordNumber).toBe("MRN-0042");
    const contactId = contactRes.body.contact.id;

    const chartRes = await agent.post("/api/features/healthcare/patient-charts").send({
      chartNumber: "HC-2024-0042",
      patientContactId: contactId,
      careStage: "active_care",
      referralStatus: "triaged",
      authorizationStatus: "approved",
      callbackRequired: true,
    });
    expect(chartRes.status).toBe(201);
    expect(chartRes.body.chart.status).toBe("active");
    expect(chartRes.body.chart.careStage).toBe("active_care");
    expect(chartRes.body.chart.authorizationStatus).toBe("approved");
    const chartId = chartRes.body.chart.id;

    const list = await agent.get("/api/features/healthcare/patient-charts");
    expect(list.status).toBe(200);
    expect(list.body.charts).toHaveLength(1);
    expect(list.body.charts[0].patientName).toBe("Emily Chen");

    const updated = await agent.patch(`/api/features/healthcare/patient-charts/${chartId}`).send({
      status: "inactive",
      careStage: "follow_up",
      authorizationStatus: "expired",
      callbackRequired: false,
    });
    expect(updated.status).toBe(200);
    expect(updated.body.chart.status).toBe("inactive");
    expect(updated.body.chart.careStage).toBe("follow_up");
    expect(updated.body.chart.callbackRequired).toBe(false);
  });

  it("phase 1: appointment desk flow", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "hc-patient-registry");
    await grantAddonTrial(tenant.id, "hc-appointment-desk");

    const chartRes = await agent.post("/api/features/healthcare/charts").send({
      chartNumber: "HC-2024-0099",
    });
    const chartId = chartRes.body.chart.id;

    const bad = await agent.post("/api/features/healthcare/appointments").send({
      chartId,
      contact: { firstName: "Noah", lastName: "Patel" },
      scheduledAt: new Date(Date.now() - 60000).toISOString(),
    });
    expect(bad.status).toBe(400);

    const appointmentRes = await agent.post("/api/features/healthcare/appointments").send({
      chartId,
      contact: { firstName: "Noah", lastName: "Patel", email: "noah@example.com" },
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      appointmentType: "telehealth",
      callbackStatus: "queued",
      notes: "Annual checkup",
    });
    expect(appointmentRes.status).toBe(201);
    expect(appointmentRes.body.appointment.status).toBe("scheduled");
    expect(appointmentRes.body.appointment.appointmentType).toBe("telehealth");
    expect(appointmentRes.body.appointment.callbackStatus).toBe("queued");

    const completed = await agent
      .patch(`/api/features/healthcare/appointments/${appointmentRes.body.appointment.id}`)
      .send({ status: "no_show", callbackStatus: "queued", noShowReason: "Patient did not answer intake call" });
    expect(completed.status).toBe(200);
    expect(completed.body.appointment.status).toBe("no_show");
    expect(completed.body.appointment.noShowReason).toMatch(/intake call/);
  });

  it("phase 1: referral tracker templates and referral queue", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "hc-patient-registry");
    await grantAddonTrial(tenant.id, "hc-referral-tracker");

    const chartRes = await agent.post("/api/features/healthcare/charts").send({
      chartNumber: "HC-REF-001",
      referralStatus: "received",
    });
    const chartId = chartRes.body.chart.id;

    const referralRes = await agent.post("/api/features/healthcare/referrals").send({
      chartId,
      direction: "inbound",
      referralType: "specialist",
      specialty: "Cardiology",
      priority: "urgent",
      dueAt: new Date(Date.now() + 86400000 * 5).toISOString(),
      notes: "Chest pain referral",
    });
    expect(referralRes.status).toBe(201);
    expect(referralRes.body.referral.priority).toBe("urgent");

    const referrals = await agent.get("/api/features/healthcare/referrals");
    expect(referrals.status).toBe(200);
    expect(referrals.body.referrals).toHaveLength(1);

    const scheduled = await agent
      .patch(`/api/features/healthcare/referrals/${referralRes.body.referral.id}`)
      .send({ status: "scheduled" });
    expect(scheduled.status).toBe(200);
    expect(scheduled.body.referral.status).toBe("scheduled");

    const templates = await agent.get("/api/features/healthcare/templates");
    expect(templates.status).toBe(200);
    expect(templates.body.templates.length).toBeGreaterThan(0);
    expect(templates.body.templates[0].subject).toBeTruthy();
  });

  it("phase 1: hipaa audit with notes", async () => {
    const { agent, tenant, user } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "hc-patient-registry");
    await grantAddonTrial(tenant.id, "hc-hipaa-audit");
    await testPrisma.user.update({
      where: { id: user.id },
      data: { healthcareAccessRole: "admin" },
    });

    const chartRes = await agent.post("/api/features/healthcare/charts").send({
      chartNumber: "HC-AUDIT-001",
    });
    const chartId = chartRes.body.chart.id;

    const caseRes = await agent.post("/api/features/healthcare/audit-cases").send({
      chartId,
      title: "Unauthorized chart access review",
      severity: "high",
      accessReason: "Minimum necessary access review",
      roleScope: "clinical_staff",
    });
    expect(caseRes.status).toBe(201);
    expect(caseRes.body.auditCase.roleScope).toBe("clinical_staff");
    const caseId = caseRes.body.auditCase.id;

    const accessLog = await agent.post("/api/features/healthcare/access-logs").send({
      chartId,
      action: "exported",
      reason: "Patient requested chart export",
      roleScope: "admin",
    });
    expect(accessLog.status).toBe(201);
    expect(accessLog.body.log.exportedAt).toBeTruthy();

    const logs = await agent.get(`/api/features/healthcare/access-logs?chartId=${chartId}`);
    expect(logs.status).toBe(200);
    expect(logs.body.logs).toHaveLength(1);
    expect(logs.body.logs[0].user.email).toBe(user.email);

    const noteRes = await agent.post(`/api/features/healthcare/audit-cases/${caseId}/notes`).send({
      body: "Access logs reviewed — no breach confirmed",
    });
    expect(noteRes.status).toBe(201);
    expect(noteRes.body.note.author.email).toBe(user.email);

    const closed = await agent
      .patch(`/api/features/healthcare/audit-cases/${caseId}`)
      .send({ status: "closed", resolved: true, exportRequested: true });
    expect(closed.status).toBe(200);
    expect(closed.body.auditCase.status).toBe("closed");
    expect(closed.body.auditCase.resolvedAt).toBeTruthy();
    expect(closed.body.auditCase.exportRequestedAt).toBeTruthy();
  });

  it("rejects invalid chart payload", async () => {
    const { agent, tenant } = await createAuthenticatedAgent(app);
    await grantAddonTrial(tenant.id, "hc-patient-registry");

    const res = await agent.post("/api/features/healthcare/charts").send({ chartNumber: "" });
    expect(res.status).toBe(400);
  });
});
