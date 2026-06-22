import { prisma } from "../lib/prisma.js";
import { listMessages } from "./imap.service.js";
import { getLatestMailCredentials } from "./mail-credentials.service.js";
import { sendMail } from "./smtp.service.js";
import { getAutoReplyEntitlement } from "./auto-reply-entitlement.service.js";
import { getComposeSettingsByUserId } from "./compose-settings.service.js";

function extractEmailAddress(fromHeader: string): string {
  const match = fromHeader.match(/<([^>]+)>/);
  return (match?.[1] ?? fromHeader).trim().toLowerCase();
}

export async function processAutoReplies(): Promise<number> {
  const users = await prisma.userComposeSettings.findMany({
    where: { autoReplyEnabled: true },
    include: {
      user: true,
    },
  });

  let sent = 0;

  for (const settings of users) {
    const entitlement = await getAutoReplyEntitlement(settings.userId, settings.user.tenantId);
    if (!entitlement.entitled || !settings.autoReplyEnabled) continue;

    const creds = await getLatestMailCredentials(settings.userId);
    if (!creds) continue;

    const compose = await getComposeSettingsByUserId(settings.userId);
    const autoReplyId = settings.activeAutoReplyId ?? compose.autoReplies.find((r) => r.enabled)?.id;
    const rule = compose.autoReplies.find((r) => r.id === autoReplyId);
    if (!rule) continue;

    let unread;
    try {
      unread = await listMessages(creds, "INBOX", {
        filter: "unread",
        page: 1,
        pageSize: 15,
      });
    } catch {
      continue;
    }

    for (const message of unread.messages) {
      const senderEmail = extractEmailAddress(message.from);
      if (!senderEmail || senderEmail === creds.userEmail.toLowerCase()) continue;

      const existing = await prisma.autoReplySentLog.findUnique({
        where: {
          userId_folder_messageUid: {
            userId: settings.userId,
            folder: "INBOX",
            messageUid: message.uid,
          },
        },
      });
      if (existing) continue;

      try {
        await sendMail({
          email: creds.email,
          password: creds.password,
          mailConfig: creds.mailConfig,
          fromName: compose.displayName?.trim() || undefined,
          to: senderEmail,
          subject: rule.subject,
          text: rule.body.replace(/<[^>]+>/g, " "),
          html: rule.body,
          inReplyTo: undefined,
        });

        await prisma.autoReplySentLog.create({
          data: {
            userId: settings.userId,
            folder: "INBOX",
            messageUid: message.uid,
            senderEmail,
          },
        });
        sent += 1;
      } catch {
        // skip failed auto-reply for this message
      }
    }
  }

  return sent;
}
