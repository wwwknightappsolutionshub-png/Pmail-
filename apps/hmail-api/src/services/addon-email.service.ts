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

