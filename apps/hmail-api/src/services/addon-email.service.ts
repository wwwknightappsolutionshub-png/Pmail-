import nodemailer from "nodemailer";

import { prisma } from "../lib/prisma.js";

import { getEnv } from "../config/env.js";

import { renderEmailTemplate } from "./email-template.service.js";



export type AddonEmailType = "welcome" | "day3" | "day6" | "expired";



interface SendAddonEmailInput {

  tenantId: string;

  addonId: string;

  addonName: string;

  userEmail: string;

  emailType: AddonEmailType;

  trialEndsAt?: Date;

}



function resolveMarketplaceUrl(): string {

  return `${process.env.CORS_ORIGIN?.split(",")[0]?.trim() ?? "http://localhost:5173"}/addons`;

}



async function buildDay6ReferralUpsell(input: SendAddonEmailInput): Promise<{

  subject: string;

  text: string;

  html: string;

} | null> {

  try {

    const marketplaceUrl = resolveMarketplaceUrl();

    const rendered = await renderEmailTemplate("platform-tools-referral-upsell", {

      fullName: input.userEmail.split("@")[0] || "there",

      ctaUrl: marketplaceUrl,

      productName: "PMail+",

    });

    return {

      subject: rendered.subject,

      text: rendered.text?.trim() || rendered.subject,

      html: rendered.html,

    };

  } catch {

    return null;

  }

}



function buildEmailContent(input: SendAddonEmailInput): { subject: string; text: string; html: string } {

  const marketplaceUrl = resolveMarketplaceUrl();



  switch (input.emailType) {

    case "welcome":

      return {

        subject: `Your free trial of ${input.addonName} is active`,

        text: `Your 7-day free trial of ${input.addonName} is now active on HMail.\n\nOpen Add-ons: ${marketplaceUrl}`,

        html: `<p>Your <strong>free 7-day trial</strong> of <strong>${input.addonName}</strong> is now active on HMail.</p><p><a href="${marketplaceUrl}">Open Add-ons</a></p>`,

      };

    case "day3":

      return {

        subject: `4 days left on your ${input.addonName} trial`,

        text: `You have 4 days left on your free ${input.addonName} trial.\n\n${marketplaceUrl}`,

        html: `<p>You have <strong>4 days left</strong> on your free <strong>${input.addonName}</strong> trial.</p><p><a href="${marketplaceUrl}">View Add-ons</a></p>`,

      };

    case "day6":

      return {

        subject: "Your free Platform tools end tomorrow — keep them unlocked",

        text: `Your complimentary PMail+ Platform tools trial ends tomorrow. Subscribe to keep calendar, scheduled send, open tracking, WhatsApp, and Mail2PDF unlocked.\n\n${marketplaceUrl}`,

        html: `<p>Your complimentary <strong>PMail+ Platform tools</strong> trial ends <strong>tomorrow</strong>.</p><p><a href="${marketplaceUrl}">Unlock Platform tools</a></p>`,

      };

    case "expired":

      return {

        subject: `Your ${input.addonName} trial has ended`,

        text: `Your trial of ${input.addonName} has ended. Add-ons are free — restart from the marketplace when available.\n\n${marketplaceUrl}`,

        html: `<p>Your trial of <strong>${input.addonName}</strong> has ended.</p><p><a href="${marketplaceUrl}">View Add-ons</a></p>`,

      };

  }

}



export async function sendAddonTrialEmail(input: SendAddonEmailInput): Promise<void> {

  const env = getEnv();

  let content = buildEmailContent(input);

  if (input.emailType === "day6") {

    const templated = await buildDay6ReferralUpsell(input);

    if (templated) content = templated;

  }



  const alreadySent = await prisma.addonEmailLog.findFirst({

    where: {

      tenantId: input.tenantId,

      addonId: input.addonId,

      emailType: input.emailType,

    },

  });

  if (alreadySent) return;



  const from = process.env.NURTURE_SMTP_FROM ?? "noreply@hmail.local";

  const host = process.env.NURTURE_SMTP_HOST;



  if (host) {

    const transporter = nodemailer.createTransport({

      host,

      port: Number(process.env.NURTURE_SMTP_PORT ?? 587),

      secure: process.env.NURTURE_SMTP_SECURE === "true",

      auth: process.env.NURTURE_SMTP_USER

        ? {

            user: process.env.NURTURE_SMTP_USER,

            pass: process.env.NURTURE_SMTP_PASS ?? "",

          }

        : undefined,

    });



    await transporter.sendMail({

      from,

      to: input.userEmail,

      subject: content.subject,

      text: content.text,

      html: content.html,

    });

  } else if (env.NODE_ENV === "development") {

    console.info(`[addon-email] ${input.emailType} → ${input.userEmail}: ${content.subject}`);

  }



  await prisma.addonEmailLog.create({

    data: {

      tenantId: input.tenantId,

      addonId: input.addonId,

      userEmail: input.userEmail,

      emailType: input.emailType,

    },

  });

}



