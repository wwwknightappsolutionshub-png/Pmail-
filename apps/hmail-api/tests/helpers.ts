import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import request, { type Agent } from "supertest";
import type { Express } from "express";
import { encryptSecret, hashPassword, hashToken } from "../src/lib/crypto.js";
import { resolveDatabaseUrl } from "../src/lib/database-url.js";
import { seedAddonCatalog } from "../src/services/addon.service.js";
import { seedImmigrationTemplates } from "../src/services/templates.service.js";
import { seedRealEstateTemplates } from "../src/services/real-estate-templates.service.js";
import { seedAccountingTemplates } from "../src/services/accounting-templates.service.js";
import { seedRecruitmentTemplates } from "../src/services/recruitment-templates.service.js";
import { seedB2bTemplates } from "../src/services/b2b-templates.service.js";
import { seedHealthcareTemplates } from "../src/services/healthcare-templates.service.js";

resolveDatabaseUrl();

const prisma = new PrismaClient();

export async function resetTestDatabase(): Promise<void> {
  await prisma.complianceAuditLog.deleteMany();
  await prisma.growthAuditLog.deleteMany();
  await prisma.growthAgentMemory.deleteMany();
  await prisma.growthEvent.deleteMany();
  await prisma.growthAgentRun.deleteMany();
  await prisma.growthJob.deleteMany();
  await prisma.growthContentAsset.deleteMany();
  await prisma.growthLeadActivity.deleteMany();
  await prisma.growthAutomationRun.deleteMany();
  await prisma.growthAutomation.deleteMany();
  await prisma.growthTeamMember.deleteMany();
  await prisma.growthWorkspaceSettings.deleteMany();
  await prisma.growthOptimizationInsight.deleteMany();
  await prisma.growthWeeklyBrief.deleteMany();
  await prisma.growthChannelDelivery.deleteMany();
  await prisma.growthChannelIntegration.deleteMany();
  await prisma.growthAdCampaign.deleteMany();
  await prisma.growthSeoKeyword.deleteMany();
  await prisma.growthAnalyticsEvent.deleteMany();
  await prisma.growthChatMessage.deleteMany();
  await prisma.growthChatSession.deleteMany();
  await prisma.growthLead.deleteMany();
  await prisma.growthFormDefinition.deleteMany();
  await prisma.growthPipelineStage.deleteMany();
  await prisma.growthChatbotConfig.deleteMany();
  await prisma.growthBusinessProfile.deleteMany();
  await prisma.growthWorkspace.deleteMany();
  await prisma.growthPromptTemplate.deleteMany();
  await prisma.autoReplySentLog.deleteMany();
  await prisma.trackedEmailLink.deleteMany();
  await prisma.mailVaultFile.deleteMany();
  await prisma.userMailAccount.deleteMany();
  await prisma.mailUnsubscribeLog.deleteMany();
  await prisma.categorizedMailAttachment.deleteMany();
  await prisma.mailEsignRequest.deleteMany();
  await prisma.mailSlaAlert.deleteMany();
  await prisma.mailSlaReportExport.deleteMany();
  await prisma.mailSlaThread.deleteMany();
  await prisma.userMailSlaSettings.deleteMany();
  await prisma.jobHunterMailAccountSettings.deleteMany();
  await prisma.jobApplication.deleteMany();
  await prisma.jobHunterCvDocument.deleteMany();
  await prisma.userDocument.deleteMany();
  await prisma.userJobSiteLink.deleteMany();
  await prisma.jobApplyAssistLedger.deleteMany();
  await prisma.jobApplyAssistQueue.deleteMany();
  await prisma.jobApplyAssistCreditWallet.deleteMany();
  await prisma.userJobHunterSettings.deleteMany();
  await prisma.sentMessageTracking.deleteMany();
  try {
    await prisma.pmailReferralLead.deleteMany();
  } catch {
    await prisma.$executeRawUnsafe('DELETE FROM "PmailReferralLead"');
  }
  await prisma.userSignature.deleteMany();
  await prisma.userAutoReply.deleteMany();
  await prisma.userComposeSettings.deleteMany();
  await prisma.workspaceReminder.deleteMany();
  await prisma.crmRecord.deleteMany();
  await prisma.crmPipelineStage.deleteMany();
  await prisma.industryToolState.deleteMany();
  await prisma.marketingAiSession.deleteMany();
  await prisma.platformEmailLog.deleteMany();
  await prisma.membershipApplication.deleteMany();
  await prisma.inquirySubmission.deleteMany();
  await prisma.publicFormDefinition.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.marketingPlatformConfig.deleteMany();
  await prisma.marketingLead.deleteMany();
  await prisma.bespokeDemoWorkspace.deleteMany();
  await prisma.panelFileEntry.deleteMany();
  await prisma.panelDatabase.deleteMany();
  await prisma.panelAddonDomain.deleteMany();
  await prisma.panelMailbox.deleteMany();
  await prisma.portalDocumentRequest.deleteMany();
  await prisma.portalAccess.deleteMany();
  await prisma.matterDeadline.deleteMany();
  await prisma.mailMatterLink.deleteMany();
  await prisma.irccMailClassification.deleteMany();
  await prisma.matterChecklistItem.deleteMany();
  await prisma.matter.deleteMany();
  await prisma.client.deleteMany();
  await prisma.scheduledMessage.deleteMany();
  await prisma.reDealNote.deleteMany();
  await prisma.reDeal.deleteMany();
  await prisma.reShowing.deleteMany();
  await prisma.reListing.deleteMany();
  await prisma.reContact.deleteMany();
  await prisma.reQuickReplyTemplate.deleteMany();
  await prisma.acEntityNote.deleteMany();
  await prisma.rcPlacementNote.deleteMany();
  await prisma.b2bSlaNote.deleteMany();
  await prisma.b2bSlaEvent.deleteMany();
  await prisma.hcAuditNote.deleteMany();
  await prisma.hcAccessLog.deleteMany();
  await prisma.acDocumentRequest.deleteMany();
  await prisma.rcReferenceCheck.deleteMany();
  await prisma.rcPlacement.deleteMany();
  await prisma.rcOutreachCampaign.deleteMany();
  await prisma.rcCandidateSubmission.deleteMany();
  await prisma.b2bSlaCase.deleteMany();
  await prisma.b2bProposal.deleteMany();
  await prisma.b2bDeliverable.deleteMany();
  await prisma.hcAuditCase.deleteMany();
  await prisma.hcReferral.deleteMany();
  await prisma.acFilingDeadline.deleteMany();
  await prisma.rcInterview.deleteMany();
  await prisma.b2bMilestone.deleteMany();
  await prisma.hcAppointment.deleteMany();
  await prisma.acClientEntity.deleteMany();
  await prisma.rcRole.deleteMany();
  await prisma.b2bWorkspace.deleteMany();
  await prisma.hcPatientChart.deleteMany();
  await prisma.acContact.deleteMany();
  await prisma.rcContact.deleteMany();
  await prisma.b2bContact.deleteMany();
  await prisma.hcContact.deleteMany();
  await prisma.acSecureTemplate.deleteMany();
  await prisma.rcOutreachTemplate.deleteMany();
  await prisma.b2bProposalTemplate.deleteMany();
  await prisma.hcReferralTemplate.deleteMany();
  await prisma.addonEmailLog.deleteMany();
  await prisma.tenantAddonTrial.deleteMany();
  await prisma.tenantAddonSubscription.deleteMany();
  await prisma.addonMarketing.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.paymentWebhookEvent.deleteMany();
  await prisma.paymentCheckout.deleteMany();
  await prisma.hostingPlanSubscription.deleteMany();
  await prisma.vpsInstance.deleteMany();
  await prisma.panelSession.deleteMany();
  await prisma.hostingAccount.deleteMany();
  await prisma.adminSession.deleteMany();
  await prisma.platformAdmin.deleteMany();
  await prisma.siteSection.deleteMany();
  await prisma.hostingPlan.deleteMany();
  await prisma.session.deleteMany();
  await prisma.mailContactListMember.deleteMany();
  await prisma.mailContactGroupMember.deleteMany();
  await prisma.mailContactList.deleteMany();
  await prisma.mailContactGroup.deleteMany();
  await prisma.mailContact.deleteMany();
  await prisma.userMailConfig.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenantBranding.deleteMany();
  await prisma.tenantMailConfig.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.addon.deleteMany();
  await seedAddonCatalog();
  await seedPmailTesterTenant();
}

