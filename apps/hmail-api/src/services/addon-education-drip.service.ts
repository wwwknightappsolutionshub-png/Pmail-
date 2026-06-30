import nodemailer from "nodemailer";
import { getEnv } from "../config/env.js";
import {
  ADDON_EDUCATION_TEMPLATE_SEEDS,
  DEFAULT_PANEL_CAMPAIGN_STEPS,
  DEFAULT_VERTICAL_CAMPAIGN_STEPS,
  PMAil_EDUCATION_SIGNATURE_HTML,
  getPanelBenefitsList,
  getPanelUseCase,
} from "../data/addon-education-campaign-seeds.js";
import { ADDON_VERTICAL_LABELS, type AddonVertical } from "../data/addon-verticals.js";
import { getCatalogEntry } from "../data/addon-catalog.js";
import { classifyMailboxDomain } from "../lib/job-hunter.js";
import { prisma } from "../lib/prisma.js";
import { createTrackingToken, injectTrackingPixel, isTrackableHref } from "./tracking.service.js";
import { renderEmailTemplate } from "./email-template.service.js";

export type AddonEducationCampaignType = "panel" | "vertical";

const HREF_ATTR_RE = /(<a\b[^>]*\shref\s*=\s*)(["'])(.*?)\2/gi;

function resolveMarketplaceUrl(): string {
  return `${process.env.CORS_ORIGIN?.split(",")[0]?.trim() ?? "http://localhost:5173"}/addons`;
}

function resolveApiPublicBase(): string {
  return process.env.API_PUBLIC_URL?.trim() || process.env.CORS_ORIGIN?.split(",")[0]?.trim() || "http://localhost:4000";
}

function resolveOptOutUrl(): string {
  const base = process.env.CORS_ORIGIN?.split(",")[0]?.trim() ?? "http://localhost:5173";
  return `${base}/addons?education-opt-out=1`;
}

function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export async function seedAddonEducationTemplates(): Promise<void> {
  for (const seed of ADDON_EDUCATION_TEMPLATE_SEEDS) {
    await prisma.emailTemplate.upsert({
      where: { slug: seed.slug },
      create: {
        slug: seed.slug,
        name: seed.name,
        category: seed.category,
        subject: seed.subject,
        htmlBody: seed.htmlBody,
        textBody: seed.textBody,
        variablesJson: JSON.stringify(seed.variables),
        isActive: true,
      },
      update: {},
    });
  }
}

export async function seedAddonEducationCampaignSteps(): Promise<void> {
  for (const step of [...DEFAULT_PANEL_CAMPAIGN_STEPS, ...DEFAULT_VERTICAL_CAMPAIGN_STEPS]) {
    await prisma.addonEducationCampaignStep.upsert({
      where: { campaignType_stepKey: { campaignType: step.campaignType, stepKey: step.stepKey } },
      create: {
        campaignType: step.campaignType,
        stepKey: step.stepKey,
        templateSlug: step.templateSlug,
        sortOrder: step.sortOrder,
      },
      update: {},
    });
  }
}

export async function hasWelcomeFinished(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      pmailAccountWelcomeEmailSent: true,
      pmailProspects: { select: { demoWelcomeEmailSent: true } },
    },
  });
  if (!user) return false;
  if (user.pmailAccountWelcomeEmailSent) return true;
  return user.pmailProspects.some((p) => p.demoWelcomeEmailSent);
}

export async function enrollUserInAddonEducation(userId: string): Promise<void> {
  await activateAddonEducationAfterWelcome(userId);
}

export async function activateAddonEducationAfterWelcome(userId: string): Promise<void> {
  const now = new Date();
  await prisma.userAddonEducationState.upsert({
    where: { userId },
    create: {
      userId,
      enrolledAt: now,
      panelStatus: "active",
      panelNextEligibleAt: now,
      verticalStatus: "active",
      verticalNextEligibleAt: now,
    },
    update: {
      panelStatus: "active",
      panelNextEligibleAt: now,
      verticalStatus: "active",
      verticalNextEligibleAt: now,
      enrolledAt: now,
    },
  });
}

