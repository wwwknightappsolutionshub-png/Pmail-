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

export function buildLinkClickUrl(clickToken: string, apiPublicBase: string): string {
  const base = apiPublicBase.replace(/\/$/, "");
  return `${base}/api/public/track/link/${clickToken}`;
}

const HREF_ATTR_RE = /(<a\b[^>]*\shref\s*=\s*)(["'])(.*?)\2/gi;

export function isTrackableHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return false;
  }
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:") ||
    lower.startsWith("javascript:") ||
    lower.startsWith("data:")
  ) {
    return false;
  }
  if (lower.includes("/api/public/track/")) {
    return false;
  }
  return /^https?:\/\//i.test(trimmed);
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

export async function wrapTrackedLinksInHtml(
  html: string,
  sentTrackingId: string,
  apiPublicBase: string,
): Promise<string> {
  const urlToToken = new Map<string, string>();
  const hrefRe = new RegExp(HREF_ATTR_RE.source, HREF_ATTR_RE.flags);
  let match: RegExpExecArray | null;
  let linkOrder = 0;

  while ((match = hrefRe.exec(html)) !== null) {
    const href = match[3];
    if (!isTrackableHref(href) || urlToToken.has(href)) {
      continue;
    }
    const clickToken = createTrackingToken();
    await prisma.trackedEmailLink.create({
      data: {
        sentMessageTrackingId: sentTrackingId,
        originalUrl: href,
        clickToken,
        linkOrder: linkOrder++,
      },
    });
    urlToToken.set(href, clickToken);
  }

  if (urlToToken.size === 0) {
    return html;
  }

  return html.replace(new RegExp(HREF_ATTR_RE.source, HREF_ATTR_RE.flags), (full, prefix, quote, href) => {
    const token = urlToToken.get(href);
    if (!token) {
      return full;
    }
    const trackUrl = buildLinkClickUrl(token, apiPublicBase);
    return `${prefix}${quote}${trackUrl}${quote}`;
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

export async function recordLinkClick(clickToken: string): Promise<string | null> {
  const row = await prisma.trackedEmailLink.findUnique({ where: { clickToken } });
  if (!row) {
    return null;
  }
  const now = new Date();
  await prisma.trackedEmailLink.update({
    where: { id: row.id },
    data: {
      clickCount: row.clickCount + 1,
      firstClickedAt: row.firstClickedAt ?? now,
      lastClickedAt: now,
    },
  });
  if (!isTrackableHref(row.originalUrl)) {
    return null;
  }
  return row.originalUrl;
}

function serializeLink(link: {
  id: string;
  originalUrl: string;
  clickCount: number;
  firstClickedAt: Date | null;
  lastClickedAt: Date | null;
  linkOrder: number;
}) {
  return {
    id: link.id,
    originalUrl: link.originalUrl,
    clickCount: link.clickCount,
    firstClickedAt: link.firstClickedAt?.toISOString() ?? null,
    lastClickedAt: link.lastClickedAt?.toISOString() ?? null,
    linkOrder: link.linkOrder,
  };
}

function summarizeLinks(links: Array<{ clickCount: number }>) {
  return {
    linkCount: links.length,
    totalLinkClicks: links.reduce((sum, link) => sum + link.clickCount, 0),
  };
}

export async function listSentTracking(userId: string) {
  const rows = await prisma.sentMessageTracking.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      links: {
        select: { clickCount: true },
      },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    toEmail: row.toEmail,
    subject: row.subject,
    openCount: row.openCount,
    firstOpenedAt: row.firstOpenedAt?.toISOString() ?? null,
    lastOpenedAt: row.lastOpenedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    ...summarizeLinks(row.links),
  }));
}

export async function getTrackingById(userId: string, id: string) {
  const row = await prisma.sentMessageTracking.findFirst({
    where: { id, userId },
    include: {
      links: {
        orderBy: { linkOrder: "asc" },
      },
    },
  });
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    toEmail: row.toEmail,
    subject: row.subject,
    openCount: row.openCount,
    firstOpenedAt: row.firstOpenedAt?.toISOString() ?? null,
    lastOpenedAt: row.lastOpenedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    ...summarizeLinks(row.links),
    links: row.links.map(serializeLink),
  };
}
