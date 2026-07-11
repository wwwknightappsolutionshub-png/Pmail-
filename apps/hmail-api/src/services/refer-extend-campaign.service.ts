import nodemailer from "nodemailer";
import { prisma } from "../lib/prisma.js";
import { getEnv } from "../config/env.js";
import { getPrimaryWebOrigin } from "../lib/web-origin.js";
import { PMAIL_REFER_FRIEND_URL } from "../data/email-cta-urls.js";
import { emailBtn, emailFeature, emailMuted, wrapBrandedEmail } from "../data/email-brand-shell.js";
import { renderEmailTemplate } from "./email-template.service.js";
import {
  isPanelWorkspaceWelcomeTrialActive,
  panelWorkspaceTrialEndsAt,
} from "./panel-workspace-trial.service.js";
import { createTrackingToken, injectTrackingPixel, isTrackableHref } from "./tracking.service.js";

export const PMAIL_REFER_AND_EXTEND_TEMPLATE_SLUG = "pmail-refer-and-extend";
export const REFER_EXTEND_INTERVAL_HOURS = 48;

const HREF_ATTR_RE = /(<a\b[^>]*\bhref\s*=\s*)(["'])([^"']+)\2/gi;

export type ReferExtendStopReason = "email_cta_clicked" | "refer_friend_clicked";

function resolveApiPublicBase(): string {
  return process.env.API_PUBLIC_URL?.trim() || getPrimaryWebOrigin() || "http://localhost:4000";
}

function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function brandedFallback(fullName: string, ctaUrl: string): { subject: string; text: string; html: string } {
  const subject = "Your free addon trial ended — refer a friend to unlock 7 more days";
  const text = `Hi ${fullName},

Your complimentary PMail+ addon trial period has just ended.

Refer a friend to reactivate 7 free days of Platform tools:
- Unified email accounts
- Mail auto categorization by sender
- Dedicated file directory
- Open Tracking
- Auto Reply
- Auto Contacts Directory
- File Vaults
- Career Huntr

Refer & Extend Trial: ${ctaUrl}`;

  const html = wrapBrandedEmail({
    brandName: "PMail+",
    brandTag: "Mail workspace",
    headline: "Your free trial ended — refer a friend to unlock 7 more days",
    subhead: "Reactivate Platform tools by sharing PMail+ with someone who will value the upgrade",
    bodyHtml: `
<p>Hi <strong>${fullName}</strong>,</p>
<p>Your complimentary <strong>PMail+ addon trial</strong> has just ended. Refer a friend and we reactivate <strong>7 free days</strong> of Platform tools.</p>
${emailFeature("Unified email accounts", "Connect and switch between multiple mailboxes in one focused workspace.")}
${emailFeature("Mail auto categorization by sender", "Tame high-volume senders and keep important threads visible.")}
${emailFeature("Dedicated file directory", "Keep project files organized beside the conversations that need them.")}
${emailFeature("Open Tracking", "See when recipients open critical messages so you can follow up with confidence.")}
${emailFeature("Auto Reply", "Acknowledge inbound mail professionally while you stay focused on higher-value work.")}
${emailFeature("Auto Contacts Directory", "Grow a living address book from real mailbox traffic — not manual data entry.")}
${emailFeature("File Vaults", "Share large files securely with tracked download links instead of fragile attachments.")}
${emailFeature("Career Huntr", "Track applications, roles, and career outreach from the same mail workspace.")}
<p>${emailBtn(ctaUrl, "Refer &amp; Extend Trial")}</p>
${emailMuted("This reminder repeats every 48 hours until you use Refer a friend or click the button above.")}`,
  });

  return { subject, text, html };
}

async function wrapReferExtendLinks(html: string, sendId: string, apiBase: string): Promise<string> {
  const urlToToken = new Map<string, string>();
  const hrefRe = new RegExp(HREF_ATTR_RE.source, HREF_ATTR_RE.flags);
  let match: RegExpExecArray | null;
  const replacements: Array<{ from: string; to: string }> = [];

  while ((match = hrefRe.exec(html)) !== null) {
    const href = match[3];
    if (!isTrackableHref(href) || urlToToken.has(href)) continue;
    const clickToken = createTrackingToken();
    urlToToken.set(href, clickToken);
    await prisma.referExtendEmailClick.create({
      data: { sendId, clickToken, url: href },
    });
    const tracked = `${apiBase.replace(/\/$/, "")}/api/public/refer-extend/click/${clickToken}`;
    replacements.push({ from: match[0], to: `${match[1]}${match[2]}${tracked}${match[2]}` });
  }

  let output = html;
  for (const { from, to } of replacements) {
    output = output.replace(from, to);
  }
  return output;
}

/** Enroll (or re-enroll) a user after a complimentary free addon trial expires. */
export async function enrollUserInReferExtendCampaign(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true, prospectDemoExpiresAt: true },
  });
  if (!user || !user.isActive || user.prospectDemoExpiresAt) return;

  const now = new Date();
  const existing = await prisma.userReferExtendCampaign.findUnique({ where: { userId } });
  if (existing?.status === "active") {
    if (!existing.nextEligibleAt || existing.nextEligibleAt.getTime() > now.getTime() + REFER_EXTEND_INTERVAL_HOURS * 60 * 60 * 1000) {
      await prisma.userReferExtendCampaign.update({
        where: { userId },
        data: { nextEligibleAt: existing.nextEligibleAt && existing.nextEligibleAt > now ? existing.nextEligibleAt : now },
      });
    }
    return;
  }

  await prisma.userReferExtendCampaign.upsert({
    where: { userId },
    create: {
      userId,
      status: "active",
      startedAt: now,
      nextEligibleAt: now,
      sendCount: 0,
      stopReason: null,
      stoppedAt: null,
      lastSentAt: null,
    },
    update: {
      status: "active",
      startedAt: now,
      nextEligibleAt: now,
      stopReason: null,
      stoppedAt: null,
    },
  });
}