async function isUserBlocked(userId: string, tenantId: string): Promise<boolean> {
  const [state, tenant] = await Promise.all([
    prisma.userAddonEducationState.findUnique({ where: { userId } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { addonEducationSuppressed: true } }),
  ]);
  if (tenant?.addonEducationSuppressed) return true;
  if (!state) return false;
  return state.addonEducationOptOut || state.addonEducationSuppressed;
}

async function getActiveSteps(campaignType: AddonEducationCampaignType) {
  return prisma.addonEducationCampaignStep.findMany({
    where: { campaignType, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

function resolveVerticalStepKey(input: {
  email: string;
  businessVertical: string | null;
}): string {
  const domainKind = classifyMailboxDomain(input.email);
  if (domainKind === "personal") return "generic";
  const vertical = input.businessVertical?.trim();
  if (vertical && vertical in ADDON_VERTICAL_LABELS) return vertical;
  return "generic";
}

async function wrapEducationLinks(html: string, sendId: string, apiBase: string): Promise<string> {
  const urlToToken = new Map<string, string>();
  const hrefRe = new RegExp(HREF_ATTR_RE.source, HREF_ATTR_RE.flags);
  let match: RegExpExecArray | null;
  const replacements: Array<{ from: string; to: string }> = [];

  while ((match = hrefRe.exec(html)) !== null) {
    const href = match[3];
    if (!isTrackableHref(href) || urlToToken.has(href)) continue;
    const clickToken = createTrackingToken();
    urlToToken.set(href, clickToken);
    await prisma.addonEducationEmailClick.create({
      data: { sendId, clickToken, url: href },
    });
    const tracked = `${apiBase.replace(/\/$/, "")}/api/public/education/click/${clickToken}`;
    replacements.push({ from: match[0], to: `${match[1]}${match[2]}${tracked}${match[2]}` });
  }

  let output = html;
  for (const { from, to } of replacements) {
    output = output.replace(from, to);
  }
  return output;
}

async function sendEducationEmail(input: {
  userId: string;
  tenantId: string;
  userEmail: string;
  fullName: string;
  campaignType: AddonEducationCampaignType;
  stepKey: string;
  templateSlug: string;
  resendCount: number;
}): Promise<void> {
  const env = getEnv();
  const apiBase = resolveApiPublicBase();
  const marketplaceUrl = resolveMarketplaceUrl();
  const entry = getCatalogEntry(input.stepKey);
  const addonName = entry?.name ?? input.stepKey;
  const verticalKey = input.stepKey;
  const verticalLabel =
    verticalKey === "generic"
      ? "Industry workspace add-ons"
      : (ADDON_VERTICAL_LABELS[verticalKey as AddonVertical] ?? verticalKey);

  const variables: Record<string, string> = {
    fullName: input.fullName,
    productName: "PMail+",
    addonName,
    addonDescription: entry?.description ?? "",
    benefitsList: getPanelBenefitsList(input.stepKey).replace(/\n/g, "<br/>"),
    useCase: getPanelUseCase(input.stepKey),
    ctaUrl: `${marketplaceUrl}?highlight=${encodeURIComponent(input.stepKey)}`,
    verticalCtaUrl: `${marketplaceUrl}?highlight=${encodeURIComponent(verticalKey === "generic" ? "bespoke-workspace" : verticalKey)}`,
    verticalLabel,
    verticalDescription: `Your mailbox runs on a custom domain — PMail+ can extend your inbox with purpose-built tools for ${verticalLabel.toLowerCase()}.`,
    productListHtml: "",
    signatureHtml: PMAil_EDUCATION_SIGNATURE_HTML,
    optOutUrl: resolveOptOutUrl(),
  };

  const rendered = await renderEmailTemplate(input.templateSlug, variables);
  const trackingToken = createTrackingToken();
  const pixelUrl = `${apiBase.replace(/\/$/, "")}/api/public/education/track/${trackingToken}.gif`;

  const send = await prisma.addonEducationEmailSend.create({
    data: {
      userId: input.userId,
      tenantId: input.tenantId,
      userEmail: input.userEmail,
      campaignType: input.campaignType,
      stepKey: input.stepKey,
      templateSlug: input.templateSlug,
      trackingToken,
      resendCount: input.resendCount,
      status: "sent",
    },
  });

  let html = injectTrackingPixel(rendered.html, pixelUrl);
  html = await wrapEducationLinks(html, send.id, apiBase);

  const from = process.env.NURTURE_SMTP_FROM ?? "noreply@hmail.local";
  const host = process.env.NURTURE_SMTP_HOST;
  if (host) {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.NURTURE_SMTP_PORT ?? 587),
      secure: process.env.NURTURE_SMTP_SECURE === "true",
      requireTLS: process.env.NURTURE_SMTP_SECURE !== "true" && Number(process.env.NURTURE_SMTP_PORT ?? 587) === 587,
      auth: process.env.NURTURE_SMTP_USER
        ? { user: process.env.NURTURE_SMTP_USER, pass: process.env.NURTURE_SMTP_PASS ?? "" }
        : undefined,
    });
    await transporter.sendMail({
      from,
      to: input.userEmail,
      subject: rendered.subject,
      text: rendered.text?.trim() || rendered.subject,
      html,
    });
  } else if (env.NODE_ENV === "development") {
    console.info(`[addon-education] ${input.campaignType}/${input.stepKey} → ${input.userEmail}`);
  }
}

async function latestSend(userId: string, campaignType: AddonEducationCampaignType, stepKey: string) {
  return prisma.addonEducationEmailSend.findFirst({
    where: { userId, campaignType, stepKey, status: { not: "skipped" } },
    orderBy: { sentAt: "desc" },
  });
}

async function markSendRead(sendId: string, readAt = new Date()): Promise<void> {
  const send = await prisma.addonEducationEmailSend.update({
    where: { id: sendId },
    data: { readAt, status: "read" },
  });

  const state = await prisma.userAddonEducationState.findUnique({ where: { userId: send.userId } });
  if (!state) return;

  const step = await prisma.addonEducationCampaignStep.findFirst({
    where: { campaignType: send.campaignType, stepKey: send.stepKey },
  });
  const intervalHours = step?.intervalHours ?? 48;

  if (send.campaignType === "panel") {
    const steps = await getActiveSteps("panel");
    const nextIndex = state.panelStepIndex + 1;
    await prisma.userAddonEducationState.update({
      where: { userId: send.userId },
      data: {
        panelStatus: nextIndex >= steps.length ? "completed" : "active",
        panelStepIndex: nextIndex,
        panelPausedStepKey: null,
        panelNextEligibleAt: nextIndex >= steps.length ? null : hoursFromNow(intervalHours),
      },
    });
    return;
  }

  await prisma.userAddonEducationState.update({
    where: { userId: send.userId },
    data: {
      verticalStatus: "completed",
      verticalCompletedAt: readAt,
      verticalStepKey: send.stepKey,
      verticalNextEligibleAt: null,
    },
  });
}

export async function recordAddonEducationOpen(trackingToken: string): Promise<void> {
  const send = await prisma.addonEducationEmailSend.findUnique({ where: { trackingToken } });
  if (!send || send.readAt) return;
  await markSendRead(send.id);
}

export async function recordAddonEducationClick(clickToken: string): Promise<string | null> {
  const click = await prisma.addonEducationEmailClick.findUnique({
    where: { clickToken },
    include: { send: true },
  });
  if (!click) return null;
  if (!click.clickedAt) {
    await prisma.addonEducationEmailClick.update({
      where: { id: click.id },
      data: { clickedAt: new Date() },
    });
  }
  if (!click.send.readAt) {
    await markSendRead(click.send.id);
  }
  return click.url;
}

async function processCampaignTrack(input: {
  userId: string;
  tenantId: string;
  userEmail: string;
  fullName: string;
  businessVertical: string | null;
  campaignType: AddonEducationCampaignType;
}): Promise<void> {
  if (await isUserBlocked(input.userId, input.tenantId)) return;

  const state = await prisma.userAddonEducationState.findUnique({ where: { userId: input.userId } });
  if (!state || state.addonEducationOptOut || state.addonEducationSuppressed) return;

  const now = new Date();
  const steps = await getActiveSteps(input.campaignType);
  if (steps.length === 0) return;

  if (input.campaignType === "panel") {
    if (state.panelStatus === "completed" || state.panelStatus === "pending_welcome") return;

    if (state.panelStatus === "paused_unread" && state.panelPausedStepKey) {
      const step = steps.find((s) => s.stepKey === state.panelPausedStepKey) ?? steps[state.panelStepIndex];
      if (!step) return;
      const last = await latestSend(input.userId, "panel", step.stepKey);
      if (!last || last.readAt) {
        await prisma.userAddonEducationState.update({
          where: { userId: input.userId },
          data: { panelStatus: "active", panelPausedStepKey: null },
        });
        return;
      }
      const resendDue = last.sentAt.getTime() + step.resendIntervalHours * 60 * 60 * 1000 <= now.getTime();
      if (!resendDue) return;
      if (last.resendCount >= step.maxResends) {
        const nextIndex = state.panelStepIndex + 1;
        await prisma.userAddonEducationState.update({
          where: { userId: input.userId },
          data: {
            panelStepIndex: nextIndex,
            panelStatus: nextIndex >= steps.length ? "completed" : "active",
            panelPausedStepKey: null,
            panelNextEligibleAt: nextIndex >= steps.length ? null : hoursFromNow(step.intervalHours),
          },
        });
        return;
      }
      await sendEducationEmail({
        ...input,
        campaignType: "panel",
        stepKey: step.stepKey,
        templateSlug: step.templateSlug,
        resendCount: last.resendCount + 1,
      });
      return;
    }

    if (state.panelStatus !== "active") return;
    if (state.panelNextEligibleAt && state.panelNextEligibleAt.getTime() > now.getTime()) return;
    const step = steps[state.panelStepIndex];
    if (!step) {
      await prisma.userAddonEducationState.update({
        where: { userId: input.userId },
        data: { panelStatus: "completed" },
      });
      return;
    }

    await sendEducationEmail({
      ...input,
      campaignType: "panel",
      stepKey: step.stepKey,
      templateSlug: step.templateSlug,
      resendCount: 0,
    });
    await prisma.userAddonEducationState.update({
      where: { userId: input.userId },
      data: {
        panelStatus: "paused_unread",
        panelPausedStepKey: step.stepKey,
      },
    });
    return;
  }

  if (state.verticalStatus === "completed" || state.verticalStatus === "pending") return;

  const verticalStepKey = state.verticalStepKey ?? resolveVerticalStepKey({
    email: input.userEmail,
    businessVertical: input.businessVertical,
  });
  const step = steps.find((s) => s.stepKey === verticalStepKey) ?? steps[0];
  if (!step) return;

  if (!state.verticalStepKey) {
    await prisma.userAddonEducationState.update({
      where: { userId: input.userId },
      data: { verticalStepKey: step.stepKey },
    });
  }

  if (state.verticalStatus === "paused_unread") {
    const last = await latestSend(input.userId, "vertical", step.stepKey);
    if (!last || last.readAt) {
      await prisma.userAddonEducationState.update({
        where: { userId: input.userId },
        data: { verticalStatus: "active" },
      });
      return;
    }
    const resendDue = last.sentAt.getTime() + step.resendIntervalHours * 60 * 60 * 1000 <= now.getTime();
    if (!resendDue) return;
    if (last.resendCount >= step.maxResends) {
      await prisma.userAddonEducationState.update({
        where: { userId: input.userId },
        data: {
          verticalStatus: "completed",
          verticalCompletedAt: now,
        },
      });
      return;
    }
    await sendEducationEmail({
      ...input,
      campaignType: "vertical",
      stepKey: step.stepKey,
      templateSlug: step.templateSlug,
      resendCount: last.resendCount + 1,
    });
    return;
  }

  if (state.verticalStatus !== "active") return;
  if (state.verticalNextEligibleAt && state.verticalNextEligibleAt.getTime() > now.getTime()) return;

  await sendEducationEmail({
    ...input,
    campaignType: "vertical",
    stepKey: step.stepKey,
    templateSlug: step.templateSlug,
    resendCount: 0,
  });
  await prisma.userAddonEducationState.update({
    where: { userId: input.userId },
    data: { verticalStatus: "paused_unread" },
  });
}

export async function processAddonEducationDripEmails(): Promise<void> {
  const usersNeedingEnrollment = await prisma.user.findMany({
    where: {
      isActive: true,
      addonEducationState: null,
      OR: [
        { pmailAccountWelcomeEmailSent: true },
        { pmailProspects: { some: { demoWelcomeEmailSent: true } } },
      ],
    },
    select: { id: true },
    take: 100,
  });
  for (const user of usersNeedingEnrollment) {
    await activateAddonEducationAfterWelcome(user.id);
  }

  const states = await prisma.userAddonEducationState.findMany({
    where: {
      addonEducationOptOut: false,
      addonEducationSuppressed: false,
      OR: [
        { panelStatus: { in: ["active", "paused_unread"] } },
        { verticalStatus: { in: ["active", "paused_unread"] } },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          tenantId: true,
          email: true,
          displayName: true,
          businessVertical: true,
          isActive: true,
          tenant: { select: { addonEducationSuppressed: true } },
        },
      },
    },
    take: 200,
  });

  for (const state of states) {
    const user = state.user;
    if (!user?.isActive || user.tenant.addonEducationSuppressed) continue;
    if (!(await hasWelcomeFinished(user.id))) continue;

    const payload = {
      userId: user.id,
      tenantId: user.tenantId,
      userEmail: user.email,
      fullName: user.displayName?.trim() || user.email.split("@")[0] || "there",
      businessVertical: user.businessVertical,
    };

    await processCampaignTrack({ ...payload, campaignType: "panel" });
    await processCampaignTrack({ ...payload, campaignType: "vertical" });
  }
}