export async function seedPmailTesterTenant() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "pmail-tester" },
    create: {
      slug: "pmail-tester",
      name: "PMail+ Tester Tenant",
      branding: { create: { productName: "PMail+" } },
      mail: {
        create: {
          imapHost: "local.pmail.test",
          imapPort: 993,
          imapSecure: true,
          smtpHost: "local.pmail.test",
          smtpPort: 465,
          smtpSecure: true,
          mailOnboardingComplete: true,
        },
      },
    },
    update: {
      name: "PMail+ Tester Tenant",
      isActive: true,
    },
    include: { mail: true },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "pmailtester@gmail.com" } },
    create: {
      tenantId: tenant.id,
      email: "pmailtester@gmail.com",
      displayName: "PMail Tester",
      businessVertical: "accounting",
      mailConfig: {
        create: {
          providerPreset: "custom",
          imapHost: "local.pmail.test",
          imapPort: 993,
          imapSecure: true,
          smtpHost: "local.pmail.test",
          smtpPort: 465,
          smtpSecure: true,
        },
      },
    },
    update: {
      displayName: "PMail Tester",
      businessVertical: "accounting",
      isActive: true,
    },
  });

  const user = await prisma.user.findFirstOrThrow({
    where: { tenantId: tenant.id, email: "pmailtester@gmail.com" },
  });
  const { ensurePmailTesterAccountingWorkspace } = await import("../src/services/pmail-tester-seed.service.js");
  await ensurePmailTesterAccountingWorkspace(tenant.id, user.id);
}

