import { getEnv } from "../config/env.js";
import {
  classifyCareerMail,
  computeCareerScoreFromApplications,
  shouldUpgradeApplicationStatus,
  type CareerMailInput,
  type JobApplicationStatus,
} from "../lib/job-hunter-career-mail.js";
import { isCareerNavUnlocked } from "../lib/job-hunter.js";
import { prisma } from "../lib/prisma.js";
import { tenantHasAddonAccess } from "./addon.service.js";
import { recordCareerUnlockedIfNeeded } from "./job-hunter-entitlement.service.js";
import {
  getMailCredentialsForAccount,
} from "./mail-account.service.js";
import type { MailCredentials } from "./imap.service.js";
import {
  scanFolderMessagesForJobHunter,
  type CareerMailMessage,
} from "./imap.service.js";
import {
  JOB_HUNTER_ADDON_SLUG,
  userCanRunJobHunterScan,
} from "./job-hunter-settings.service.js";

function maxScan(): number {
  return getEnv().JOB_HUNTER_MAX_SCAN;
}

function shouldSkipImap(credentials: MailCredentials): boolean {
  if (process.env.NODE_ENV === "test") return true;
  return credentials.mailConfig.imapHost === "local.pmail.test";
}

function serializeApplication(row: {
  id: string;
  userId: string;
  mailAccountId: string | null;
  company: string;
  roleTitle: string;
  appliedAt: Date;
  status: string;
  source: string;
  imapFolder: string | null;
  messageUid: number | null;
  messageMessageId: string | null;
  threadHint: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    company: row.company,
    roleTitle: row.roleTitle,
    appliedAt: row.appliedAt.toISOString(),
    status: row.status,
    source: row.source,
    mailAccountId: row.mailAccountId,
    imapFolder: row.imapFolder,
    messageUid: row.messageUid,
    messageMessageId: row.messageMessageId,
    threadHint: row.threadHint,
    hasMailLink: Boolean(row.imapFolder && row.messageUid),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function refreshCareerScore(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tenantId: true },
  });
  if (!user) return 0;

  const count = await prisma.jobApplication.count({ where: { userId } });
  const careerScore = computeCareerScoreFromApplications(count);
  await prisma.userJobHunterSettings.upsert({
    where: { userId },
    create: {
      tenantId: user.tenantId,
      userId,
      careerScore,
    },
    update: { careerScore },
  });

  const updated = await prisma.userJobHunterSettings.findUnique({ where: { userId } });
  if (updated && isCareerNavUnlocked({
    careerScore: updated.careerScore,
    manualJobHuntingOverride: updated.manualJobHuntingOverride,
  })) {
    await recordCareerUnlockedIfNeeded(user.tenantId, userId);
  }

  return careerScore;
}

export async function upsertApplicationFromCareerMessage(input: {
  userId: string;
  mailAccountId?: string | null;
  imapFolder: string;
  messageUid: number;
  messageMessageId?: string | null;
  appliedAt: Date;
  parsed: {
    status: JobApplicationStatus;
    company: string;
    roleTitle: string;
    threadHint: string;
  };
}): Promise<{ created: boolean; id: string }> {
  const existingByMail = await prisma.jobApplication.findFirst({
    where: {
      userId: input.userId,
      imapFolder: input.imapFolder,
      messageUid: input.messageUid,
    },
  });

  if (existingByMail) {
    const nextStatus = shouldUpgradeApplicationStatus(
      existingByMail.status as JobApplicationStatus,
      input.parsed.status,
    )
      ? input.parsed.status
      : existingByMail.status;

    const updated = await prisma.jobApplication.update({
      where: { id: existingByMail.id },
      data: {
        status: nextStatus,
        company: input.parsed.company,
        roleTitle: input.parsed.roleTitle,
        threadHint: input.parsed.threadHint,
        messageMessageId: input.messageMessageId ?? existingByMail.messageMessageId,
      },
    });
    return { created: false, id: updated.id };
  }

  if (input.messageMessageId) {
    const existingByMessageId = await prisma.jobApplication.findFirst({
      where: { userId: input.userId, messageMessageId: input.messageMessageId },
    });
    if (existingByMessageId) {
      const nextStatus = shouldUpgradeApplicationStatus(
        existingByMessageId.status as JobApplicationStatus,
        input.parsed.status,
      )
        ? input.parsed.status
        : existingByMessageId.status;
      const updated = await prisma.jobApplication.update({
        where: { id: existingByMessageId.id },
        data: {
          status: nextStatus,
          company: input.parsed.company,
          roleTitle: input.parsed.roleTitle,
          threadHint: input.parsed.threadHint,
          imapFolder: input.imapFolder,
          messageUid: input.messageUid,
        },
      });
      return { created: false, id: updated.id };
    }
  }

  const related = input.parsed.threadHint
    ? await prisma.jobApplication.findFirst({
        where: { userId: input.userId, threadHint: input.parsed.threadHint },
        orderBy: { appliedAt: "desc" },
      })
    : null;

  if (related && input.parsed.status !== "applied") {
    const nextStatus = shouldUpgradeApplicationStatus(
      related.status as JobApplicationStatus,
      input.parsed.status,
    )
      ? input.parsed.status
      : related.status;
    const updated = await prisma.jobApplication.update({
      where: { id: related.id },
      data: {
        status: nextStatus,
        company: input.parsed.company || related.company,
        roleTitle: input.parsed.roleTitle !== "Role not specified" ? input.parsed.roleTitle : related.roleTitle,
        imapFolder: input.imapFolder,
        messageUid: input.messageUid,
        messageMessageId: input.messageMessageId ?? related.messageMessageId,
      },
    });
    return { created: false, id: updated.id };
  }

  const created = await prisma.jobApplication.create({
    data: {
      userId: input.userId,
      mailAccountId: input.mailAccountId ?? null,
      company: input.parsed.company,
      roleTitle: input.parsed.roleTitle,
      appliedAt: input.appliedAt,
      status: input.parsed.status,
      source: "mail_inferred",
      imapFolder: input.imapFolder,
      messageUid: input.messageUid,
      messageMessageId: input.messageMessageId ?? null,
      threadHint: input.parsed.threadHint,
    },
  });
  return { created: true, id: created.id };
}

