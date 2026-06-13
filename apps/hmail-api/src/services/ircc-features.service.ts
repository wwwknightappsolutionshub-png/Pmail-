import { prisma } from "../lib/prisma.js";
import { randomBytes } from "node:crypto";
import { logComplianceEvent } from "./compliance.service.js";

const IRCC_SUBJECT_PATTERNS = [
  { pattern: /aor|acknowledgement of receipt/i, classification: "aor", priority: "high" },
  { pattern: /biometric/i, classification: "biometrics", priority: "high" },
  { pattern: /procedural fairness|pfl/i, classification: "pfl", priority: "urgent" },
  { pattern: /refusal|rejected/i, classification: "refusal", priority: "urgent" },
  { pattern: /passport request|ppr/i, classification: "ppr", priority: "high" },
];

const IRCC_SENDER_PATTERN = /cic\.gc\.ca|ircc\.ci\.gc\.ca|canada\.ca/i;

export function classifyIrccMessage(sender: string, subject: string) {
  for (const rule of IRCC_SUBJECT_PATTERNS) {
    if (rule.pattern.test(subject)) {
      return { classification: rule.classification, priority: rule.priority };
    }
  }

  if (IRCC_SENDER_PATTERN.test(sender)) {
    return { classification: "ircc_official", priority: "normal" };
  }

  return { classification: "general", priority: "normal" };
}

export async function classifyAndStoreMessage(
  tenantId: string,
  folder: string,
  messageUid: number,
  sender: string,
  subject: string,
) {
  const { classification, priority } = classifyIrccMessage(sender, subject);

  const row = await prisma.irccMailClassification.upsert({
    where: { tenantId_folder_messageUid: { tenantId, folder, messageUid } },
    create: { tenantId, folder, messageUid, classification, priority, sender, subject },
    update: { classification, priority, sender, subject },
  });

  return {
    id: row.id,
    folder: row.folder,
    messageUid: row.messageUid,
    classification: row.classification,
    priority: row.priority,
    sender: row.sender,
    subject: row.subject,
  };
}