export async function setUserAddonEducationOptOut(userId: string, optOut: boolean): Promise<void> {
  await prisma.userAddonEducationState.upsert({
    where: { userId },
    create: { userId, addonEducationOptOut: optOut },
    update: { addonEducationOptOut: optOut },
  });
}

export async function getUserAddonEducationPreferences(userId: string): Promise<{ optOut: boolean }> {
  const state = await prisma.userAddonEducationState.findUnique({ where: { userId } });
  return { optOut: state?.addonEducationOptOut ?? false };
}

export async function setUserAddonEducationSuppressed(userId: string, suppressed: boolean): Promise<void> {
  await prisma.userAddonEducationState.upsert({
    where: { userId },
    create: { userId, addonEducationSuppressed: suppressed },
    update: { addonEducationSuppressed: suppressed },
  });
}

export async function setTenantAddonEducationSuppressed(tenantId: string, suppressed: boolean): Promise<void> {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { addonEducationSuppressed: suppressed },
  });
}

export async function listAddonEducationCampaignSteps(campaignType?: string) {
  return prisma.addonEducationCampaignStep.findMany({
    where: campaignType ? { campaignType } : undefined,
    orderBy: [{ campaignType: "asc" }, { sortOrder: "asc" }],
  });
}

export async function updateAddonEducationCampaignStep(
  id: string,
  data: Partial<{
    templateSlug: string;
    sortOrder: number;
    isActive: boolean;
    intervalHours: number;
    resendIntervalHours: number;
    maxResends: number;
  }>,
) {
  return prisma.addonEducationCampaignStep.update({ where: { id }, data });
}

export async function reorderAddonEducationCampaignSteps(
  campaignType: string,
  orderedIds: string[],
): Promise<void> {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.addonEducationCampaignStep.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );
}
