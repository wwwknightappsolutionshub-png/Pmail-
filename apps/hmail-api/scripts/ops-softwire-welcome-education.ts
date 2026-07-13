/**
 * ONE-SHOT OPS: Softwire Accountant only.
 * Does not change product flows for other users.
 *
 * Targets (may be separate User rows on the same tenant):
 *   - enquiries@softwire-accountant.ae (processed first / priority)
 *   - nargiza@softwire-accountant.ae
 *
 * VPS:
 *   cd /var/www/hostnet-panel && git pull
 *   npm run ops:softwire-welcome -w hmail-api -- --delay-ms=5000
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

const PRIORITY_EMAIL = "enquiries@softwire-accountant.ae";
const SECONDARY_EMAIL = "nargiza@softwire-accountant.ae";
const TARGET_EMAILS = [PRIORITY_EMAIL, SECONDARY_EMAIL] as const;
const LEGACY_EMAILS = ["support@softwire-accountant.ae"] as const;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function delayMs(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

type SoftwireUser = {
  id: string;
  tenantId: string;
  email: string;
  displayName: string | null;
  mailAccounts: Array<{ id: string; email: string; isPrimary: boolean }>;
};

async function resolveSoftwireUsers(): Promise<SoftwireUser[]> {
  const emails = TARGET_EMAILS.map(normalizeEmail);
  const byId = new Map<string, SoftwireUser>();

  const byLogin = await prisma.user.findMany({
    where: { email: { in: [...TARGET_EMAILS] }, isActive: true },
    include: { mailAccounts: { select: { id: true, email: true, isPrimary: true } } },
  });
  for (const u of byLogin) byId.set(u.id, u);

  const mailboxes = await prisma.userMailAccount.findMany({
    where: { email: { in: [...TARGET_EMAILS] } },
    include: {
      user: {
        include: { mailAccounts: { select: { id: true, email: true, isPrimary: true } } },
      },
    },
  });
  for (const row of mailboxes) {
    if (row.user?.isActive) byId.set(row.user.id, row.user);
  }

  // Case-insensitive fallback
  if (byId.size < TARGET_EMAILS.length) {
    const candidates = await prisma.user.findMany({
      where: { isActive: true },
      include: { mailAccounts: { select: { id: true, email: true, isPrimary: true } } },
      take: 5000,
    });
    for (const u of candidates) {
      const hit =
        emails.includes(normalizeEmail(u.email)) ||
        u.mailAccounts.some((a) => emails.includes(normalizeEmail(a.email)));
      if (hit) byId.set(u.id, u);
    }
  }

  const users = [...byId.values()];
  // Priority: enquiries user first, then others
  users.sort((a, b) => {
    const aPri = normalizeEmail(a.email) === PRIORITY_EMAIL ? 0 : 1;
    const bPri = normalizeEmail(b.email) === PRIORITY_EMAIL ? 0 : 1;
    if (aPri !== bPri) return aPri - bPri;
    return a.email.localeCompare(b.email);
  });
  return users;
}

function recipientEmailsForUser(user: SoftwireUser): string[] {
  const set = new Set<string>();
  set.add(normalizeEmail(user.email));
  for (const account of user.mailAccounts) {
    const email = normalizeEmail(account.email);
    if ((TARGET_EMAILS as readonly string[]).includes(email)) set.add(email);
  }
  // Always include Softwire targets that match this user's login
  for (const target of TARGET_EMAILS) {
    if (normalizeEmail(user.email) === target) set.add(target);
  }
  // Stable order: priority email first when present
  return [...set].sort((a, b) => {
    if (a === PRIORITY_EMAIL) return -1;
    if (b === PRIORITY_EMAIL) return 1;
    return a.localeCompare(b);
  });
}

async function processUser(user: SoftwireUser): Promise<void> {
  console.info(
    `[softwire-ops] userId=${user.id} email=${user.email} mailAccounts=${
      user.mailAccounts.map((a) => `${a.email}${a.isPrimary ? "*" : ""}`).join(", ") || "(none)"
    }`,
  );

  // Promote Softwire mailbox on this user only when that address exists as a mail account
  for (const preferred of TARGET_EMAILS) {
    const account = user.mailAccounts.find((a) => normalizeEmail(a.email) === preferred);
    if (!account) continue;
    await prisma.$transaction([
      prisma.userMailAccount.updateMany({
        where: { userId: user.id },
        data: { isPrimary: false },
      }),
      prisma.userMailAccount.update({
        where: { id: account.id },
        data: { isPrimary: true },
      }),
    ]);
    console.info(`[softwire-ops] mailbox primary → ${preferred} (user ${user.id})`);
    break;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { pmailAccountWelcomeEmailSent: false },
  });

  const recipients = recipientEmailsForUser(user);
  const deleted = await prisma.addonEmailLog.deleteMany({
    where: {
      tenantId: user.tenantId,
      emailType: "pmail_account_welcome",
      userEmail: { in: [...new Set([...recipients, ...LEGACY_EMAILS])] },
    },
  });
  console.info(`[softwire-ops] cleared ${deleted.count} welcome log(s) for ${user.email}`);

  const lists = getPmailWelcomeAddonLists();
  const fullName = user.displayName?.trim() || user.email.split("@")[0] || "there";

  for (const to of recipients) {
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

  await activateAddonEducationAfterWelcome(user.id);
  console.info(`[softwire-ops] education enrolled for ${user.email}`);
  await processAddonEducationDripForUser(user.id);
  console.info(`[softwire-ops] education drip processed for ${user.email}`);
}

async function main(): Promise<void> {
  const delayArg = process.argv.find((a) => a.startsWith("--delay-ms="));
  const delay = delayArg ? Number(delayArg.split("=")[1]) : 5000;
  if (Number.isFinite(delay) && delay > 0) {
    console.info(`[softwire-ops] waiting ${delay}ms before send…`);
    await delayMs(delay);
  }

  const users = await resolveSoftwireUsers();
  if (users.length === 0) {
    throw new Error(
      `[softwire-ops] No active user found for ${TARGET_EMAILS.join(" / ")}. Aborting.`,
    );
  }

  console.info(`[softwire-ops] found ${users.length} Softwire user(s); priority=${PRIORITY_EMAIL}`);
  for (const user of users) {
    await processUser(user);
  }
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