export async function sendAutoReplyUpsellEmail(input: {
  tenantId: string;
  userEmail: string;
  daysLeft: number;
}): Promise<void> {
  const env = getEnv();
  const marketplaceUrl = `${resolveMarketplaceUrl()}?highlight=auto-reply-functionality`;
  const fullName = input.userEmail.split("@")[0] || "there";

  let content: { subject: string; text: string; html: string };
  try {
    const rendered = await renderEmailTemplate("auto-reply-upsell", {
      fullName,
      daysLeft: String(input.daysLeft),
      ctaUrl: marketplaceUrl,
      productName: "PMail+",
    });
    content = {
      subject: rendered.subject,
      text: rendered.text?.trim() || rendered.subject,
      html: rendered.html,
    };
  } catch {
    content = {
      subject: `Your Auto Reply access ends in ${input.daysLeft} days`,
      text: `Your complimentary PMail+ Auto Reply access ends in ${input.daysLeft} days. Subscribe: ${marketplaceUrl}`,
      html: `<p>Your complimentary <strong>PMail+ Auto Reply</strong> access ends in <strong>${input.daysLeft} days</strong>.</p><p><a href="${marketplaceUrl}">Unlock Auto Reply</a></p>`,
    };
  }

  const from = process.env.NURTURE_SMTP_FROM ?? "noreply@hmail.local";
  const host = process.env.NURTURE_SMTP_HOST;

  if (host) {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.NURTURE_SMTP_PORT ?? 587),
      secure: process.env.NURTURE_SMTP_SECURE === "true",
      auth: process.env.NURTURE_SMTP_USER
        ? {
            user: process.env.NURTURE_SMTP_USER,
            pass: process.env.NURTURE_SMTP_PASS ?? "",
          }
        : undefined,
    });

    await transporter.sendMail({
      from,
      to: input.userEmail,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
  } else if (env.NODE_ENV === "development") {
    console.info(`[auto-reply-email] upsell → ${input.userEmail}: ${content.subject}`);
  }
}

export type PanelWorkspaceTrialEmailType = "welcome" | "day5_upsell" | "day7_final";

export async function sendPanelWorkspaceTrialEmail(input: {
  tenantId: string;
  userEmail: string;
  emailType: PanelWorkspaceTrialEmailType;
  trialEndsAt: Date;
}): Promise<void> {
  const env = getEnv();
  const marketplaceUrl = `${resolveMarketplaceUrl()}?highlight=open-tracking`;
  const fullName = input.userEmail.split("@")[0] || "there";
  const daysLeft = Math.max(
    0,
    Math.ceil((input.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
  );

  const templateSlug =
    input.emailType === "welcome"
      ? "panel-workspace-welcome"
      : input.emailType === "day5_upsell"
        ? "panel-workspace-day5-upsell"
        : "panel-workspace-day7-final";

  let content: { subject: string; text: string; html: string };
  try {
    const rendered = await renderEmailTemplate(templateSlug, {
      fullName,
      ctaUrl: marketplaceUrl,
      productName: "PMail+",
      trialDays: "7",
      daysLeft: String(daysLeft),
    });
    content = {
      subject: rendered.subject,
      text: rendered.text?.trim() || rendered.subject,
      html: rendered.html,
    };
  } catch {
    const subjects: Record<PanelWorkspaceTrialEmailType, string> = {
      welcome: "Your PMail+ workspace tools trial is active",
      day5_upsell: "Upgrade your PMail+ workspace tools",
      day7_final: "Final reminder — workspace tools lock tomorrow",
    };
    content = {
      subject: subjects[input.emailType],
      text: `${subjects[input.emailType]} ${marketplaceUrl}`,
      html: `<p>${subjects[input.emailType]}</p><p><a href="${marketplaceUrl}">View add-ons</a></p>`,
    };
  }

  const emailType = `panel_workspace_${input.emailType}`;
  const alreadySent = await prisma.addonEmailLog.findFirst({
    where: { tenantId: input.tenantId, userEmail: input.userEmail, emailType },
  });
  if (alreadySent) return;

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
        html: content.html,
      });
    } catch (err) {
      console.error("[panel-workspace-trial] nurture SMTP send failed", err);
      return;
    }
  } else if (env.NODE_ENV === "development") {
    console.info(`[panel-workspace-trial] ${input.emailType} → ${input.userEmail}: ${content.subject}`);
  }

  await prisma.addonEmailLog.create({
    data: {
      tenantId: input.tenantId,
      userEmail: input.userEmail,
      emailType,
    },
  });
}

