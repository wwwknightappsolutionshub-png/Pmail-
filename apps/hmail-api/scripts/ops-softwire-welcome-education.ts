/**
 * ONE-SHOT OPS: Softwire Accountant only.
 * Does not change product flows for other users.
 *
 * Targets:
 *   - nargiza@softwire-accountant.ae (secondary after this run)
 *   - support@softwire-accountant.ae (login + primary mailbox + nurture)
 *
 * VPS (after deploy + API healthy):
 *   sleep 5
 *   cd /var/www/hostnet-panel
 *   npm run ops:softwire-welcome -w hmail-api
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/lib/prisma.js";
import { sendPmailAccountWelcomeEmail } from "../src/services/addon-email.service.js";
import {
  activateAddonEducationAfterWelcome,
  processAddonEducationDripForUser,
} from "../src/services/addon-education-drip.service.js";
import { getPmailWelcomeAddonLists } from "../src/services/pmail-account-welcome.service.js";

const monorepoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
config({ path: resolve(monorepoRoot, ".env") });

const SECONDARY_EMAIL = "nargiza@softwire-accountant.ae";
const PRIMARY_EMAIL = "support@softwire-accountant.ae";
const TARGET_EMAILS = [SECONDARY_EMAIL, PRIMARY_EMAIL] as const;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function delayMs(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function resolveSoftwireUser() {
  const emails = TARGET_EMAILS.map(normalizeEmail);

  const byUserEmail = await prisma.user.findFirst({
    where: { email: { in: [...TARGET_EMAILS] }, isActive: true },
    include: { mailAccounts: { select: { id: true, email: true, isPrimary: true } } },
  });
  if (byUserEmail) return byUserEmail;

  const mailbox = await prisma.userMailAccount.findFirst({
    where: { email: { in: [...TARGET_EMAILS] } },
    include: {
      user: {
        include: { mailAccounts: { select: { id: true, email: true, isPrimary: true } } },
      },
    },
  });
  if (mailbox?.user?.isActive) return mailbox.user;

  // Case-insensitive fallback (SQLite / mixed casing)
  const allCandidates = await prisma.user.findMany({
    where: { isActive: true },
    include: { mailAccounts: { select: { id: true, email: true, isPrimary: true } } },
    take: 5000,
  });
  return (
    allCandidates.find(
      (u) =>
        emails.includes(normalizeEmail(u.email)) ||
        u.mailAccounts.some((a) => emails.includes(normalizeEmail(a.email))),
    ) ?? null
  );
}

async function main(): Promise<void> {
  const delayArg = process.argv.find((a) => a.startsWith("--delay-ms="));
  const delay = delayArg ? Number(delayArg.split("=")[1]) : 5000;
  if (Number.isFinite(delay) && delay > 0) {
    console.info(`[softwire-ops] waiting ${delay}ms before send…`);
    await delayMs(delay);
  }

  const user = await resolveSoftwireUser();
  if (!user) {
    throw new Error(
      `[softwire-ops] No active user found for ${TARGET_EMAILS.join(" / ")}. Aborting.`,
    );
  }

  const accounts = user.mailAccounts;
  const supportAccount = accounts.find((a) => normalizeEmail(a.email) === PRIMARY_EMAIL);
  const nargizaAccount = accounts.find((a) => normalizeEmail(a.email) === SECONDARY_EMAIL);

  if (!supportAccount) {
    throw new Error(
      `[softwire-ops] User ${user.id} has no UserMailAccount for ${PRIMARY_EMAIL}. Aborting.`,
    );
  }

  const conflict = await prisma.user.findFirst({
    where: {
      tenantId: user.tenantId,
      email: PRIMARY_EMAIL,
      id: { not: user.id },
    },
    select: { id: true },
  });
  if (conflict) {
    throw new Error(
      `[softwire-ops] Another user (${conflict.id}) already owns ${PRIMARY_EMAIL} on this tenant.`,
    );
  }

  console.info(`[softwire-ops] userId=${user.id} currentEmail=${user.email}`);

  // 1) Promote support@ as primary mailbox; demote others for this user only
  await prisma.$transaction([
    prisma.userMailAccount.updateMany({
      where: { userId: user.id },
      data: { isPrimary: false },
    }),
    prisma.userMailAccount.update({
      where: { id: supportAccount.id },
      data: { isPrimary: true },
    }),
  ]);
  console.info(`[softwire-ops] mailbox primary → ${PRIMARY_EMAIL}`);
  if (nargizaAccount) {
    console.info(`[softwire-ops] mailbox secondary → ${SECONDARY_EMAIL}`);
  }

  // 2) Login / nurture identity → support@
  await prisma.user.update({
    where: { id: user.id },
    data: {
      email: PRIMARY_EMAIL,
      pmailAccountWelcomeEmailSent: false,
    },
  });
  console.info(`[softwire-ops] User.email → ${PRIMARY_EMAIL}`);

  // 3) Clear welcome logs so force-resend is allowed
  const deleted = await prisma.addonEmailLog.deleteMany({
    where: {
      tenantId: user.tenantId,
      emailType: "pmail_account_welcome",
      userEmail: { in: [...TARGET_EMAILS, user.email] },
    },
  });
  console.info(`[softwire-ops] cleared ${deleted.count} pmail_account_welcome log(s)`);

  const lists = getPmailWelcomeAddonLists();
  const fullName = user.displayName?.trim() || PRIMARY_EMAIL.split("@")[0] || "there";

  // 4) Force-resend branded welcome — support@ first, then nargiza@
  for (const to of [PRIMARY_EMAIL, SECONDARY_EMAIL]) {
    const sent = await sendPmailAccountWelcomeEmail({
      tenantId: user.tenantId,
      userEmail: to,
      fullName,
      ...lists,
    });
    console.info(`[softwire-ops] welcome → ${to}: ${sent ? "sent" : "skipped"}`);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { pmailAccountWelcomeEmailSent: true },
  });

  // 5) Enroll / prioritize education drip for this user only, then process immediately
  await activateAddonEducationAfterWelcome(user.id);
  console.info(`[softwire-ops] education enrolled; nextEligibleAt=now`);
  await processAddonEducationDripForUser(user.id);
  console.info(`[softwire-ops] education drip processed for user ${user.id}`);

  console.info("[softwire-ops] done");
}

main()
  .catch((err) => {
    console.error("[softwire-ops] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
