import { prisma } from "../lib/prisma.js";
import { getLatestMailCredentials } from "./mail-credentials.service.js";
import { sendMail } from "./smtp.service.js";

export async function processDueReminders(): Promise<number> {
  const now = new Date();
  const due = await prisma.workspaceReminder.findMany({
    where: {
      status: "pending",
      dueAt: { lte: now },
      channel: "email",
    },
    take: 30,
    orderBy: { dueAt: "asc" },
    include: {
      user: true,
      crmRecord: true,
    },
  });

  let sent = 0;

  for (const reminder of due) {
    const creds = await getLatestMailCredentials(reminder.userId);
    if (!creds) {
      continue;
    }

    const dueLabel = reminder.dueAt.toLocaleString();
    const crmLine = reminder.crmRecord
      ? `<p>Related contact: ${reminder.crmRecord.name} (${reminder.crmRecord.email})</p>`
      : "";

    try {
      await sendMail({
        email: creds.email,
        password: creds.password,
        mailConfig: creds.mailConfig,
        to: creds.userEmail,
        subject: `Reminder: ${reminder.title}`,
        text: `Reminder: ${reminder.title}\nDue: ${dueLabel}`,
        html: `<p><strong>Reminder:</strong> ${reminder.title}</p><p>Due: ${dueLabel}</p>${crmLine}`,
      });

      await prisma.workspaceReminder.update({
        where: { id: reminder.id },
        data: { status: "done" },
      });
      sent += 1;
    } catch {
      // leave pending for retry on next job run
    }
  }

  return sent;
}