export async function sendPmailAccountWelcomeEmail(input: {
  tenantId: string;
  userEmail: string;
  fullName: string;
  workspaceAddonsList: string;
  verticalAddonsList: string;
  workspaceAddonsHtml: string;
  verticalAddonsHtml: string;
}): Promise<boolean> {
  const env = getEnv();
  const marketplaceUrl = resolveMarketplaceUrl();
  const loginUrl = `${process.env.CORS_ORIGIN?.split(",")[0]?.trim() ?? "http://localhost:5173"}/login`;

  let content: { subject: string; text: string; html: string };
  try {
    const rendered = await renderEmailTemplate("pmail-account-welcome", {
      fullName: input.fullName,
      ctaUrl: marketplaceUrl,
      loginUrl,
      productName: "PMail+",
      workspaceAddonsList: input.workspaceAddonsList,
      verticalAddonsList: input.verticalAddonsList,
      workspaceAddonsHtml: input.workspaceAddonsHtml,
      verticalAddonsHtml: input.verticalAddonsHtml,
    });
    content = {
      subject: rendered.subject,
      text: rendered.text?.trim() || rendered.subject,
      html: rendered.html,
    };
  } catch {
    content = {
      subject: "Welcome to PMail+",
      text: `Hi ${input.fullName},\n\nWelcome to PMail+. Explore workspace and industry add-ons: ${marketplaceUrl}`,
      html: `<p>Hi ${input.fullName},</p><p>Welcome to PMail+.</p><p><a href="${marketplaceUrl}">Explore add-ons</a></p>`,
    };
  }

  const emailType = "pmail_account_welcome";
  const alreadySent = await prisma.addonEmailLog.findFirst({
    where: { tenantId: input.tenantId, userEmail: input.userEmail, emailType },
  });
  if (alreadySent) return false;

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
        html: content.html,
      });
    } catch (err) {
      console.error("[pmail-account-welcome] nurture SMTP send failed", err);
      return false;
    }
  } else if (env.NODE_ENV === "development") {
    console.info(`[pmail-account-welcome] → ${input.userEmail}: ${content.subject}`);
  }

  await prisma.addonEmailLog.create({
    data: {
      tenantId: input.tenantId,
      userEmail: input.userEmail,
      emailType,
    },
  });
  return true;
}

export async function sendJobHunterInboxUpsellEmail(input: {
  tenantId: string;
  userEmail: string;
  addonSlug: string;
}): Promise<void> {
  const env = getEnv();
  const marketplaceUrl = `${resolveMarketplaceUrl()}?highlight=${encodeURIComponent(input.addonSlug)}`;
  const fullName = input.userEmail.split("@")[0] || "there";
  const emailType = "job_hunter_inbox_upsell";

  const alreadySent = await prisma.addonEmailLog.findFirst({
    where: { tenantId: input.tenantId, userEmail: input.userEmail, emailType },
  });
  if (alreadySent) return;

  let content: { subject: string; text: string; html: string };
  try {
    const rendered = await renderEmailTemplate("job-hunter-inbox-upsell", {
      fullName,
      ctaUrl: marketplaceUrl,
      productName: "PMail+",
      addonName: "Job Hunter",
    });
    content = {
      subject: rendered.subject,
      text: rendered.text?.trim() || rendered.subject,
      html: rendered.html,
    };
  } catch {
    content = {
      subject: "Unlock Job Hunter — we noticed career activity in your mailbox",
      text: `Hi ${fullName},\n\nWe detected job-search signals in your inbox and sent mail. Activate Job Hunter in PMail+ to track applications, build your CV, and prep for interviews.\n\n${marketplaceUrl}`,
      html: `<p>Hi ${fullName},</p><p>We detected job-search signals in your mailbox. Activate <strong>Job Hunter</strong> in PMail+ to unlock career tools.</p><p><a href="${marketplaceUrl}">Activate Job Hunter</a></p>`,
    };
  }

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
        html: content.html,
      });
    } catch (err) {
      console.error("[job-hunter-inbox-upsell] nurture SMTP send failed", err);
      return;
    }
  } else if (env.NODE_ENV === "development") {
    console.info(`[job-hunter-inbox-upsell] → ${input.userEmail}: ${content.subject}`);
  }

  await prisma.addonEmailLog.create({
    data: {
      tenantId: input.tenantId,
      userEmail: input.userEmail,
      emailType,
    },
  });
}

