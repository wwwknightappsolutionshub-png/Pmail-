import nodemailer from "nodemailer";
import { prisma } from "../lib/prisma.js";
import { getEnv } from "../config/env.js";

export type AddonEmailType = "welcome" | "day3" | "expired";

interface SendAddonEmailInput {
  tenantId: string;
  addonId: string;
  addonName: string;
  userEmail: string;
  emailType: AddonEmailType;
  trialEndsAt?: Date;
}

function buildEmailContent(input: SendAddonEmailInput): { subject: string; text: string; html: string } {
  const marketplaceUrl = `${process.env.CORS_ORIGIN ?? "http://localhost:5173"}/addons`;

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
  const content = buildEmailContent(input);

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