export async function enrollTenantUsersInReferExtendCampaign(tenantId: string): Promise<void> {
  const users = await prisma.user.findMany({
    where: { tenantId, isActive: true },
    select: { id: true },
  });
  for (const user of users) {
    await enrollUserInReferExtendCampaign(user.id);
  }
}

export async function markReferExtendCampaignStopped(
  userId: string,
  reason: ReferExtendStopReason,
): Promise<void> {
  const existing = await prisma.userReferExtendCampaign.findUnique({ where: { userId } });
  if (!existing || existing.status === "stopped") return;

  await prisma.userReferExtendCampaign.update({
    where: { userId },
    data: {
      status: "stopped",
      stoppedAt: new Date(),
      stopReason: reason,
      nextEligibleAt: null,
    },
  });
}

async function sendReferExtendEmail(input: {
  userId: string;
  tenantId: string;
  userEmail: string;
  fullName: string;
}): Promise<boolean> {
  const env = getEnv();
  const apiBase = resolveApiPublicBase();
  const ctaUrl = PMAIL_REFER_FRIEND_URL;
  const fullName = input.fullName.trim() || input.userEmail.split("@")[0] || "there";

  let content: { subject: string; text: string; html: string };
  try {
    const rendered = await renderEmailTemplate(PMAIL_REFER_AND_EXTEND_TEMPLATE_SLUG, {
      fullName,
      productName: "PMail+",
      ctaUrl,
      referFriendUrl: ctaUrl,
    });
    content = {
      subject: rendered.subject,
      text: rendered.text?.trim() || rendered.subject,
      html: rendered.html,
    };
  } catch {
    content = brandedFallback(fullName, ctaUrl);
  }

  const trackingToken = createTrackingToken();
  const pixelUrl = `${apiBase.replace(/\/$/, "")}/api/public/refer-extend/track/${trackingToken}.gif`;

  const send = await prisma.referExtendEmailSend.create({
    data: {
      userId: input.userId,
      tenantId: input.tenantId,
      userEmail: input.userEmail,
      templateSlug: PMAIL_REFER_AND_EXTEND_TEMPLATE_SLUG,
      trackingToken,
      status: "sent",
    },
  });

  let html = injectTrackingPixel(content.html, pixelUrl);
  html = await wrapReferExtendLinks(html, send.id, apiBase);

  const from = process.env.NURTURE_SMTP_FROM ?? "noreply@hmail.local";
  const host = process.env.NURTURE_SMTP_HOST;
  if (host) {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.NURTURE_SMTP_PORT ?? 587),
      secure: process.env.NURTURE_SMTP_SECURE === "true",
      requireTLS: process.env.NURTURE_SMTP_SECURE !== "true" && Number(process.env.NURTURE_SMTP_PORT ?? 587) === 587,
      auth: process.env.NURTURE_SMTP_USER
        ? {
            user: process.env.NURTURE_SMTP_USER,
            pass: process.env.NURTURE_SMTP_PASS ?? "",
          }
        : undefined,
    });

    try {
      await transporter.sendMail({
        from,
        to: input.userEmail,
        subject: content.subject,
        text: content.text,
        html,
      });
    } catch (err) {
      console.error("[refer-extend] nurture SMTP send failed", err);
      await prisma.referExtendEmailSend.update({
        where: { id: send.id },
        data: { status: "failed" },
      });
      return false;
    }
  } else if (env.NODE_ENV === "development") {
    console.info(`[refer-extend] → ${input.userEmail}: ${content.subject}`);
  }

  const now = new Date();
  await prisma.userReferExtendCampaign.update({
    where: { userId: input.userId },
    data: {
      lastSentAt: now,
      nextEligibleAt: hoursFromNow(REFER_EXTEND_INTERVAL_HOURS),
      sendCount: { increment: 1 },
    },
  });

  return true;
}

