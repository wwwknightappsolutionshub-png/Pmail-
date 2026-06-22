import { prisma } from "../lib/prisma.js";
import { decryptSecret } from "../lib/crypto.js";
import { resolveAuthMailConfig } from "./auth.service.js";
import type { MailCredentials } from "./imap.service.js";

export async function getLatestMailCredentials(userId: string): Promise<
  (MailCredentials & { userId: string; userEmail: string }) | null
> {
  const session = await prisma.session.findFirst({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        include: {
          mailConfig: true,
          tenant: { include: { mail: true } },
        },
      },
    },
  });

  const mailConfig = session ? resolveAuthMailConfig(session.user) : null;
  if (!session || !mailConfig) return null;

  return {
    userId: session.user.id,
    userEmail: session.user.email,
    email: session.user.email,
    password: decryptSecret(session.encryptedMailPassword),
    mailConfig,
  };
}
