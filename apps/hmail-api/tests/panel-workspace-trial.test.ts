import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PANEL_WORKSPACE_WELCOME_TRIAL_SLUGS } from "../src/data/addon-catalog.js";
import { prisma } from "../src/lib/prisma.js";
import { getActiveAddonSlugs } from "../src/services/addon.service.js";
import {
  ensurePanelWorkspaceWelcomeTrial,
  ensurePmailTesterPanelWorkspaceTrial,
  hasActivePanelWorkspaceWelcomeTrial,
  isPanelWorkspaceWelcomeTrialActive,
  panelWorkspaceTrialEndsAt,
  processPanelWorkspaceTrialEmails,
} from "../src/services/panel-workspace-trial.service.js";
import { resetTestDatabase, seedTestTenant } from "./helpers.js";

describe("panel workspace welcome trial", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedTestTenant();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts a 7-day welcome trial once per user", async () => {
    const user = await prisma.user.findFirstOrThrow();
    await ensurePanelWorkspaceWelcomeTrial(user.id);
    await ensurePanelWorkspaceWelcomeTrial(user.id);

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.panelWorkspaceTrialStartedAt).toBeTruthy();
    expect(await hasActivePanelWorkspaceWelcomeTrial(user.id)).toBe(true);
  });

  it("grants all panel workspace addon slugs during welcome trial", async () => {
    const user = await prisma.user.findFirstOrThrow();
    await ensurePanelWorkspaceWelcomeTrial(user.id);

    const slugs = await getActiveAddonSlugs(user.tenantId, user.id);
    for (const slug of PANEL_WORKSPACE_WELCOME_TRIAL_SLUGS) {
      expect(slugs).toContain(slug);
    }
    expect(slugs).not.toContain("job-hunter-functionality");
  });

  it("restarts an expired welcome trial for PMail+ tester QA", async () => {
    const user = await prisma.user.findFirstOrThrow();
    await prisma.user.update({
      where: { id: user.id },
      data: { panelWorkspaceTrialStartedAt: new Date("2020-01-01T12:00:00Z") },
    });

    await ensurePmailTesterPanelWorkspaceTrial(user.id);

    expect(await hasActivePanelWorkspaceWelcomeTrial(user.id)).toBe(true);
    const slugs = await getActiveAddonSlugs(user.tenantId, user.id);
    expect(slugs).toContain("bespoke-workspace");
    expect(slugs).toContain("email-sla-tracker-functionality");
  });

  it("expires after 7 days", () => {
    const startedAt = new Date("2026-01-01T12:00:00Z");
    const endsAt = panelWorkspaceTrialEndsAt(startedAt);
    expect(endsAt.toISOString()).toBe("2026-01-08T12:00:00.000Z");
    expect(isPanelWorkspaceWelcomeTrialActive(startedAt, new Date("2026-01-08T11:00:00Z"))).toBe(true);
    expect(isPanelWorkspaceWelcomeTrialActive(startedAt, new Date("2026-01-08T12:00:01Z"))).toBe(false);
  });

  it("sends day-5 upsell and day-7 final reminder emails", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-07T12:00:00Z"));

    const user = await prisma.user.findFirstOrThrow();
    await prisma.user.update({
      where: { id: user.id },
      data: { panelWorkspaceTrialStartedAt: new Date("2026-01-01T12:00:00Z") },
    });

    await processPanelWorkspaceTrialEmails();

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.panelWorkspaceDay5EmailSent).toBe(true);
    expect(updated.panelWorkspaceDay7ReminderSent).toBe(true);

    const logs = await prisma.addonEmailLog.findMany({
      where: { userEmail: user.email },
      orderBy: { sentAt: "asc" },
    });
    expect(logs.map((log) => log.emailType)).toEqual([
      "panel_workspace_day5_upsell",
      "panel_workspace_day7_final",
    ]);
  });
});