async function enrollExpiredPanelWorkspaceTrials(now: Date): Promise<void> {
  const candidates = await prisma.user.findMany({
    where: {
      isActive: true,
      panelWorkspaceTrialStartedAt: { not: null },
      prospectDemoExpiresAt: null,
      // Never auto-reopen a campaign the user already stopped (CTA or Refer a friend).
      // Fresh enrollment after a later trial expiry goes through enrollTenantUsersInReferExtendCampaign.
      referExtendCampaign: null,
    },
    select: {
      id: true,
      panelWorkspaceTrialStartedAt: true,
    },
  });

  for (const user of candidates) {
    const startedAt = user.panelWorkspaceTrialStartedAt;
    if (!startedAt) continue;
    if (isPanelWorkspaceWelcomeTrialActive(startedAt, now)) continue;
    const endsAt = panelWorkspaceTrialEndsAt(startedAt);
    // Only enroll once the trial has ended (and within a sane window after expiry so we don't revive ancient accounts forever).
    const daysSinceEnd = (now.getTime() - endsAt.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceEnd < 0 || daysSinceEnd > 90) continue;
    await enrollUserInReferExtendCampaign(user.id);
  }
}

export async function processReferExtendCampaignEmails(): Promise<number> {
  const now = new Date();
  await enrollExpiredPanelWorkspaceTrials(now);

  const campaigns = await prisma.userReferExtendCampaign.findMany({
    where: {
      status: "active",
      OR: [{ nextEligibleAt: null }, { nextEligibleAt: { lte: now } }],
      user: { isActive: true, prospectDemoExpiresAt: null },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
          tenantId: true,
        },
      },
    },
  });

  let sent = 0;
  for (const campaign of campaigns) {
    const ok = await sendReferExtendEmail({
      userId: campaign.user.id,
      tenantId: campaign.user.tenantId,
      userEmail: campaign.user.email,
      fullName: campaign.user.displayName?.trim() || campaign.user.email.split("@")[0] || "there",
    });
    if (ok) sent += 1;
  }
  return sent;
}

export async function recordReferExtendOpen(trackingToken: string): Promise<void> {
  const send = await prisma.referExtendEmailSend.findUnique({ where: { trackingToken } });
  if (!send || send.readAt) return;
  await prisma.referExtendEmailSend.update({
    where: { id: send.id },
    data: { readAt: new Date() },
  });
}

export async function recordReferExtendClick(clickToken: string): Promise<string | null> {
  const click = await prisma.referExtendEmailClick.findUnique({
    where: { clickToken },
    include: { send: true },
  });
  if (!click) return null;

  if (!click.clickedAt) {
    await prisma.referExtendEmailClick.update({
      where: { id: click.id },
      data: { clickedAt: new Date() },
    });
  }
  if (!click.send.readAt) {
    await prisma.referExtendEmailSend.update({
      where: { id: click.send.id },
      data: { readAt: new Date() },
    });
  }

  await markReferExtendCampaignStopped(click.send.userId, "email_cta_clicked");
  return click.url || PMAIL_REFER_FRIEND_URL;
}
