import { randomBytes } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { markReferralLeadReadByTrackingToken } from "./referral-lead.service.js";

export function createTrackingToken(): string {
  return randomBytes(18).toString("hex");
}

export function buildTrackingPixelUrl(token: string, apiPublicBase: string): string {
  const base = apiPublicBase.replace(/\/$/, "");
  return `${base}/api/public/track/${token}.gif`;
}

export function injectTrackingPixel(html: string, pixelUrl: string): string {
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none" />`;
  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixel}</body>`);
  }
  return `${html}${pixel}`;
}

export async function createSentTracking(
  userId: string,
  input: { toEmail: string; subject: string; smtpMessageId?: string },
) {
  const trackingToken = createTrackingToken();
  return prisma.sentMessageTracking.create({
    data: {
      userId,
      toEmail: input.toEmail.trim().toLowerCase(),
      subject: input.subject.trim(),
      smtpMessageId: input.smtpMessageId || null,
      trackingToken,
    },
  });
}

export async function recordTrackingOpen(token: string) {
  const row = await prisma.sentMessageTracking.findUnique({ where: { trackingToken: token } });
  if (!row) {
    await markReferralLeadReadByTrackingToken(token);
    return null;
  }
  const now = new Date();
  const updated = await prisma.sentMessageTracking.update({
    where: { id: row.id },
    data: {
      openCount: row.openCount + 1,
      firstOpenedAt: row.firstOpenedAt ?? now,
      lastOpenedAt: now,
    },
  });
  await markReferralLeadReadByTrackingToken(token);
  return updated;
}

export async function listSentTracking(userId: string) {
  const rows = await prisma.sentMessageTracking.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((row) => ({
    id: row.id,
    toEmail: row.toEmail,
    subject: row.subject,
    openCount: row.openCount,
    firstOpenedAt: row.firstOpenedAt?.toISOString() ?? null,
    lastOpenedAt: row.lastOpenedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getTrackingById(userId: string, id: string) {
  const row = await prisma.sentMessageTracking.findFirst({ where: { id, userId } });
  if (!row) return null;
  return {
    id: row.id,
    toEmail: row.toEmail,
    subject: row.subject,
    openCount: row.openCount,
    firstOpenedAt: row.firstOpenedAt?.toISOString() ?? null,
    lastOpenedAt: row.lastOpenedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