export async function seedTestTenant() {
  await seedAddonCatalog();
  await seedImmigrationTemplates();
  await seedRealEstateTemplates();
  await seedAccountingTemplates();
  await seedRecruitmentTemplates();
  await seedB2bTemplates();
  await seedHealthcareTemplates();

  const tenant = await prisma.tenant.create({
    data: {
      slug: "test-firm",
      name: "Test Immigration Firm",
      branding: { create: { productName: "PMail+" } },
      mail: { create: { mailOnboardingComplete: true } },
    },
  });

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "lawyer@testfirm.ca",
      displayName: "Test Lawyer",
      mailConfig: {
        create: {
          providerPreset: "microsoft",
          imapHost: "imap.hostinger.com",
          imapPort: 993,
          imapSecure: true,
          smtpHost: "smtp.hostinger.com",
          smtpPort: 465,
          smtpSecure: true,
        },
      },
    },
  });

  return { tenant, user };
}

export async function createAuthenticatedAgent(app: Express): Promise<{
  agent: Agent;
  tenant: Awaited<ReturnType<typeof seedTestTenant>>["tenant"];
  user: Awaited<ReturnType<typeof seedTestTenant>>["user"];
  token: string;
}> {
  const { tenant, user } = await seedTestTenant();
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      encryptedMailPassword: encryptSecret("test-mail-password"),
      expiresAt,
    },
  });

  const agent = request.agent(app);
  const withAuth = {
    get: (path: string) => agent.get(path).set("Cookie", [`hmail_session=${token}`]),
    post: (path: string) => agent.post(path).set("Cookie", [`hmail_session=${token}`]),
    put: (path: string) => agent.put(path).set("Cookie", [`hmail_session=${token}`]),
    patch: (path: string) => agent.patch(path).set("Cookie", [`hmail_session=${token}`]),
    delete: (path: string) => agent.delete(path).set("Cookie", [`hmail_session=${token}`]),
  };

  return { agent: withAuth, tenant, user, token };
}

