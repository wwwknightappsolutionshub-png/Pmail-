/**
 * ONE-SHOT OPS: Grant ~60 days Panel workspace trial remaining to all users.
 *
 * Keeps PANEL_WORKSPACE_WELCOME_TRIAL_DAYS = 7 in code.
 * Sets panelWorkspaceTrialStartedAt = now + (60 - 7) days so endsAt ≈ now + 60.
 * Also bumps every TenantAddonTrial endsAt by +60 from max(endsAt, now) and sets status active.
 *
 * Usage (VPS):
 *   cd /var/www/hostnet-panel
 *   npm run ops:extend-trials-60d -w hmail-api -- --dry-run
 *   npm run ops:extend-trials-60d -w hmail-api -- --apply
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/lib/prisma.js";

const monorepoRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
config({ path: resolve(monorepoRoot, ".env") });

const PANEL_TRIAL_DAYS = 7;
const EXTRA_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

function parseArgs(argv: string[]) {
  return {
    dryRun: argv.includes("--dry-run") || !argv.includes("--apply"),
    apply: argv.includes("--apply"),
  };
}

function panelEndsAt(startedAt: Date): Date {
  return new Date(startedAt.getTime() + PANEL_TRIAL_DAYS * DAY_MS);
}

function summarizePanel(users: Array<{ panelWorkspaceTrialStartedAt: Date | null }>, now: Date) {
  let never = 0;
  let active = 0;
  let expired = 0;
  for (const u of users) {
    if (!u.panelWorkspaceTrialStartedAt) {
      never += 1;
      continue;
    }
    if (panelEndsAt(u.panelWorkspaceTrialStartedAt).getTime() > now.getTime()) active += 1;
    else expired += 1;
  }
  return { total: users.length, never, active, expired };
}

async function main() {
  const { dryRun, apply } = parseArgs(process.argv.slice(2));
  if (!apply) {
    console.log("Mode: DRY-RUN (pass --apply to write).");
  } else {
    console.log("Mode: APPLY (writing production trial clocks).");
  }

  const now = new Date();
  // startedAt + 7d = now + 60d  =>  startedAt = now + 53d
  const newStartedAt = new Date(now.getTime() + (EXTRA_DAYS - PANEL_TRIAL_DAYS) * DAY_MS);
  const expectedEndsAt = panelEndsAt(newStartedAt);

  const usersBefore = await prisma.user.findMany({
    select: { id: true, email: true, panelWorkspaceTrialStartedAt: true },
  });
  const addonBefore = await prisma.tenantAddonTrial.findMany({
    select: { id: true, endsAt: true, status: true },
  });
  const activeAddonBefore = addonBefore.filter((t) => t.status === "active" && t.endsAt > now).length;

  console.log(
    JSON.stringify(
      {
        now: now.toISOString(),
        formula: {
          panelTrialDays: PANEL_TRIAL_DAYS,
          extraDays: EXTRA_DAYS,
          newStartedAt: newStartedAt.toISOString(),
          expectedEndsAt: expectedEndsAt.toISOString(),
        },
        before: {
          panel: summarizePanel(usersBefore, now),
          tenantAddonTrials: { total: addonBefore.length, activeNow: activeAddonBefore },
        },
      },
      null,
      2,
    ),
  );

  if (dryRun && !apply) {
    console.log("Dry-run complete. Re-run with --apply to commit.");
    await prisma.$disconnect();
    return;
  }

  const userResult = await prisma.user.updateMany({
    data: {
      panelWorkspaceTrialStartedAt: newStartedAt,
      panelWorkspaceDay5EmailSent: false,
      panelWorkspaceDay7ReminderSent: false,
    },
  });

  let addonUpdated = 0;
  for (const trial of addonBefore) {
    const base = trial.endsAt.getTime() > now.getTime() ? trial.endsAt : now;
    const endsAt = new Date(base.getTime() + EXTRA_DAYS * DAY_MS);
    await prisma.tenantAddonTrial.update({
      where: { id: trial.id },
      data: { endsAt, status: "active" },
    });
    addonUpdated += 1;
  }

  const usersAfter = await prisma.user.findMany({
    select: { panelWorkspaceTrialStartedAt: true },
  });
  const addonAfter = await prisma.tenantAddonTrial.findMany({
    select: { endsAt: true, status: true },
  });
  const activeAddonAfter = addonAfter.filter((t) => t.status === "active" && t.endsAt > now).length;

  console.log(
    JSON.stringify(
      {
        applied: {
          usersUpdated: userResult.count,
          addonTrialsUpdated: addonUpdated,
        },
        after: {
          panel: summarizePanel(usersAfter, now),
          tenantAddonTrials: { total: addonAfter.length, activeNow: activeAddonAfter },
        },
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
