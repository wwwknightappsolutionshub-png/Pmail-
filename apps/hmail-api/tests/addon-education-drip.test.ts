import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import {
  activateAddonEducationAfterWelcome,
  processAddonEducationDripEmails,
  recordAddonEducationOpen,
  seedAddonEducationCampaignSteps,
  seedAddonEducationTemplates,
} from "../src/services/addon-education-drip.service.js";
import { resetTestDatabase, seedTestTenant } from "./helpers.js";

describe("addon education drip", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedTestTenant();
    await seedAddonEducationTemplates();
    await seedAddonEducationCampaignSteps();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("enrolls user after welcome and sends first panel education email", async () => {
    const user = await prisma.user.findFirstOrThrow();
    await prisma.user.update({
      where: { id: user.id },
      data: { pmailAccountWelcomeEmailSent: true },
    });

    await activateAddonEducationAfterWelcome(user.id);

    const state = await prisma.userAddonEducationState.findUniqueOrThrow({ where: { userId: user.id } });
    expect(state.panelStatus).toBe("active");
    expect(state.verticalStatus).toBe("active");

    await processAddonEducationDripEmails();

    const send = await prisma.addonEducationEmailSend.findFirst({
      where: { userId: user.id, campaignType: "panel" },
    });
    expect(send).toBeTruthy();
    expect(send?.stepKey).toBe("open-tracking");
    expect(send?.readAt).toBeNull();

    const updated = await prisma.userAddonEducationState.findUniqueOrThrow({ where: { userId: user.id } });
    expect(updated.panelStatus).toBe("paused_unread");
  });

  it("advances panel step after open is recorded", async () => {
    const user = await prisma.user.findFirstOrThrow();
    await prisma.user.update({
      where: { id: user.id },
      data: { pmailAccountWelcomeEmailSent: true },
    });
    await activateAddonEducationAfterWelcome(user.id);
    await processAddonEducationDripEmails();

    const send = await prisma.addonEducationEmailSend.findFirstOrThrow({
      where: { userId: user.id, campaignType: "panel" },
    });

    await recordAddonEducationOpen(send.trackingToken);

    const state = await prisma.userAddonEducationState.findUniqueOrThrow({ where: { userId: user.id } });
    expect(state.panelStepIndex).toBe(1);
    expect(state.panelStatus).toBe("active");
    expect(state.panelPausedStepKey).toBeNull();

    const readSend = await prisma.addonEducationEmailSend.findUniqueOrThrow({ where: { id: send.id } });
    expect(readSend.readAt).toBeTruthy();
  });

  it("skips to next panel step after max resends without read", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-01T12:00:00Z"));

    const user = await prisma.user.findFirstOrThrow();
    await prisma.user.update({
      where: { id: user.id },
      data: { pmailAccountWelcomeEmailSent: true },
    });
    await activateAddonEducationAfterWelcome(user.id);
    await processAddonEducationDripEmails();

    const step = await prisma.addonEducationCampaignStep.findFirstOrThrow({
      where: { campaignType: "panel", stepKey: "open-tracking" },
    });
    await prisma.addonEducationCampaignStep.update({
      where: { id: step.id },
      data: { maxResends: 1, resendIntervalHours: 1 },
    });

    const firstSend = await prisma.addonEducationEmailSend.findFirstOrThrow({
      where: { userId: user.id, campaignType: "panel", stepKey: "open-tracking" },
    });
    await prisma.addonEducationEmailSend.update({
      where: { id: firstSend.id },
      data: { sentAt: new Date("2026-02-01T10:00:00Z"), resendCount: 1 },
    });

    vi.setSystemTime(new Date("2026-02-01T12:30:00Z"));
    await processAddonEducationDripEmails();

    const state = await prisma.userAddonEducationState.findUniqueOrThrow({ where: { userId: user.id } });
    expect(state.panelStepIndex).toBe(1);
    expect(state.panelStatus).toBe("active");
  });
});
