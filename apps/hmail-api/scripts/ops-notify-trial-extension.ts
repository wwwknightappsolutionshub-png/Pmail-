/**
 * ONE-SHOT OPS: Email every PMail user about the complimentary 60-day trial extension.
 *
 * Usage (VPS):
 *   cd /var/www/hostnet-panel
 *   npm run ops:notify-trial-extension -w hmail-api -- --dry-run
 *   npm run ops:notify-trial-extension -w hmail-api -- --apply --delay-ms=1500
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/lib/prisma.js";
import { sendPlatformEmail } from "../src/services/platform-email.service.js";

const monorepoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
config({ path: resolve(monorepoRoot, ".env") });

const TEMPLATE_SLUG = "ops-trial-extension-60d";
const SUBJECT = "Your PMail+ complimentary tools trial has been extended by 60 days";

function parseArgs(argv: string[]) {
  let delayMs = 1500;
  const delayArg = argv.find((a) => a.startsWith("--delay-ms="));
  if (delayArg) {
    const n = Number(delayArg.split("=")[1]);
    if (Number.isFinite(n) && n >= 0) delayMs = n;
  }
  return {
    dryRun: argv.includes("--dry-run") || !argv.includes("--apply"),
    apply: argv.includes("--apply"),
    delayMs,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function buildHtml(displayName: string | null, email: string): string {
  const name = (displayName || email.split("@")[0] || "there").trim();
  return `<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;line-height:1.5;color:#1a1a1a">
  <p>Hi ${name},</p>
  <p>Good news — we have extended your <strong>PMail+ Panel workspace tools</strong> complimentary trial by
  <strong>another 60 days</strong>.</p>
  <p>During this period you keep complimentary access to workspace tools such as CRM, reminders, open tracking,
  file vault, inbox cleanup, e-sign, email SLA, and related Panel features (subject to your plan entitlements).</p>
  <p>No action is required on your side. Sign in at
  <a href="https://mail.prohost.cloud/">https://mail.prohost.cloud/</a> and continue using your mailbox.</p>
  <p>Thank you for being with Prohost Cloud / PMail+.</p>
  <p>— The Prohost Cloud team</p>
</body></html>`;
}

function buildText(displayName: string | null, email: string): string {
  const name = (displayName || email.split("@")[0] || "there").trim();
  return `Hi ${name},

Good news — we have extended your PMail+ Panel workspace tools complimentary trial by another 60 days.

During this period you keep complimentary access to workspace tools such as CRM, reminders, open tracking, file vault, inbox cleanup, e-sign, email SLA, and related Panel features.

No action is required. Sign in at https://mail.prohost.cloud/

— The Prohost Cloud team`;
}

async function main() {
  const { dryRun, apply, delayMs } = parseArgs(process.argv.slice(2));
  console.log(dryRun && !apply ? "Mode: DRY-RUN" : "Mode: APPLY (sending email)");

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, email: true, displayName: true },
    orderBy: { email: "asc" },
  });

  console.log(`Recipients: ${users.length}`);

  if (dryRun && !apply) {
    console.log(
      JSON.stringify(
        users.slice(0, 10).map((u) => ({ email: u.email, displayName: u.displayName })),
        null,
        2,
      ),
    );
    console.log("Dry-run complete. Re-run with --apply to send.");
    await prisma.$disconnect();
    return;
  }

  let sent = 0;
  let failed = 0;
  for (const user of users) {
    try {
      await sendPlatformEmail({
        to: user.email,
        subject: SUBJECT,
        html: buildHtml(user.displayName, user.email),
        text: buildText(user.displayName, user.email),
        templateSlug: TEMPLATE_SLUG,
      });
      sent += 1;
      console.log(`sent ${user.email}`);
    } catch (err) {
      failed += 1;
      console.error(`failed ${user.email}`, err instanceof Error ? err.message : err);
    }
    if (delayMs > 0) await delay(delayMs);
  }

  console.log(JSON.stringify({ sent, failed, total: users.length }, null, 2));
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
