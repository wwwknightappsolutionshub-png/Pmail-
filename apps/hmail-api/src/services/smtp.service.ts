import nodemailer from "nodemailer";
import type { TenantMailConfig } from "@prisma/client";

export interface SendMailInput {
  email: string;
  password: string;
  mailConfig: TenantMailConfig;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string;
  priority?: "normal" | "high";
  requestReadReceipt?: boolean;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

export function buildMailHeaders(input: SendMailInput): Record<string, string> {
  const headers: Record<string, string> = {};
  if (input.priority === "high") {
    headers["X-Priority"] = "1";
    headers["Priority"] = "urgent";
    headers["Importance"] = "high";
  }
  if (input.requestReadReceipt) {
    headers["Disposition-Notification-To"] = input.email;
  }
  if (input.references) {
    headers.References = input.references;
  }
  return headers;
}

export async function sendMail(input: SendMailInput): Promise<{ messageId: string }> {
  const transporter = nodemailer.createTransport({
    host: input.mailConfig.smtpHost,
    port: input.mailConfig.smtpPort,
    secure: input.mailConfig.smtpSecure,
    auth: {
      user: input.email,
      pass: input.password,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  });

  const headers = buildMailHeaders(input);

  const info = await transporter.sendMail({
    from: input.email,
    to: input.to,
    cc: input.cc || undefined,
    bcc: input.bcc || undefined,
    subject: input.subject,
    text: input.text,
    html: input.html,
    replyTo: input.replyTo,
    inReplyTo: input.inReplyTo,
    references: input.references,
    headers: Object.keys(headers).length ? headers : undefined,
    attachments: input.attachments,
  });

  return { messageId: info.messageId };
}

export async function verifySmtpLogin(
  email: string,
  password: string,
  mailConfig: TenantMailConfig,
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: mailConfig.smtpHost,
    port: mailConfig.smtpPort,
    secure: mailConfig.smtpSecure,
    auth: { user: email, pass: password },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  });

  await transporter.verify();
}
