import nodemailer from "nodemailer";
import { getEnv } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { renderEmailTemplate } from "./email-template.service.js";

export type PlatformMailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateSlug?: string;
  replyTo?: string;
};

function getPlatformSmtpConfig() {
  return {
    host: process.env.PLATFORM_SMTP_HOST?.trim() || process.env.DEFAULT_SMTP_HOST || "smtp.hostinger.com",
    port: Number(process.env.PLATFORM_SMTP_PORT || process.env.DEFAULT_SMTP_PORT || 465),
    secure: process.env.PLATFORM_SMTP_SECURE !== "false",
    user: process.env.PLATFORM_SMTP_USER?.trim() || "",
    pass: process.env.PLATFORM_SMTP_PASS?.trim() || "",
    from: process.env.PLATFORM_EMAIL_FROM?.trim() || "Prohost Cloud <noreply@prohost.cloud>",
  };
}

async function logEmail(to: string, subject: string, templateSlug: string | undefined, status: string, error?: string) {
  await prisma.platformEmailLog.create({
    data: {
      toAddress: to,
      subject,
      templateSlug: templateSlug ?? null,
      status,
      error: error ?? null,
    },
  });
}

export async function sendPlatformEmail(input: PlatformMailInput): Promise<void> {
  const env = getEnv();
  const smtp = getPlatformSmtpConfig();

  if (!smtp.user || !smtp.pass) {
    if (env.NODE_ENV === "production") {
      throw new Error("Platform SMTP is not configured");
    }
    await logEmail(input.to, input.subject, input.templateSlug, "logged_dev", "SMTP not configured — dev log only");
    console.info("[platform-email]", { to: input.to, subject: input.subject, templateSlug: input.templateSlug });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
    tls: { rejectUnauthorized: env.NODE_ENV === "production" },
  });

  try {
    await transporter.sendMail({
      from: smtp.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    });
    await logEmail(input.to, input.subject, input.templateSlug, "sent");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    await logEmail(input.to, input.subject, input.templateSlug, "failed", message);
    throw err;
  }
}

export async function sendTemplatedPlatformEmail(input: {
  to: string;
  templateSlug: string;
  variables: Record<string, string>;
  replyTo?: string;
}): Promise<void> {
  const rendered = await renderEmailTemplate(input.templateSlug, input.variables);
  await sendPlatformEmail({
    to: input.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    templateSlug: input.templateSlug,
    replyTo: input.replyTo,
  });
}

export async function notifyInternalAddress(address: string, subject: string, html: string): Promise<void> {
  await sendPlatformEmail({ to: address, subject, html });
}