export async function processCareerMailMessage(input: {
  userId: string;
  mailAccountId?: string | null;
  imapFolder: string;
  message: CareerMailMessage | (CareerMailInput & { uid: number; messageId?: string | null; date: string; snippet?: string; direction: CareerMailInput["direction"] });
}): Promise<{ created: boolean; id: string } | null> {
  const careerInput: CareerMailInput = {
    direction: input.message.direction,
    subject: input.message.subject,
    fromEmail: "fromEmail" in input.message ? input.message.fromEmail : "",
    toEmails: "toEmails" in input.message ? input.message.toEmails : undefined,
    snippet: "snippet" in input.message ? input.message.snippet : undefined,
    date: input.message.date,
  };

  const parsed = classifyCareerMail(careerInput);
  if (!parsed) return null;

  const result = await upsertApplicationFromCareerMessage({
    userId: input.userId,
    mailAccountId: input.mailAccountId,
    imapFolder: input.imapFolder,
    messageUid: input.message.uid,
    messageMessageId: "messageId" in input.message ? input.message.messageId : null,
    appliedAt: new Date(input.message.date),
    parsed,
  });
  await refreshCareerScore(input.userId);
  return result;
}

async function scanFolderForCareerSignals(
  credentials: MailCredentials,
  folder: string,
  options: { maxScan: number; userEmail: string; direction: "inbound" | "outbound" },
) {
  const { useLocalPmailFixture, localFixtureListMessages } = await import("./local-pmail-fixture.service.js");
  if (useLocalPmailFixture(credentials)) {
    const list = localFixtureListMessages(credentials, folder, {
      page: 1,
      pageSize: options.maxScan,
      sortBy: "date",
      sortOrder: "desc",
    });
    const userEmail = credentials.email.toLowerCase();
    const messages = list.messages
      .map((message) => {
        const fromEmail = message.from;
        const direction = fromEmail.toLowerCase() === userEmail ? ("outbound" as const) : ("inbound" as const);
        if (options.direction === "inbound" && direction !== "inbound") return null;
        if (options.direction === "outbound" && direction !== "outbound") return null;
        return {
          uid: message.uid,
          subject: message.subject,
          fromEmail,
          toEmails: message.to.split(",").map((entry) => entry.trim()).filter(Boolean),
          date: message.date,
          messageId: null,
          snippet: message.snippet,
          direction,
        };
      })
      .filter((message): message is NonNullable<typeof message> => message !== null);
    return { scannedCount: messages.length, messages };
  }

  return scanFolderMessagesForJobHunter(credentials, folder, options);
}

import { isPmailTesterEmail } from "./pmail-tester.service.js";

/** Scan INBOX/Sent for job-search signals without requiring Job Hunter add-on purchase. */
export async function syncCareerMailSignalsForUser(tenantId: string, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (user && isPmailTesterEmail(user.email)) {
    return { scannedMessages: 0, upsertedApplications: 0, skipped: "pmail_tester" as const };
  }

  const accounts = await prisma.userMailAccount.findMany({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
  });

  let scannedMessages = 0;
  let upsertedApplications = 0;

  for (const account of accounts) {
    const credentials = await getMailCredentialsForAccount(userId, account.id);
    if (!credentials) continue;
    if (process.env.NODE_ENV === "test") continue;

    const folders: Array<{ path: string; direction: "inbound" | "outbound" }> = [
      { path: "INBOX", direction: "inbound" },
      { path: "Sent", direction: "outbound" },
    ];

    for (const folder of folders) {
      let scanResult;
      try {
        scanResult = await scanFolderForCareerSignals(credentials, folder.path, {
          maxScan: maxScan(),
          userEmail: account.email,
          direction: folder.direction,
        });
      } catch {
        continue;
      }

      scannedMessages += scanResult.messages.length;
      for (const message of scanResult.messages) {
        const result = await processCareerMailMessage({
          userId,
          mailAccountId: account.id,
          imapFolder: folder.path,
          message,
        });
        if (result) upsertedApplications += 1;
      }
    }
  }

  await refreshCareerScore(userId);
  return { scannedMessages, upsertedApplications, skipped: null as null };
}