export async function listIrccClassifications(tenantId: string, priority?: string) {
  const rows = await prisma.irccMailClassification.findMany({
    where: {
      tenantId,
      ...(priority ? { priority } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return rows.map((r) => ({
    id: r.id,
    folder: r.folder,
    messageUid: r.messageUid,
    classification: r.classification,
    priority: r.priority,
    sender: r.sender,
    subject: r.subject,
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function linkMailToMatter(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: { matterId: string; folder: string; messageUid: number; subject?: string },
) {
  const matter = await prisma.matter.findFirst({
    where: { id: input.matterId, tenantId },
  });
  if (!matter) throw new Error("Matter not found");

  const link = await prisma.mailMatterLink.upsert({
    where: {
      tenantId_folder_messageUid: {
        tenantId,
        folder: input.folder,
        messageUid: input.messageUid,
      },
    },
    create: {
      tenantId,
      matterId: input.matterId,
      folder: input.folder,
      messageUid: input.messageUid,
      subject: input.subject,
    },
    update: { matterId: input.matterId, subject: input.subject },
    include: { matter: { include: { client: true } } },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "mail.linked_to_matter",
    entityType: "mail_link",
    entityId: link.id,
    metadata: { matterId: input.matterId, folder: input.folder, messageUid: input.messageUid },
  });

  return formatMailLink(link);
}

export async function listMailLinks(tenantId: string, matterId?: string, search?: string) {
  const links = await prisma.mailMatterLink.findMany({
    where: {
      tenantId,
      ...(matterId ? { matterId } : {}),
      ...(search
        ? {
            matter: {
              OR: [
                { uci: { contains: search } },
                { title: { contains: search } },
                { client: { lastName: { contains: search } } },
              ],
            },
          }
        : {}),
    },
    include: { matter: { include: { client: true } } },
    orderBy: { linkedAt: "desc" },
    take: 100,
  });

  return links.map(formatMailLink);
}

export async function listDeadlines(tenantId: string, status?: string) {
  const rows = await prisma.matterDeadline.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
    },
    include: { matter: { include: { client: true } } },
    orderBy: { dueAt: "asc" },
    take: 100,
  });

  return rows.map((r) => ({
    id: r.id,
    matterId: r.matterId,
    matterTitle: r.matter.title,
    clientName: `${r.matter.client.firstName} ${r.matter.client.lastName}`,
    uci: r.matter.uci,
    title: r.title,
    dueAt: r.dueAt.toISOString(),
    status: r.status,
    source: r.source,
  }));
}

export async function createDeadline(
  tenantId: string,
  userId: string,
  userEmail: string,
  input: { matterId: string; title: string; dueAt: string; source?: string },
) {
  const matter = await prisma.matter.findFirst({ where: { id: input.matterId, tenantId } });
  if (!matter) throw new Error("Matter not found");

  const dueAt = new Date(input.dueAt);
  if (Number.isNaN(dueAt.getTime())) throw new Error("Invalid due date");

  const row = await prisma.matterDeadline.create({
    data: {
      tenantId,
      matterId: input.matterId,
      title: input.title.trim(),
      dueAt,
      source: input.source ?? "manual",
    },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "deadline.created",
    entityType: "deadline",
    entityId: row.id,
    metadata: { dueAt: row.dueAt.toISOString() },
  });

  return {
    id: row.id,
    title: row.title,
    dueAt: row.dueAt.toISOString(),
    status: row.status,
  };
}

export async function createPortalAccess(
  tenantId: string,
  userId: string,
  userEmail: string,
  matterId: string,
) {
  const matter = await prisma.matter.findFirst({ where: { id: matterId, tenantId } });
  if (!matter) throw new Error("Matter not found");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  const token = randomBytes(24).toString("hex");

  const access = await prisma.portalAccess.create({
    data: { tenantId, matterId, token, expiresAt, isActive: true },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "portal.access_created",
    entityType: "portal_access",
    entityId: access.id,
    metadata: { matterId },
  });

  const origin = process.env.CORS_ORIGIN ?? "http://localhost:5173";
  return {
    id: access.id,
    matterId,
    portalUrl: `${origin}/portal/${token}`,
    expiresAt: access.expiresAt.toISOString(),
  };
}

export async function listPortalDocuments(tenantId: string, matterId: string) {
  const matter = await prisma.matter.findFirst({ where: { id: matterId, tenantId } });
  if (!matter) throw new Error("Matter not found");

  const docs = await prisma.portalDocumentRequest.findMany({
    where: { tenantId, matterId },
    orderBy: { createdAt: "desc" },
  });

  return docs.map((d) => ({
    id: d.id,
    label: d.label,
    status: d.status,
    uploadedAt: d.uploadedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
  }));
}

export async function createPortalDocumentRequest(
  tenantId: string,
  userId: string,
  userEmail: string,
  matterId: string,
  label: string,
) {
  const matter = await prisma.matter.findFirst({ where: { id: matterId, tenantId } });
  if (!matter) throw new Error("Matter not found");

  const doc = await prisma.portalDocumentRequest.create({
    data: { tenantId, matterId, label: label.trim(), status: "requested" },
  });

  await logComplianceEvent({
    tenantId,
    userId,
    userEmail,
    action: "portal.document_requested",
    entityType: "portal_document",
    entityId: doc.id,
    metadata: { label: doc.label },
  });

  return {
    id: doc.id,
    label: doc.label,
    status: doc.status,
  };
}

function formatMailLink(link: {
  id: string;
  folder: string;
  messageUid: number;
  subject: string | null;
  linkedAt: Date;
  matter: {
    id: string;
    title: string;
    uci: string | null;
    client: { firstName: string; lastName: string };
  };
}) {
  return {
    id: link.id,
    folder: link.folder,
    messageUid: link.messageUid,
    subject: link.subject,
    linkedAt: link.linkedAt.toISOString(),
    matter: {
      id: link.matter.id,
      title: link.matter.title,
      uci: link.matter.uci,
      clientName: `${link.matter.client.firstName} ${link.matter.client.lastName}`,
    },
  };
}
