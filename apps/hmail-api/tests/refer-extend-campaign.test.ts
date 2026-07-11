import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { seedEmailTemplates } from "../src/services/email-template.service.js";
import {
  enrollUserInReferExtendCampaign,
  markReferExtendCampaignStopped,
  processReferExtendCampaignEmails,
  recordReferExtendClick,
  REFER_EXTEND_INTERVAL_HOURS,
} from "../src/services/refer-extend-campaign.service.js";
import { resetTestDatabase, seedTestTenant } from "./helpers.js";

describe("refer & extend campaign", () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await seedTestTenant();
    await seedEmailTemplates();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("enrolls a user and sends the first refer-and-extend email", async () => {
    const user = await prisma.user.findFirstOrThrow();
    await enrollUserInReferExtendCampaign(user.id);

    const campaign = await prisma.userReferExtendCampaign.findUniqueOrThrow({ where: { userId: user.id } });
    expect(campaign.status).toBe("active");
    expect(campaign.sendCount).toBe(0);

    const sent = await processReferExtendCampaignEmails();
    expect(sent).toBe(1);

    const send = await prisma.referExtendEmailSend.findFirst({ where: { userId: user.id } });
    expect(send).toBeTruthy();
    expect(send?.templateSlug).toBe("pmail-refer-and-extend");
    expect(send?.status).toBe("sent");

    const updated = await prisma.userReferExtendCampaign.findUniqueOrThrow({ where: { userId: user.id } });
    expect(updated.sendCount).toBe(1);
    expect(updated.lastSentAt).toBeTruthy();
    expect(updated.nextEligibleAt).toBeTruthy();
    const hoursUntilNext =
      (updated.nextEligibleAt!.getTime() - updated.lastSentAt!.getTime()) / (60 * 60 * 1000);
    expect(hoursUntilNext).toBeCloseTo(REFER_EXTEND_INTERVAL_HOURS, 5);
  });

  it("does not resend before the 48-hour interval", async () => {
    const user = await prisma.user.findFirstOrThrow();
    await enrollUserInReferExtendCampaign(user.id);
    await processReferExtendCampaignEmails();

    const sentAgain = await processReferExtendCampaignEmails();
    expect(sentAgain).toBe(0);

    const sends = await prisma.referExtendEmailSend.count({ where: { userId: user.id } });
    expect(sends).toBe(1);
  });

  it("resends after 48 hours while campaign is active", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-11T12:00:00Z"));

    const user = await prisma.user.findFirstOrThrow();
    await enrollUserInReferExtendCampaign(user.id);
    await processReferExtendCampaignEmails();

    vi.setSystemTime(new Date("2026-07-13T12:30:00Z"));
    const sentAgain = await processReferExtendCampaignEmails();
    expect(sentAgain).toBe(1);

    const sends = await prisma.referExtendEmailSend.count({ where: { userId: user.id } });
    expect(sends).toBe(2);
  });

  it("stops the campaign when the email CTA is clicked", async () => {
    const user = await prisma.user.findFirstOrThrow();
    await enrollUserInReferExtendCampaign(user.id);
    await processReferExtendCampaignEmails();

    const click = await prisma.referExtendEmailClick.findFirstOrThrow({
      where: { send: { userId: user.id } },
    });

    const destination = await recordReferExtendClick(click.clickToken);
    expect(destination).toContain("referFriend=1");

    const campaign = await prisma.userReferExtendCampaign.findUniqueOrThrow({ where: { userId: user.id } });
    expect(campaign.status).toBe("stopped");
    expect(campaign.stopReason).toBe("email_cta_clicked");

    const sentAfterStop = await processReferExtendCampaignEmails();
    expect(sentAfterStop).toBe(0);
  });

  it("stops the campaign when Refer a friend is used", async () => {
    const user = await prisma.user.findFirstOrThrow();
    await enrollUserInReferExtendCampaign(user.id);
    await processReferExtendCampaignEmails();

    await markReferExtendCampaignStopped(user.id, "refer_friend_clicked");

    const campaign = await prisma.userReferExtendCampaign.findUniqueOrThrow({ where: { userId: user.id } });
    expect(campaign.status).toBe("stopped");
    expect(campaign.stopReason).toBe("refer_friend_clicked");

    const sentAfterStop = await processReferExtendCampaignEmails();
    expect(sentAfterStop).toBe(0);
  });
});
