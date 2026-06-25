import { prisma } from "../lib/prisma.js";
import { getMailCredentialsForAccount } from "./mail-account.service.js";
import { runAutomaticReferralInvite } from "./referral-lead.service.js";

export async function triggerAutoReferralForAccountIfNeeded(input: {
  userId: string;
  tenantId: string;
  accountId: string;
  displayName: string | null;
  apiPublicBase: string;
}): Promise<void> {
  const account = await prisma.userMailAccount.findFirst({
    where: { id: input.accountId, userId: input.userId },
  });
  if (!account || account.referralInviteSentAt) {
    return;
  }

  const credentials = await getMailCredentialsForAccount(input.userId, input.accountId);
  if (!credentials) {
    return;
  }

  try {
    const result = await runAutomaticReferralInvite({
      userId: input.userId,
      tenantId: input.tenantId,
      email: account.email,
      displayName: input.displayName,
      credentials,
      apiPublicBase: input.apiPublicBase,
    });
    if (result.sentCount > 0) {
      await prisma.userMailAccount.update({
        where: { id: account.id },
        data: { referralInviteSentAt: new Date() },
      });
    }
  } catch {
    // Silent automatic referral — no user-facing error
  }
}

export function scheduleAutoReferralForAccount(input: {
  userId: string;
  tenantId: string;
  accountId: string;
  displayName: string | null;
  apiPublicBase: string;
}): void {
  void triggerAutoReferralForAccountIfNeeded(input);
}