export async function createAdminAgent(app: Express): Promise<{
  agent: Agent;
  admin: { id: string; email: string };
  email: string;
  password: string;
}> {
  const email = process.env.ADMIN_DEFAULT_EMAIL ?? "admin@test.local";
  const password = process.env.ADMIN_DEFAULT_PASSWORD ?? "test-admin-pass";
  const admin = await prisma.platformAdmin.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      name: "Test Admin",
      role: "super_admin",
    },
  });

  const token = randomUUID();
  await prisma.adminSession.create({
    data: {
      adminId: admin.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const baseAgent = request.agent(app);
  const withAuth = {
    get: (path: string) => baseAgent.get(path).set("Cookie", [`hostnet_admin_session=${token}`]),
    post: (path: string) => baseAgent.post(path).set("Cookie", [`hostnet_admin_session=${token}`]),
    patch: (path: string) => baseAgent.patch(path).set("Cookie", [`hostnet_admin_session=${token}`]),
    delete: (path: string) => baseAgent.delete(path).set("Cookie", [`hostnet_admin_session=${token}`]),
  };

  return { agent: withAuth, admin: { id: admin.id, email: admin.email }, email, password };
}

export async function createPanelAgent(app: Express): Promise<{
  agent: Agent;
  tenant: { id: string; slug: string };
  hostingAccountId: string;
  username: string;
  domain: string;
  password: string;
}> {
  const tenant = await prisma.tenant.create({
    data: {
      slug: `growth-${randomUUID().slice(0, 8)}`,
      name: "Growth Test Tenant",
      branding: { create: { productName: "Prohost Growth" } },
      mail: { create: {} },
    },
  });

  const password = "panel-test-pass";
  const username = "owner";
  const domain = "growth.test";

  const hostingAccount = await prisma.hostingAccount.create({
    data: {
      tenantId: tenant.id,
      username,
      domain,
      homePath: `/home/${username}`,
      passwordHash: hashPassword(password),
    },
  });

  const token = randomUUID();
  await prisma.panelSession.create({
    data: {
      hostingAccountId: hostingAccount.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
    },
  });

  const baseAgent = request.agent(app);
  const withAuth = {
    get: (path: string) => baseAgent.get(path).set("Cookie", [`hostnet_panel_session=${token}`]),
    post: (path: string) => baseAgent.post(path).set("Cookie", [`hostnet_panel_session=${token}`]),
    put: (path: string) => baseAgent.put(path).set("Cookie", [`hostnet_panel_session=${token}`]),
    patch: (path: string) => baseAgent.patch(path).set("Cookie", [`hostnet_panel_session=${token}`]),
    delete: (path: string) => baseAgent.delete(path).set("Cookie", [`hostnet_panel_session=${token}`]),
  };

  return {
    agent: withAuth,
    tenant: { id: tenant.id, slug: tenant.slug },
    hostingAccountId: hostingAccount.id,
    username,
    domain,
    password,
  };
}

export async function grantAddonTrial(tenantId: string, slug: string): Promise<void> {
  const addon = await prisma.addon.findFirst({ where: { slug } });
  if (!addon) throw new Error(`Addon not found: ${slug}`);

  const endsAt = new Date();
  const trialDays = slug === "job-hunter-functionality" ? 30 : 7;
  endsAt.setDate(endsAt.getDate() + trialDays);

  await prisma.tenantAddonTrial.upsert({
    where: { tenantId_addonId: { tenantId, addonId: addon.id } },
    create: { tenantId, addonId: addon.id, endsAt, status: "active" },
    update: { endsAt, status: "active" },
  });
}

export async function unlockCareerWorkspace(userId: string, tenantId: string, manual = true): Promise<void> {
  const now = new Date();
  const existing = await prisma.userJobHunterSettings.findUnique({ where: { userId } });
  await prisma.userJobHunterSettings.upsert({
    where: { userId },
    create: {
      tenantId,
      userId,
      tierBDisclosureAcceptedAt: now,
      manualJobHuntingOverride: manual,
      careerScore: manual ? 50 : 0,
      careerUnlockedAt: manual ? now : undefined,
      enabled: true,
    },
    update: {
      tierBDisclosureAcceptedAt: now,
      manualJobHuntingOverride: manual,
      careerScore: manual ? 50 : 0,
      enabled: true,
      ...(manual && !existing?.careerUnlockedAt ? { careerUnlockedAt: now } : {}),
    },
  });
}

export async function expireCareerTrial(userId: string): Promise<void> {
  const past = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
  await prisma.userJobHunterSettings.update({
    where: { userId },
    data: { careerUnlockedAt: past },
  });
}

export async function grantApplyAssistCredits(
  tenantId: string,
  userId: string,
  credits: number,
): Promise<void> {
  const { grantApplyAssistCredits: grant } = await import("../src/services/job-hunter-apply-assist.service.js");
  await grant({ tenantId, userId, credits, reason: "test_grant" });
}

export { prisma as testPrisma };
