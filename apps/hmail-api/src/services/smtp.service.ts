import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";
import type { TenantMailConfig } from "@prisma/client";

export function buildSmtpTransportOptions(
  mailConfig: Pick<TenantMailConfig, "smtpHost" | "smtpPort" | "smtpSecure">,
  auth: { user: string; pass: string },
): SMTPTransport.Options {
  const useStartTls = !mailConfig.smtpSecure && mailConfig.smtpPort === 587;
  return {
    host: mailConfig.smtpHost,
    port: mailConfig.smtpPort,
    secure: mailConfig.smtpSecure,
    requireTLS: useStartTls,
    auth,
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  };
}

export interface SendMailInput {
  email: string;
  password: string;
  mailConfig: TenantMailConfig;
  fromName?: string;
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
  const transporter = nodemailer.createTransport(
    buildSmtpTransportOptions(input.mailConfig, {
      user: input.email,
      pass: input.password,
    }),
  );

  const headers = buildMailHeaders(input);

  const info = await transporter.sendMail({
    from: input.fromName ? `"${input.fromName.replace(/"/g, "")}" <${input.email}>` : input.email,
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
  const transporter = nodemailer.createTransport(
    buildSmtpTransportOptions(mailConfig, { user: email, pass: password }),
  );

  await transporter.verify();
}