export async function syncJobApplicationsForUser(tenantId: string, userId: string) {
  const entitled = await tenantHasAddonAccess(tenantId, JOB_HUNTER_ADDON_SLUG, userId);
  if (!entitled) {
    return { scannedMessages: 0, upsertedApplications: 0, skipped: "addon" as const };
  }

  const settings = await prisma.userJobHunterSettings.findUnique({ where: { userId } });
  if (!settings?.tierBDisclosureAcceptedAt || !settings.enabled) {
    return { scannedMessages: 0, upsertedApplications: 0, skipped: "consent" as const };
  }

  const accounts = await prisma.userMailAccount.findMany({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
  });

  let scannedMessages = 0;
  let upsertedApplications = 0;

  for (const account of accounts) {
    const canScan = await userCanRunJobHunterScan(tenantId, userId, account.id);
    if (!canScan) continue;

    const credentials = await getMailCredentialsForAccount(userId, account.id);
    if (!credentials || shouldSkipImap(credentials)) continue;

    const folders: Array<{ path: string; direction: "inbound" | "outbound" }> = [
      { path: "INBOX", direction: "inbound" },
      { path: "Sent", direction: "outbound" },
    ];

    for (const folder of folders) {
      let scanResult;
      try {
        scanResult = await scanFolderMessagesForJobHunter(credentials, folder.path, {
          maxScan: maxScan(),
          userEmail: account.email,
          direction: folder.direction,
        });
      } catch {
        continue;
      }

      scannedMessages += scanResult.messages.length;
      for (const message of scanResult.messages) {
        const result = await processCareerMailMessage({
          userId,
          mailAccountId: account.id,
          imapFolder: folder.path,
          message,
        });
        if (result) upsertedApplications += 1;
      }
    }
  }

  await refreshCareerScore(userId);
  return { scannedMessages, upsertedApplications, skipped: null };
}

export async function listJobApplications(
  userId: string,
  input?: { status?: string },
) {
  const rows = await prisma.jobApplication.findMany({
    where: {
      userId,
      ...(input?.status ? { status: input.status } : {}),
    },
    orderBy: { appliedAt: "desc" },
  });
  return rows.map(serializeApplication);
}

export async function getJobApplication(userId: string, id: string) {
  const row = await prisma.jobApplication.findFirst({ where: { id, userId } });
  if (!row) return null;
  return serializeApplication(row);
}

export async function createManualJobApplication(
  userId: string,
  input: {
    company: string;
    roleTitle: string;
    appliedAt?: string;
    status?: JobApplicationStatus;
  },
) {
  const row = await prisma.jobApplication.create({
    data: {
      userId,
      company: input.company.trim(),
      roleTitle: input.roleTitle.trim(),
      appliedAt: input.appliedAt ? new Date(input.appliedAt) : new Date(),
      status: input.status ?? "applied",
      source: "manual",
    },
  });
  await refreshCareerScore(userId);
  return serializeApplication(row);
}

export async function updateJobApplication(
  userId: string,
  id: string,
  input: {
    company?: string;
    roleTitle?: string;
    appliedAt?: string;
    status?: JobApplicationStatus;
  },
) {
  const existing = await prisma.jobApplication.findFirst({ where: { id, userId } });
  if (!existing) return null;

  const row = await prisma.jobApplication.update({
    where: { id },
    data: {
      ...(input.company !== undefined ? { company: input.company.trim() } : {}),
      ...(input.roleTitle !== undefined ? { roleTitle: input.roleTitle.trim() } : {}),
      ...(input.appliedAt !== undefined ? { appliedAt: new Date(input.appliedAt) } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
  });
  await refreshCareerScore(userId);
  return serializeApplication(row);
}

export async function syncAllJobHunterApplications(): Promise<number> {
  const users = await prisma.userJobHunterSettings.findMany({
    where: {
      tierBDisclosureAcceptedAt: { not: null },
      enabled: true,
    },
    select: { userId: true, tenantId: true },
  });

  let processed = 0;
  for (const row of users) {
    try {
      await syncJobApplicationsForUser(row.tenantId, row.userId);
      processed += 1;
    } catch {
      // continue with next user
    }
  }
  return processed;
}
